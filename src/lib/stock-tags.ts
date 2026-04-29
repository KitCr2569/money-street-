import type { StockQuote } from '@/types';

// ── S&P 500 / NASDAQ 100 known symbols ──

const SP500 = new Set([
  'AAPL','MSFT','AMZN','NVDA','GOOGL','GOOG','META','BRK-B','TSLA','UNH',
  'XOM','JNJ','JPM','V','PG','MA','AVGO','HD','CVX','MRK','ABBV','LLY',
  'PEP','KO','COST','ADBE','WMT','MCD','CSCO','CRM','TMO','ACN','ABT',
  'DHR','CMCSA','NKE','NEE','PM','TXN','UPS','RTX','HON','INTC','QCOM',
  'ORCL','IBM','GE','CAT','BA','AMGN','SPGI','LOW','MDLZ','GS','BLK',
  'DE','SYK','ISRG','AMAT','ADP','GILD','MMC','VRTX','REGN','LRCX',
  'ADI','BKNG','PANW','SBUX','PLD','CB','SO','DUK','CI','MO','SCHW',
  'ZTS','AON','CME','ICE','CL','MCK','SLB','EOG','PXD','WM','EMR',
  'NSC','GM','F','APD','FDX','AIG','PSA','SRE','TGT','AZO','ORLY',
  'SNPS','CDNS','KLAC','MCHP','NXPI','FTNT','DXCM','MNST','IDXX','MRNA',
  'PYPL','NOW','ABNB','UBER','DASH','COIN','PLTR','ARM','CRWD','SNOW',
  'NET','DDOG','ZS','MDB','TEAM','WDAY','VEEV','ANSS','CPRT','CTAS',
  'ODFL','FAST','PAYX','PCAR','ROST','DLTR','DG','WBA','KR','SYY',
  'AEP','D','EXC','XEL','WEC','ES','ED','AWK','DTE','PPL',
  'TSM','ASML','TM','NVO','SAP','SHOP','SE','MELI','NU','BABA',
  'PDD','JD','NIO','LI','XPEV','GRAB','NFLX','AMD',
]);

const NAS100 = new Set([
  'AAPL','MSFT','AMZN','NVDA','GOOGL','GOOG','META','TSLA','AVGO','ADBE',
  'COST','CSCO','PEP','CMCSA','NFLX','AMD','INTC','QCOM','TXN','AMGN',
  'ISRG','AMAT','BKNG','ADI','LRCX','GILD','VRTX','REGN','PANW','SBUX',
  'MDLZ','KLAC','MCHP','NXPI','FTNT','DXCM','MNST','IDXX','MRNA','SNPS',
  'CDNS','PYPL','ABNB','CRWD','MELI','ADP','MAR','ORLY','CSX','PCAR',
  'CTAS','ODFL','FAST','ROST','DLTR','PAYX','CPRT','WDAY','ZS','DDOG',
  'TEAM','ANSS','ON','GFS','MRVL','SMCI','ARM','MDB','NET','DASH',
  'NOW','CRM','UBER','COIN','PLTR','SNOW','TTD','ZM','OKTA','VEEV',
  'LCID','RIVN','WBD','EA','TTWO','ATVI','BIIB','ILMN','SIRI','AZN',
  'PDD','JD','LI','NIO','XPEV','BIDU','GRAB','SE','SHOP','NU',
]);

const MAG7 = new Set(['AAPL','MSFT','AMZN','NVDA','GOOGL','GOOG','META','TSLA']);

const KNOWN_ETFS = new Set([
  'SPY','VOO','VTI','QQQ','IVV','VEA','VWO','BND','AGG','ARKK','ARKW','ARKF',
  'ARKG','SCHD','VYM','VIG','DGRO','HDV','VNQ','VNQI','TLT','SHY','IEF',
  'GLD','SLV','USO','DIA','IWM','EEM','EFA','XLK','XLF','XLE','XLV','XLI',
  'XLY','XLP','XLU','XLRE','XLB','XLC',
]);

const THAI_EXCHANGE = new Set(['SET', 'BKK', 'mai']);

export interface StockTag {
  label: string;
  color: string;
  bg: string;
}

export function getStockTags(symbol: string, quote?: Pick<StockQuote, 'quoteType' | 'dividendYield' | 'exchange' | 'currency'>): StockTag[] {
  const tags: StockTag[] = [];
  const sym = symbol.toUpperCase();

  // Magnificent 7
  if (MAG7.has(sym)) {
    tags.push({ label: 'Mag 7', color: 'text-amber-400', bg: 'bg-amber-400/15' });
  }

  // Index membership
  if (SP500.has(sym)) {
    tags.push({ label: 'S&P 500', color: 'text-blue', bg: 'bg-blue/15' });
  }
  if (NAS100.has(sym)) {
    tags.push({ label: 'NAS 100', color: 'text-purple', bg: 'bg-purple/15' });
  }

  if (quote) {
    // ETF
    if (quote.quoteType === 'ETF') {
      tags.push({ label: 'ETF', color: 'text-yellow', bg: 'bg-yellow/15' });
    }

    // Dividend
    if (quote.dividendYield > 0) {
      tags.push({ label: `ปันผล ${quote.dividendYield.toFixed(1)}%`, color: 'text-green', bg: 'bg-green/15' });
    }

    // Thai stock
    if (THAI_EXCHANGE.has(quote.exchange) || quote.currency === 'THB') {
      tags.push({ label: 'ไทย', color: 'text-orange', bg: 'bg-orange/15' });
    }
  }

  // Known ETF symbols fallback
  if (KNOWN_ETFS.has(sym) && !tags.some(t => t.label === 'ETF')) {
    tags.push({ label: 'ETF', color: 'text-yellow', bg: 'bg-yellow/15' });
  }

  return tags;
}
