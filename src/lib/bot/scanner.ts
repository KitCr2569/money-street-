import { getHistory, getQuotes } from '@/lib/yahoo';
import { analyzeStock, generateSignal, type BotSignal } from './bot-engine';
import { db } from '@/db';
import { botSignals, botSettings } from '@/db/schema';
import { STOCK_CATEGORIES } from '@/lib/stock-categories';

// =====================================================
// Stock Scanner — Automatic Signal Discovery
// =====================================================

export interface ScanResult {
  signals: BotSignal[];
  scannedCount: number;
  buySignals: number;
  sellSignals: number;
  errors: string[];
  scanDuration: number;
  timestamp: string;
}

/** Default symbols to scan if none configured */
const DEFAULT_SYMBOLS = [
  // Magnificent 7
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  // AI Chips
  'AMD', 'AVGO', 'TSM', 'ARM', 'MRVL',
  // Popular ETFs
  'SPY', 'QQQ',
  // AI Software
  'PLTR', 'CRM', 'NOW',
  // Crypto
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD',
  'ADA-USD', 'AVAX-USD', 'DOGE-USD', 'DOT-USD', 'LINK-USD',
  // Thai Stocks (SET)
  'PTT.BK', 'ADVANC.BK', 'CPALL.BK', 'SCC.BK', 'GULF.BK',
  'AOT.BK', 'BDMS.BK', 'KBANK.BK', 'SCB.BK', 'DELTA.BK',
];

/** Get configured symbols to scan */
export async function getScanSymbols(): Promise<string[]> {
  try {
    const settings = await db.query.botSettings.findFirst({
      where: (s: any, { eq }: any) => eq(s.id, 1),
    });
    if (settings?.scanSymbols) {
      const parsed = JSON.parse(settings.scanSymbols) as string[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* use default */ }
  return DEFAULT_SYMBOLS;
}

/** Get symbols from a specific category */
export function getSymbolsFromCategory(categoryId: string): string[] {
  const cat = STOCK_CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.stocks.map(s => s.symbol) : [];
}

/** Get all available category IDs */
export function getAvailableCategories(): { id: string; name: string; count: number }[] {
  return STOCK_CATEGORIES.map(c => ({
    id: c.id,
    name: c.name,
    count: c.stocks.length,
  }));
}

/**
 * Scan all configured symbols and generate signals
 * This is the main entry point for the bot's scanning loop
 */
export async function scanStocks(
  symbols?: string[],
  options: { minScore?: number; saveSignals?: boolean } = {},
): Promise<ScanResult> {
  const startTime = Date.now();
  const { minScore = 0, saveSignals = true } = options;
  const symbolList = symbols ?? await getScanSymbols();
  const signals: BotSignal[] = [];
  const errors: string[] = [];

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbolList.length; i += batchSize) {
    const batch = symbolList.slice(i, i + batchSize);

    const batchPromises = batch.map(async (symbol) => {
      try {
        // Add timeout for each symbol analysis
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Symbol analysis timeout')), 8000)
        );

        const analysisPromise = (async () => {
          // Get 6 months of history for analysis
          const candles = await getHistory(symbol, '6mo');
          if (candles.length < 50) {
            throw new Error(`Not enough data (${candles.length} candles)`);
          }

          const analysis = analyzeStock(candles);
          if (!analysis) {
            throw new Error('Analysis failed');
          }

          return generateSignal(symbol, analysis);
        })();

        return await Promise.race([analysisPromise, timeoutPromise]) as BotSignal | null;
      } catch (err) {
        errors.push(`${symbol}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);
    for (const r of results) {
      if (r) signals.push(r);
    }

    // Small delay between batches to be kind to Yahoo Finance
    if (i + batchSize < symbolList.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Sort by score (highest first)
  signals.sort((a, b) => b.totalScore - a.totalScore);

  // Filter by minimum score
  const filteredSignals = minScore > 0
    ? signals.filter(s => Math.abs(s.totalScore) >= minScore)
    : signals;

  // Save signals to database
  if (saveSignals) {
    for (const signal of filteredSignals) {
      try {
        // Add timeout for database operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout')), 3000)
        );

        await Promise.race([
          db.insert(botSignals).values({
            symbol: signal.symbol,
            signalType: signal.signal,
            totalScore: signal.totalScore,
            normalizedScore: signal.normalizedScore,
            strategy: signal.strategy,
            confidence: signal.confidence,
            price: signal.price,
            stopLoss: signal.stopLoss,
            takeProfit1: signal.takeProfit1,
            factors: JSON.stringify(signal.factors),
            executed: false,
          }),
          timeoutPromise
        ]);
      } catch (err) {
        console.error(`Failed to save signal for ${signal.symbol}:`, err);
        errors.push(`DB: ${signal.symbol}: ${err instanceof Error ? err.message : 'Save failed'}`);
      }
    }

    // Update last scan time
    try {
      const existing = await db.query.botSettings.findFirst({
        where: (s: any, { eq }: any) => eq(s.id, 1),
      });
      if (existing) {
        await db.update(botSettings)
          .set({ lastScanAt: new Date().toISOString() })
          .where((await import('drizzle-orm')).eq(botSettings.id, 1));
      }
    } catch { /* ignore */ }
  }

  const buySignals = filteredSignals.filter(s =>
    s.signal === 'strong_buy' || s.signal === 'buy'
  ).length;
  const sellSignals = filteredSignals.filter(s =>
    s.signal === 'strong_sell' || s.signal === 'sell'
  ).length;

  return {
    signals: filteredSignals,
    scannedCount: symbolList.length,
    buySignals,
    sellSignals,
    errors,
    scanDuration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick scan — returns buy/sell signals (score ≥ 1.5 or ≤ -1.5)
 */
export async function quickScan(symbols?: string[]): Promise<ScanResult> {
  return scanStocks(symbols, { minScore: 1.5 });
}

/**
 * Get current prices for a list of symbols
 */
export async function getCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  try {
    const quotes = await getQuotes(symbols);
    for (const q of quotes) {
      if (q.regularMarketPrice > 0) {
        prices.set(q.symbol, q.regularMarketPrice);
      }
    }
  } catch (err) {
    console.error('Failed to get current prices:', err);
  }
  return prices;
}
