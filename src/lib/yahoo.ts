import YahooFinance from 'yahoo-finance2';
import type { StockQuote, Candle, SearchResult, RangeOption } from '@/types';
import { getLatestPrices as getAlpacaPrices, isAlpacaConfigured } from './alpaca/client';

const yf = new YahooFinance();
yf._notices.suppress(['yahooSurvey']);

export async function getQuotes(symbols: string[]): Promise<StockQuote[]> {
  // Try Alpaca first for real-time prices if configured
  if (isAlpacaConfigured() && process.env.USE_ALPACA_PRICES === 'true') {
    try {
      console.log('Using Alpaca for real-time prices...');
      const alpacaPrices = await getAlpacaPrices(symbols);
      
      if (alpacaPrices.size > 0) {
        return symbols.map(symbol => {
          const price = alpacaPrices.get(symbol) || 0;
          return {
            symbol,
            shortName: symbol,
            regularMarketPrice: price,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            regularMarketVolume: 0,
            regularMarketDayHigh: price,
            regularMarketDayLow: price,
            regularMarketOpen: price,
            regularMarketPreviousClose: price,
            fiftyTwoWeekHigh: price * 1.2,
            fiftyTwoWeekLow: price * 0.8,
            marketCap: 0,
            currency: 'USD',
            marketState: 'REGULAR',
            quoteType: 'EQUITY',
            dividendYield: 0,
            exchange: '',
          };
        });
      }
    } catch (error) {
      console.warn('Alpaca prices failed, falling back to Yahoo:', error);
    }
  }

  // Fallback to Yahoo Finance
  try {
    const results = await yf.quote(symbols);
    const arr = Array.isArray(results) ? results : [results];

    return arr.map((q) => ({
      symbol: q.symbol,
      shortName: q.shortName ?? q.symbol,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      regularMarketChange: q.regularMarketChange ?? 0,
      regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
      regularMarketVolume: q.regularMarketVolume ?? 0,
      regularMarketDayHigh: q.regularMarketDayHigh ?? 0,
      regularMarketDayLow: q.regularMarketDayLow ?? 0,
      regularMarketOpen: q.regularMarketOpen ?? 0,
      regularMarketPreviousClose: q.regularMarketPreviousClose ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
      marketCap: q.marketCap ?? 0,
      currency: q.currency ?? 'USD',
      marketState: q.marketState ?? 'CLOSED',
      quoteType: q.quoteType ?? 'EQUITY',
      dividendYield: (q as Record<string, unknown>).dividendYield as number ?? 0,
      exchange: q.exchange ?? '',
      preMarketPrice: (q as Record<string, unknown>).preMarketPrice as number | undefined,
      preMarketChange: (q as Record<string, unknown>).preMarketChange as number | undefined,
      preMarketChangePercent: (q as Record<string, unknown>).preMarketChangePercent as number | undefined,
      postMarketPrice: (q as Record<string, unknown>).postMarketPrice as number | undefined,
      postMarketChange: (q as Record<string, unknown>).postMarketChange as number | undefined,
      postMarketChangePercent: (q as Record<string, unknown>).postMarketChangePercent as number | undefined,
    }));
  } catch (error) {
    console.error('getQuotes error:', error);
    return [];
  }
}

function rangeToPeriod1(range: string): Date {
  const now = new Date();
  const map: Record<string, number> = {
    '1w': 7,
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825,
  };
  const days = map[range] ?? 180;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getHistory(symbol: string, range: RangeOption | string): Promise<Candle[]> {
  try {
    const period1 = rangeToPeriod1(range);
    const period2 = new Date();

    const result = await yf.chart(symbol, { period1, period2 });

    return (result.quotes ?? []).map((q) => ({
      time: new Date(q.date).toISOString().split('T')[0],
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }));
  } catch (error) {
    console.error('getHistory error:', error);
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProfile(symbol: string): Promise<Record<string, any> | null> {
  try {
    const result = await yf.quoteSummary(symbol, {
      modules: ['assetProfile', 'financialData', 'defaultKeyStatistics', 'earningsTrend', 'incomeStatementHistory'],
    });
    return result as Record<string, unknown>;
  } catch (error) {
    console.error('getProfile error:', error);
    return null;
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  try {
    const result = await yf.search(query);

    return (result.quotes ?? [])
      .filter((q): q is typeof q & { symbol: string } => 'symbol' in q && typeof q.symbol === 'string')
      .map((q) => ({
        symbol: q.symbol,
        shortName: ('shortname' in q ? String(q.shortname) : q.symbol),
        exchange: ('exchange' in q ? String(q.exchange) : ''),
        type: ('quoteType' in q ? String(q.quoteType) : 'EQUITY'),
      }));
  } catch (error) {
    console.error('searchStocks error:', error);
    return [];
  }
}
