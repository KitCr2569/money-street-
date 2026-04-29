// ===== Stock Quote =====
export interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  currency: string;
  marketState: string;
  quoteType: string;
  dividendYield: number;
  exchange: string;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
}

// ===== OHLCV Candle =====
export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ===== Support/Resistance Level =====
export interface SRLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // number of touches
}

// ===== Indicator Data Point =====
export interface IndicatorPoint {
  time: string;
  value: number;
}

// ===== Trendline =====
export interface TrendlinePoint {
  time: string;
  value: number;
}

export interface TrendlinePair {
  upper: TrendlinePoint[];
  lower: TrendlinePoint[];
}

export interface Trendlines {
  short: TrendlinePair;  // ระยะสั้น (~30% ล่าสุด)
  long: TrendlinePair;   // ระยะยาว (ทั้งหมด)
}

// ===== Indicators Response =====
export interface Indicators {
  rsi14: IndicatorPoint[];
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  ema100: IndicatorPoint[];
  ema200: IndicatorPoint[];
  trendlines: Trendlines;
}

// ===== History API Response =====
export interface HistoryResponse {
  symbol: string;
  candles: Candle[];
  levels: SRLevel[];
  indicators: Indicators;
}

// ===== Search Result =====
export interface SearchResult {
  symbol: string;
  shortName: string;
  exchange: string;
  type: string;
}

// ===== Portfolio Holding =====
export interface HoldingLot {
  id: string;
  shares: number;
  price: number;
  date: string; // YYYY-MM-DD
}

export interface Holding {
  symbol: string;
  lots: HoldingLot[];
}

// ===== What-if Result =====
export interface WhatIfResult {
  currentAvgCost: number;
  currentShares: number;
  currentInvestment: number;
  newAvgCost: number;
  newShares: number;
  newInvestment: number;
}

// ===== Watchlist Item =====
export interface WatchlistItem {
  symbol: string;
  addedAt: string; // ISO date
}

export interface WatchlistList {
  id: string;
  name: string;
  items: WatchlistItem[];
  pinnedSymbols?: string[];
  createdAt: string;
}

// ===== News Article =====
export type NewsSentiment = 'positive' | 'negative' | 'neutral';
export type NewsProvider = 'yahoo' | 'finnhub' | 'moneystreet';

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  relatedSymbols: string[];
  imageUrl?: string;
  sentiment?: NewsSentiment;
  provider: NewsProvider;
  content?: string;
}

// ===== Calendar Events =====
export type CalendarEventType = 'earnings' | 'ipo' | 'dividend';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  symbol: string;
  name?: string;
  // Earnings fields
  epsEstimate?: number | null;
  epsActual?: number | null;
  revenueEstimate?: number | null;
  revenueActual?: number | null;
  hour?: string; // bmo = before market open, amc = after market close
  // IPO fields
  exchange?: string;
  priceRange?: string;
  shares?: number | null;
  // Dividend fields
  amount?: number | null;
  payDate?: string | null;
  recordDate?: string | null;
  declarationDate?: string | null;
  currency?: string;
}

// ===== Price Alert =====
export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  source: 'support' | 'resistance' | 'custom';
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  dismissed: boolean;
}

// ===== Range Options =====
export type RangeOption = '1w' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
