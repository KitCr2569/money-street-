import type { Candle, IndicatorPoint, SRLevel } from '@/types';
import { calculateRSI, calculateEMA } from '@/lib/indicators';
import { calculateSupportResistance } from '@/lib/support-resistance';
import {
  calculateMACD, calculateBollingerBands, calculateATR,
  calculateADX, getVolumeRatio, type MACDPoint, type BollingerPoint,
} from './indicators-advanced';

// =====================================================
// Bot Engine v2 — Improved Multi-Factor Scoring System
// =====================================================

export type SignalType = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
export type StrategyType = 'mean_reversion' | 'trend_following' | 'breakout';

export interface FactorScore {
  name: string;
  score: number;    // -2 to +2
  weight: number;   // 0 to 1
  reason: string;
}

export interface BotSignal {
  symbol: string;
  totalScore: number;       // -10 to +10
  normalizedScore: number;  // 0 to 100
  signal: SignalType;
  strategy: StrategyType;
  factors: FactorScore[];
  price: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  confidence: number;       // 0 to 100
  timestamp: string;
}

export interface AnalysisData {
  candles: Candle[];
  rsi: IndicatorPoint[];
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  ema200: IndicatorPoint[];
  macd: MACDPoint[];
  bollinger: BollingerPoint[];
  atr: IndicatorPoint[];
  adx: IndicatorPoint[];
  levels: SRLevel[];
  volumeRatio: number;
}

/** Gather all indicator data for a stock */
export function analyzeStock(candles: Candle[]): AnalysisData | null {
  if (candles.length < 50) return null;

  return {
    candles,
    rsi: calculateRSI(candles, 14),
    ema20: calculateEMA(candles, 20),
    ema50: calculateEMA(candles, 50),
    ema200: calculateEMA(candles, 200),
    macd: calculateMACD(candles),
    bollinger: calculateBollingerBands(candles),
    atr: calculateATR(candles),
    adx: calculateADX(candles),
    levels: calculateSupportResistance(candles),
    volumeRatio: getVolumeRatio(candles),
  };
}

/** Get latest value from indicator array */
function latest(arr: { value: number }[]): number | null {
  return arr.length > 0 ? arr[arr.length - 1].value : null;
}

/** Get previous value from indicator array */
function prev(arr: { value: number }[], offset = 1): number | null {
  return arr.length > offset ? arr[arr.length - 1 - offset].value : null;
}

