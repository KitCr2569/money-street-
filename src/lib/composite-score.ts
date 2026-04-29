import type { HistoryResponse, SRLevel } from '@/types';

export interface ScoreBreakdown {
  rsi: number;
  ema: number;
  sr: number;
  trend: number;
  ath: number;
}

export interface CompositeResult {
  score: number;
  breakdown: ScoreBreakdown;
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

export function calculateCompositeScore(
  rsi: number | null,
  price: number | null,
  ema20: number | null,
  ema50: number | null,
  nearestSupport: SRLevel | null,
  nearestResistance: SRLevel | null,
  trend: 'up' | 'down' | null,
  fiftyTwoWeekHigh: number | null,
  changePct?: number | null,
): CompositeResult {
  const breakdown: ScoreBreakdown = { rsi: 0, ema: 0, sr: 0, trend: 0, ath: 0 };

  // 1. RSI (max ±2)
  // Also factor in daily change — a huge spike with high RSI is dangerous
  if (rsi !== null) {
    const spikeAdjust = (changePct ?? 0);
    const effectiveRsi = rsi + (spikeAdjust > 10 ? 15 : spikeAdjust > 5 ? 8 : 0);

    if (effectiveRsi < 25) breakdown.rsi = 2;
    else if (effectiveRsi < 35) breakdown.rsi = 1;
    else if (effectiveRsi > 80) breakdown.rsi = -2;
    else if (effectiveRsi > 65) breakdown.rsi = -1;
  }

  // 2. EMA Position (max ±2)
  // Price above EMAs is bullish, but being TOO far above EMA20 means overextended
  if (price !== null && ema20 !== null && ema50 !== null) {
    const distFromEma20 = ((price - ema20) / ema20) * 100;

    if (distFromEma20 > 15) {
      // Way overextended above EMA20 → bearish (pullback likely)
      breakdown.ema = -2;
    } else if (distFromEma20 > 8) {
      // Overextended → mildly bearish
      breakdown.ema = -1;
    } else if (price > ema20 && price > ema50) {
      // Healthy uptrend
      breakdown.ema = 1;
    } else if (price < ema20 && price < ema50) {
      breakdown.ema = -1;
    }
  }

  // 3. Support/Resistance Proximity (max ±2)
  if (price !== null) {
    const supportDist = nearestSupport
      ? (price - nearestSupport.price) / price
      : Infinity;
    const resistDist = nearestResistance
      ? (nearestResistance.price - price) / price
      : Infinity;

    // Support zone — ยิ่งใกล้ยิ่งน่าซื้อ
    if (supportDist >= 0 && supportDist < 0.02) breakdown.sr = 2;       // <2% เหนือแนวรับ → น่าซื้อมาก
    else if (supportDist >= 0 && supportDist < 0.05) breakdown.sr = 1;  // <5% เหนือแนวรับ → น่าซื้อ
    // Resistance zone — ยิ่งใกล้ยิ่งน่าขาย
    else if (resistDist >= 0 && resistDist < 0.02) breakdown.sr = -2;   // <2% ใต้แนวต้าน → น่าขายมาก
    else if (resistDist >= 0 && resistDist < 0.05) breakdown.sr = -1;   // <5% ใต้แนวต้าน → น่าขาย
    // หลุดแนวรับ (supportDist < 0) → bearish breakdown
    else if (nearestSupport && supportDist < 0) breakdown.sr = -1;
  }

  // 4. Trend Direction (max ±1)
  // Discount trend bonus if stock just spiked massively (momentum exhaustion)
  if (trend === 'up') {
    breakdown.trend = (changePct ?? 0) > 15 ? 0 : 1;
  } else if (trend === 'down') {
    breakdown.trend = -1;
  }

  // 5. ATH Distance (max ±1)
  // Far from ATH alone doesn't mean cheap — only give bonus if also near support or in downtrend recovery
  if (price !== null && fiftyTwoWeekHigh !== null && fiftyTwoWeekHigh > 0) {
    const athDist = ((price - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100;
    if (athDist >= -3) {
      // Near ATH → risky, potential reversal
      breakdown.ath = -1;
    } else if (athDist < -50 && trend === 'up') {
      // Deep discount + recovering → could be value
      breakdown.ath = 1;
    }
    // Otherwise: no signal from ATH alone
  }

  const score = breakdown.rsi + breakdown.ema + breakdown.sr + breakdown.trend + breakdown.ath;

  return {
    score,
    breakdown,
    ...getSignalLabel(score),
  };
}

function getSignalLabel(score: number): { label: string; emoji: string; color: string; bg: string } {
  if (score >= 4) return { label: 'ซื้อเลย', emoji: '🔥', color: 'text-green', bg: 'bg-green-dim' };
  if (score >= 2) return { label: 'น่าซื้อ', emoji: '🟢', color: 'text-green', bg: 'bg-green-dim' };
  if (score === 1) return { label: 'ค่อนข้างซื้อ', emoji: '💚', color: 'text-green', bg: 'bg-green-dim' };
  if (score === 0) return { label: 'ถือ/รอ', emoji: '⚪', color: 'text-dim', bg: 'bg-surface-3' };
  if (score === -1) return { label: 'ค่อนข้างขาย', emoji: '💛', color: 'text-yellow', bg: 'bg-yellow-dim' };
  if (score >= -3) return { label: 'ทำกำไร', emoji: '🟡', color: 'text-yellow', bg: 'bg-yellow-dim' };
  return { label: 'ขายเลย', emoji: '🔴', color: 'text-red', bg: 'bg-red-dim' };
}
