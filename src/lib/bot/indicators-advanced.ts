import type { Candle, IndicatorPoint } from '@/types';

// =====================================================
// Advanced Technical Indicators for Trading Bot
// =====================================================

export interface MACDPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
  width: number;
}

export interface StochRSIPoint {
  time: string;
  k: number;
  d: number;
}

// --- Helper Functions ---

function emaArray(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const mult = 2 / (period + 1);
  const result: number[] = [];
  let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * mult + ema;
    result.push(ema);
  }
  return result;
}

function smaArray(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
    result.push(sum / period);
  }
  return result;
}

function round(val: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}

// =====================================================
// MACD — Moving Average Convergence Divergence
// =====================================================
export function calculateMACD(
  candles: Candle[], fastP = 12, slowP = 26, sigP = 9
): MACDPoint[] {
  if (candles.length < slowP + sigP) return [];
  const closes = candles.map(c => c.close);
  const fastEMA = emaArray(closes, fastP);
  const slowEMA = emaArray(closes, slowP);

  const macdLine: number[] = [];
  const startIdx = slowP - 1;
  for (let i = startIdx; i < closes.length; i++) {
    const fi = i - (slowP - fastP);
    if (fi >= 0 && fi < fastEMA.length && i - startIdx < slowEMA.length) {
      macdLine.push(fastEMA[fi] - slowEMA[i - startIdx]);
    }
  }
  if (macdLine.length < sigP) return [];
  const signalLine = emaArray(macdLine, sigP);
  const result: MACDPoint[] = [];
  const offset = slowP - 1 + sigP - 1;
  for (let i = 0; i < signalLine.length; i++) {
    const mi = i + sigP - 1;
    if (mi < macdLine.length) {
      result.push({
        time: candles[offset + i].time,
        macd: round(macdLine[mi]),
        signal: round(signalLine[i]),
        histogram: round(macdLine[mi] - signalLine[i]),
      });
    }
  }
  return result;
}

// =====================================================
// Bollinger Bands
// =====================================================
export function calculateBollingerBands(
  candles: Candle[], period = 20, stdMult = 2
): BollingerPoint[] {
  if (candles.length < period) return [];
  const closes = candles.map(c => c.close);
  const result: BollingerPoint[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((s, v) => s + v, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - sma) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const upper = sma + stdMult * std;
    const lower = sma - stdMult * std;
    result.push({
      time: candles[i].time,
      upper: round(upper), middle: round(sma),
      lower: round(lower), width: round(sma > 0 ? ((upper - lower) / sma) * 100 : 0),
    });
  }
  return result;
}

// =====================================================
// ATR — Average True Range (for stop-loss calculation)
// =====================================================
export function calculateATR(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  const result: IndicatorPoint[] = [];
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push({ time: candles[period].time, value: round(atr) });
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push({ time: candles[i + 1].time, value: round(atr) });
  }
  return result;
}

// =====================================================
// ADX — Average Directional Index (trend strength)
// =====================================================
export function calculateADX(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length < period * 2 + 1) return [];
  const plusDMs: number[] = [], minusDMs: number[] = [], trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  let sPDM = plusDMs.slice(0, period).reduce((s, v) => s + v, 0);
  let sMDM = minusDMs.slice(0, period).reduce((s, v) => s + v, 0);
  let sTR = trs.slice(0, period).reduce((s, v) => s + v, 0);
  const dxVals: number[] = [];
  for (let i = period; i < plusDMs.length; i++) {
    if (i > period) {
      sPDM = sPDM - sPDM / period + plusDMs[i];
      sMDM = sMDM - sMDM / period + minusDMs[i];
      sTR = sTR - sTR / period + trs[i];
    }
    const pDI = sTR > 0 ? (sPDM / sTR) * 100 : 0;
    const mDI = sTR > 0 ? (sMDM / sTR) * 100 : 0;
    const sum = pDI + mDI;
    dxVals.push(sum > 0 ? (Math.abs(pDI - mDI) / sum) * 100 : 0);
  }
  if (dxVals.length < period) return [];
  const result: IndicatorPoint[] = [];
  let adx = dxVals.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const start = period * 2;
  result.push({ time: candles[start].time, value: round(adx) });
  for (let i = period; i < dxVals.length; i++) {
    adx = (adx * (period - 1) + dxVals[i]) / period;
    result.push({ time: candles[start + i - period + 1].time, value: round(adx) });
  }
  return result;
}

// =====================================================
// Volume SMA + Volume Ratio
// =====================================================
export function calculateVolumeSMA(candles: Candle[], period = 20): IndicatorPoint[] {
  if (candles.length < period) return [];
  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].volume;
    result.push({ time: candles[i].time, value: round(sum / period) });
  }
  return result;
}

export function getVolumeRatio(candles: Candle[], period = 20): number {
  if (candles.length < period + 1) return 1;
  const avg = candles.slice(-period - 1, -1).reduce((s, c) => s + c.volume, 0) / period;
  return avg > 0 ? candles[candles.length - 1].volume / avg : 1;
}

// =====================================================
// Stochastic RSI
// =====================================================
export function calculateStochRSI(
  candles: Candle[], rsiP = 14, stochP = 14, kS = 3, dS = 3
): StochRSIPoint[] {
  if (candles.length < rsiP + stochP + kS + dS) return [];
  const closes = candles.map(c => c.close);
  const rsiVals: number[] = [];
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);
  let aG = 0, aL = 0;
  for (let i = 0; i < rsiP; i++) {
    if (changes[i] > 0) aG += changes[i]; else aL += Math.abs(changes[i]);
  }
  aG /= rsiP; aL /= rsiP;
  rsiVals.push(aL === 0 ? 100 : 100 - 100 / (1 + aG / aL));
  for (let i = rsiP; i < changes.length; i++) {
    const g = changes[i] > 0 ? changes[i] : 0;
    const l = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    aG = (aG * (rsiP - 1) + g) / rsiP;
    aL = (aL * (rsiP - 1) + l) / rsiP;
    rsiVals.push(aL === 0 ? 100 : 100 - 100 / (1 + aG / aL));
  }
  const rawK: number[] = [];
  for (let i = stochP - 1; i < rsiVals.length; i++) {
    const sl = rsiVals.slice(i - stochP + 1, i + 1);
    const mn = Math.min(...sl), mx = Math.max(...sl);
    rawK.push(mx === mn ? 50 : ((rsiVals[i] - mn) / (mx - mn)) * 100);
  }
  const sK = smaArray(rawK, kS);
  const dLine = smaArray(sK, dS);
  const result: StochRSIPoint[] = [];
  const off = rsiP + stochP - 1 + kS - 1 + dS - 1;
  for (let i = 0; i < dLine.length; i++) {
    const ki = i + dS - 1;
    if (ki < sK.length && off + i < candles.length) {
      result.push({ time: candles[off + i].time, k: round(sK[ki]), d: round(dLine[i]) });
    }
  }
  return result;
}
