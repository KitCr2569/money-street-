import type { Candle, IndicatorPoint, Indicators, Trendlines, TrendlinePair, TrendlinePoint } from '@/types';

/**
 * RSI (Relative Strength Index)
 */
export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length < period + 1) return [];

  const closes = candles.map((c) => c.close);
  const result: IndicatorPoint[] = [];

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  result.push({ time: candles[period].time, value: Math.round(rsi * 100) / 100 });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const curRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const curRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + curRs);
    result.push({ time: candles[i + 1].time, value: Math.round(curRsi * 100) / 100 });
  }

  return result;
}

/**
 * EMA (Exponential Moving Average)
 */
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];

  const closes = candles.map((c) => c.close);
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += closes[i];
  }
  ema /= period;
  result.push({ time: candles[period - 1].time, value: Math.round(ema * 100) / 100 });

  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
    result.push({ time: candles[i].time, value: Math.round(ema * 100) / 100 });
  }

  return result;
}

/**
 * Trendlines — upper (resistance) and lower (support)
 *
 * Algorithm:
 * 1. Find pivot highs and pivot lows (window=5)
 * 2. Linear regression on pivot highs → upper trendline
 * 3. Linear regression on pivot lows → lower trendline
 * 4. Generate line points for chart rendering
 */
function findPivots(candles: Candle[], pivotWindow = 5) {
  const pivotHighs: { idx: number; price: number }[] = [];
  const pivotLows: { idx: number; price: number }[] = [];

  for (let i = pivotWindow; i < candles.length - pivotWindow; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - pivotWindow; j <= i + pivotWindow; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }
    if (isHigh) pivotHighs.push({ idx: i, price: candles[i].high });
    if (isLow) pivotLows.push({ idx: i, price: candles[i].low });
  }

  return { pivotHighs, pivotLows };
}

function calcPair(candles: Candle[], startFrom: number, pivotWindow = 5): TrendlinePair {
  const slice = candles.slice(startFrom);
  if (slice.length < 15) return { upper: [], lower: [] };

  const { pivotHighs, pivotLows } = findPivots(slice, pivotWindow);
  // Remap indices back to full candle array
  const remapped = (pivots: { idx: number; price: number }[]) =>
    pivots.map((p) => ({ idx: p.idx + startFrom, price: p.price }));

  return {
    upper: fitTrendline(remapped(pivotHighs), candles),
    lower: fitTrendline(remapped(pivotLows), candles),
  };
}

export function calculateTrendlines(candles: Candle[]): Trendlines {
  const empty: TrendlinePair = { upper: [], lower: [] };
  if (candles.length < 15) return { short: empty, long: empty };

  // Long-term: ใช้ data ทั้งหมด
  const long = calcPair(candles, 0);

  // Short-term: ใช้ ~30% ล่าสุด (ขั้นต่ำ 15 แท่ง)
  const shortStart = Math.max(0, Math.floor(candles.length * 0.7));
  const short = calcPair(candles, shortStart, 3);

  return { short, long };
}

function fitTrendline(
  pivots: { idx: number; price: number }[],
  candles: Candle[],
): TrendlinePoint[] {
  if (pivots.length < 2) return [];

  // Linear regression: y = slope * x + intercept
  const n = pivots.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of pivots) {
    sumX += p.idx;
    sumY += p.price;
    sumXY += p.idx * p.price;
    sumX2 += p.idx * p.idx;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return [];

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Generate points from first pivot to last candle
  const startIdx = pivots[0].idx;
  const endIdx = candles.length - 1;
  const result: TrendlinePoint[] = [];

  // Sample ~20 points for a smooth line
  const step = Math.max(1, Math.floor((endIdx - startIdx) / 20));
  for (let i = startIdx; i <= endIdx; i += step) {
    result.push({
      time: candles[i].time,
      value: Math.round((slope * i + intercept) * 100) / 100,
    });
  }
  // Always include the last candle
  if (result.length === 0 || result[result.length - 1].time !== candles[endIdx].time) {
    result.push({
      time: candles[endIdx].time,
      value: Math.round((slope * endIdx + intercept) * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate all indicators at once
 */
export function calculateIndicators(candles: Candle[]): Indicators {
  return {
    rsi14: calculateRSI(candles, 14),
    ema20: calculateEMA(candles, 20),
    ema50: calculateEMA(candles, 50),
    ema100: calculateEMA(candles, 100),
    ema200: calculateEMA(candles, 200),
    trendlines: calculateTrendlines(candles),
  };
}