/** Main scoring function — returns BotSignal */
export function generateSignal(symbol: string, data: AnalysisData): BotSignal {
  const price = data.candles[data.candles.length - 1].close;
  const factors: FactorScore[] = [];

  // --- Factor 1: RSI (weight 15%) ---
  // v2: ผ่อนคลาย threshold + เพิ่ม RSI reversal detection
  const rsi = latest(data.rsi);
  const rsiPrev = prev(data.rsi);
  let rsiScore = 0;
  let rsiReason = 'RSI neutral';
  if (rsi !== null) {
    if (rsi < 30) {
      rsiScore = 2; rsiReason = `RSI ${rsi.toFixed(1)} — Oversold มาก`;
    } else if (rsi < 40) {
      rsiScore = 1; rsiReason = `RSI ${rsi.toFixed(1)} — Oversold`;
    } else if (rsi > 75) {
      rsiScore = -2; rsiReason = `RSI ${rsi.toFixed(1)} — Overbought มาก`;
    } else if (rsi > 65) {
      rsiScore = -1; rsiReason = `RSI ${rsi.toFixed(1)} — Overbought`;
    } else if (rsi >= 45 && rsi <= 55) {
      rsiScore = 0; rsiReason = `RSI ${rsi.toFixed(1)} — Neutral zone`;
    } else if (rsi > 55 && rsi <= 65) {
      // Bullish momentum zone
      rsiScore = 0.5; rsiReason = `RSI ${rsi.toFixed(1)} — Bullish momentum`;
    } else if (rsi >= 40 && rsi < 45) {
      rsiScore = 0.5; rsiReason = `RSI ${rsi.toFixed(1)} — Recovering`;
    }

    // RSI reversal bonus: turning up from low
    if (rsiPrev !== null && rsi > rsiPrev && rsi < 50 && rsiPrev < 40) {
      rsiScore = Math.min(rsiScore + 1, 2);
      rsiReason += ' 🔄 RSI reversing up';
    }
  }
  factors.push({ name: 'RSI', score: rsiScore, weight: 0.15, reason: rsiReason });

  // --- Factor 2: EMA Trend (weight 15%) ---
  // v2: ให้น้ำหนัก bullish alignment มากขึ้น, penalty น้อยลง
  const e20 = latest(data.ema20);
  const e50 = latest(data.ema50);
  const e200 = latest(data.ema200);
  const e20prev = prev(data.ema20);
  let emaScore = 0;
  let emaReason = 'EMA neutral';
  if (e20 !== null && e50 !== null) {
    const dist20 = ((price - e20) / e20) * 100;
    const ema20rising = e20prev !== null && e20 > e20prev;

    if (price > e20 && e20 > e50) {
      emaScore = 2; emaReason = 'Golden alignment: Price > EMA20 > EMA50';
    } else if (price > e20 && price > e50) {
      emaScore = 1.5; emaReason = 'Price above both EMAs — bullish';
    } else if (price > e20 && ema20rising) {
      emaScore = 1; emaReason = 'Price above rising EMA20';
    } else if (price > e50 && price < e20) {
      // Pullback to EMA20 in uptrend — buying opportunity
      emaScore = 1; emaReason = 'Pullback to EMA20 in uptrend — buy dip';
    } else if (dist20 > 20) {
      emaScore = -1.5; emaReason = `Overextended +${dist20.toFixed(1)}% เหนือ EMA20`;
    } else if (dist20 > 12) {
      emaScore = -1; emaReason = `ห่าง EMA20 +${dist20.toFixed(1)}%`;
    } else if (price < e20 && price < e50) {
      emaScore = -1; emaReason = 'Price below EMAs — bearish';
    } else if (price < e20 && e20 < e50) {
      emaScore = -2; emaReason = 'Death alignment: Price < EMA20 < EMA50';
    }
  }
  factors.push({ name: 'EMA Trend', score: emaScore, weight: 0.15, reason: emaReason });

  // --- Factor 3: MACD (weight 12%) ---
  // v2: เพิ่ม divergence + histogram acceleration
  let macdScore = 0;
  let macdReason = 'MACD neutral';
  if (data.macd.length >= 3) {
    const curr = data.macd[data.macd.length - 1];
    const prev1 = data.macd[data.macd.length - 2];
    const prev2 = data.macd[data.macd.length - 3];

    if (curr.histogram > 0 && prev1.histogram <= 0) {
      macdScore = 2; macdReason = 'MACD bullish crossover 🔥';
    } else if (curr.histogram < 0 && prev1.histogram >= 0) {
      macdScore = -2; macdReason = 'MACD bearish crossover';
    } else if (curr.histogram > 0 && curr.histogram > prev1.histogram) {
      macdScore = 1; macdReason = 'MACD momentum increasing ↑';
    } else if (curr.histogram > 0 && curr.histogram < prev1.histogram) {
      macdScore = 0.5; macdReason = 'MACD positive but slowing';
    } else if (curr.histogram < 0 && curr.histogram > prev1.histogram) {
      // Histogram recovering from negative — potential reversal
      macdScore = 0.5; macdReason = 'MACD recovering from below ↑';
    } else if (curr.histogram < 0 && curr.histogram < prev1.histogram) {
      macdScore = -1; macdReason = 'MACD momentum decreasing ↓';
    }

    // Histogram acceleration bonus
    if (curr.histogram > 0 && prev1.histogram > 0 && prev2.histogram <= 0) {
      macdScore = Math.min(macdScore + 0.5, 2);
      macdReason += ' + just crossed';
    }
  }
  factors.push({ name: 'MACD', score: macdScore, weight: 0.12, reason: macdReason });

  // --- Factor 4: Bollinger Bands (weight 12%) ---
  // v2: เพิ่ม BB squeeze + walking the band
  let bbScore = 0;
  let bbReason = 'BB neutral';
  if (data.bollinger.length >= 2) {
    const bb = data.bollinger[data.bollinger.length - 1];
    const bbPrev = data.bollinger[data.bollinger.length - 2];
    const bbPos = (price - bb.lower) / (bb.upper - bb.lower);
    const bandwidth = (bb.upper - bb.lower) / bb.middle;
    const prevBandwidth = (bbPrev.upper - bbPrev.lower) / bbPrev.middle;

    if (bbPos < 0.05) {
      bbScore = 2; bbReason = `Below lower BB — oversold (pos: ${(bbPos * 100).toFixed(0)}%)`;
    } else if (bbPos < 0.2) {
      bbScore = 1; bbReason = `Near lower BB (pos: ${(bbPos * 100).toFixed(0)}%)`;
    } else if (bbPos > 0.95) {
      bbScore = -1.5; bbReason = `Above upper BB — overbought (pos: ${(bbPos * 100).toFixed(0)}%)`;
    } else if (bbPos > 0.8) {
      bbScore = -0.5; bbReason = `Near upper BB (pos: ${(bbPos * 100).toFixed(0)}%)`;
    } else if (bbPos >= 0.4 && bbPos <= 0.6) {
      bbScore = 0; bbReason = `BB middle zone (pos: ${(bbPos * 100).toFixed(0)}%)`;
    }

    // BB Squeeze — bands tightening = breakout coming
    if (bandwidth < prevBandwidth * 0.85 && bandwidth < 0.04) {
      bbScore += 0.5;
      bbReason += ' | 🔥 BB Squeeze — breakout imminent';
    }
  }
  factors.push({ name: 'Bollinger Bands', score: Math.max(-2, Math.min(2, bbScore)), weight: 0.12, reason: bbReason });

  // --- Factor 5: Support/Resistance (weight 12%) ---
  // v2: ดูทั้ง S/R proximity + breakout
  let srScore = 0;
  let srReason = 'S/R neutral';
  const supports = data.levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);
  const resistances = data.levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);
  const nearSupport = supports[0];
  const nearResist = resistances[0];

  if (nearSupport) {
    const dist = (price - nearSupport.price) / price;
    if (dist >= 0 && dist < 0.02) {
      srScore = 2; srReason = `ใกล้แนวรับ $${nearSupport.price.toFixed(2)} (${(dist * 100).toFixed(1)}%)`;
    } else if (dist >= 0 && dist < 0.05) {
      srScore = 1; srReason = `เหนือแนวรับ $${nearSupport.price.toFixed(2)} (${(dist * 100).toFixed(1)}%)`;
    } else if (dist < 0 && dist > -0.03) {
      srScore = -0.5; srReason = `หลุดแนวรับเล็กน้อย $${nearSupport.price.toFixed(2)}`;
    } else if (dist < -0.03) {
      srScore = -1; srReason = `หลุดแนวรับ $${nearSupport.price.toFixed(2)}`;
    }
  }

  if (nearResist) {
    const dist = (nearResist.price - price) / price;
    if (dist < 0) {
      // Price broke above resistance — bullish breakout!
      srScore = Math.max(srScore, 1.5);
      srReason += ` | 🔥 Breakout เหนือแนวต้าน $${nearResist.price.toFixed(2)}`;
    } else if (dist < 0.02) {
      srScore = Math.min(srScore, srScore - 1);
      srReason += ` | ชนแนวต้าน $${nearResist.price.toFixed(2)}`;
    } else if (dist < 0.05) {
      srScore = Math.min(srScore, srScore - 0.5);
      srReason += ` | ใกล้แนวต้าน $${nearResist.price.toFixed(2)}`;
    }
  }
  factors.push({ name: 'Support/Resistance', score: Math.max(-2, Math.min(2, srScore)), weight: 0.12, reason: srReason });

  // --- Factor 6: Volume Confirmation (weight 10%) ---
  // v2: volume ดี = bonus, volume แย่ไม่ลงโทษหนัก
  let volScore = 0;
  let volReason = `Volume ratio: ${data.volumeRatio.toFixed(2)}x`;
  if (data.volumeRatio > 2.5) {
    volScore = 2; volReason += ' — 🔥 Unusually high volume!';
  } else if (data.volumeRatio > 1.5) {
    volScore = 1; volReason += ' — Above average volume';
  } else if (data.volumeRatio > 0.8) {
    volScore = 0; volReason += ' — Normal volume';
  } else if (data.volumeRatio > 0.5) {
    volScore = -0.5; volReason += ' — Below average volume';
  } else {
    volScore = -1; volReason += ' — Very low volume, weak';
  }
  factors.push({ name: 'Volume', score: volScore, weight: 0.10, reason: volReason });

  // --- Factor 7: ADX Trend Strength (weight 12%) ---
  // v2: ADX ให้ bonus ทั้ง bull และ bear + ADX rising
  const adx = latest(data.adx);
  const adxPrev = prev(data.adx);
  let adxScore = 0;
  let adxReason = 'ADX not available';
  if (adx !== null) {
    const isBullish = e20 !== null && e50 !== null && price > e20;
    const adxRising = adxPrev !== null && adx > adxPrev;

    if (adx > 30 && isBullish) {
      adxScore = 2; adxReason = `ADX ${adx.toFixed(1)} — Strong uptrend 💪`;
    } else if (adx > 25 && isBullish) {
      adxScore = 1.5; adxReason = `ADX ${adx.toFixed(1)} — Moderate uptrend`;
    } else if (adx > 20 && isBullish && adxRising) {
      adxScore = 1; adxReason = `ADX ${adx.toFixed(1)} — Trend strengthening ↑`;
    } else if (adx > 30 && !isBullish) {
      adxScore = -1.5; adxReason = `ADX ${adx.toFixed(1)} — Strong downtrend`;
    } else if (adx > 25 && !isBullish) {
      adxScore = -1; adxReason = `ADX ${adx.toFixed(1)} — Moderate downtrend`;
    } else if (adx < 20) {
      // Ranging market — mean reversion works better
      adxScore = 0; adxReason = `ADX ${adx.toFixed(1)} — Sideways/ranging`;
    } else {
      adxScore = 0; adxReason = `ADX ${adx.toFixed(1)} — Weak trend`;
    }
  }
  factors.push({ name: 'ADX Trend', score: adxScore, weight: 0.12, reason: adxReason });

  // --- Factor 8: EMA200 Trend (weight 12%) ---
  // v2: เพิ่ม golden cross detection + near-200 bounce
  let e200Score = 0;
  let e200Reason = 'EMA200 not available';
  if (e200 !== null) {
    const distFrom200 = ((price - e200) / e200) * 100;

    if (price > e200 && distFrom200 < 5) {
      // Near EMA200 from above — strong support
      e200Score = 1.5; e200Reason = `Bouncing off EMA200 (+${distFrom200.toFixed(1)}%) — strong support`;
    } else if (price > e200 && distFrom200 < 15) {
      e200Score = 1; e200Reason = `Above EMA200 (+${distFrom200.toFixed(1)}%) — bullish`;
    } else if (price > e200 && distFrom200 >= 15) {
      e200Score = 0.5; e200Reason = `Above EMA200 (+${distFrom200.toFixed(1)}%) — extended`;
    } else if (price < e200 && distFrom200 > -5) {
      // Just below EMA200 — could bounce or break
      e200Score = -0.5; e200Reason = `Just below EMA200 (${distFrom200.toFixed(1)}%) — watch for bounce`;
    } else if (price < e200) {
      e200Score = -1; e200Reason = `Below EMA200 (${distFrom200.toFixed(1)}%) — bearish`;
    }

    // EMA50 crossing EMA200 (Golden/Death Cross)
    if (e50 !== null) {
      const e50prev5 = data.ema50.length > 5 ? data.ema50[data.ema50.length - 6].value : null;
      const e200prev5 = data.ema200.length > 5 ? data.ema200[data.ema200.length - 6].value : null;
      if (e50prev5 !== null && e200prev5 !== null) {
        if (e50 > e200 && e50prev5 < e200prev5) {
          e200Score = 2; e200Reason = '🔥 Golden Cross! EMA50 crossed above EMA200';
        } else if (e50 < e200 && e50prev5 > e200prev5) {
          e200Score = -2; e200Reason = '💀 Death Cross! EMA50 crossed below EMA200';
        }
      }
    }
  }
  factors.push({ name: 'EMA200 Trend', score: e200Score, weight: 0.12, reason: e200Reason });

  // --- Calculate Total Score ---
  const totalScore = factors.reduce((s, f) => s + f.score * (f.weight * 10), 0);
  const maxScore = factors.reduce((s, f) => s + 2 * (f.weight * 10), 0);
  const normalizedScore = Math.round(((totalScore + maxScore) / (2 * maxScore)) * 100);

  // --- Determine Signal (v2: ลด threshold ลง) ---
  let signal: SignalType = 'hold';
  if (totalScore >= 3.5) signal = 'strong_buy';
  else if (totalScore >= 1.5) signal = 'buy';
  else if (totalScore <= -3.5) signal = 'strong_sell';
  else if (totalScore <= -1.5) signal = 'sell';

  // --- Determine Strategy (v2: ปรับเงื่อนไข) ---
  let strategy: StrategyType = 'trend_following';
  const adxVal = adx ?? 0;
  if (adxVal < 20 && (rsiScore >= 1 || bbScore >= 1)) {
    strategy = 'mean_reversion';
  } else if (volScore >= 1 && (srScore >= 1 || macdScore >= 1.5)) {
    strategy = 'breakout';
  }

  // --- Calculate SL/TP using ATR ---
  const atr = latest(data.atr) ?? price * 0.02;
  const stopLoss = round2(price - atr * 2);
  const takeProfit1 = round2(price + atr * 3);
  const takeProfit2 = round2(price + atr * 5);
  const risk = price - stopLoss;
  const reward = takeProfit1 - price;
  const rrRatio = risk > 0 ? round2(reward / risk) : 0;

  // --- Confidence (v2: ให้น้ำหนักตาม alignment) ---
  const positiveFactors = factors.filter(f => f.score > 0);
  const negativeFactors = factors.filter(f => f.score < 0);
  const neutralFactors = factors.filter(f => f.score === 0);

  let confidence: number;
  if (totalScore > 0) {
    // How many factors agree bullish?
    const bullWeight = positiveFactors.reduce((s, f) => s + f.weight, 0);
    const bearWeight = negativeFactors.reduce((s, f) => s + f.weight, 0);
    confidence = Math.round((bullWeight / (bullWeight + bearWeight + 0.01)) * 100);
  } else if (totalScore < 0) {
    const bearWeight = negativeFactors.reduce((s, f) => s + f.weight, 0);
    const bullWeight = positiveFactors.reduce((s, f) => s + f.weight, 0);
    confidence = Math.round((bearWeight / (bearWeight + bullWeight + 0.01)) * 100);
  } else {
    confidence = 50;
  }

  return {
    symbol,
    totalScore: round2(totalScore),
    normalizedScore,
    signal,
    strategy,
    factors,
    price: round2(price),
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio: rrRatio,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
