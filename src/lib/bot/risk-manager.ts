import type { BotSignal } from './bot-engine';

// =====================================================
// Risk Manager — Position Sizing & Risk Control
// =====================================================

export interface RiskConfig {
  initialCapital: number;       // เงินเริ่มต้น (default $100,000)
  maxPositionPct: number;       // % สูงสุดต่อตำแหน่ง (default 5%)
  maxPortfolioRisk: number;     // ความเสี่ยงรวมสูงสุด (default 2% ต่อ trade)
  maxDrawdownPct: number;       // Max Drawdown ก่อนหยุด bot (default 10%)
  maxOpenPositions: number;     // จำนวนตำแหน่งเปิดสูงสุด (default 10)
  riskRewardMinimum: number;    // R:R ขั้นต่ำ (default 1.5)
  trailingStopPct: number;      // Trailing stop % (default 5%)
  maxSectorExposure: number;    // % สูงสุดต่อ sector (default 25%)
}

export interface PositionSize {
  shares: number;
  investmentAmount: number;
  riskAmount: number;           // จำนวนเงินที่เสี่ยง
  riskPercent: number;          // % ของพอร์ตที่เสี่ยง
  positionPercent: number;      // % ของพอร์ต
  approved: boolean;
  rejectReason?: string;
}

export interface PortfolioState {
  cash: number;
  totalValue: number;
  peakValue: number;
  currentDrawdown: number;
  openPositions: number;
  totalPnl: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  initialCapital: 100000,
  maxPositionPct: 0.05,
  maxPortfolioRisk: 0.02,
  maxDrawdownPct: 0.10,
  maxOpenPositions: 10,
  riskRewardMinimum: 1.5,
  trailingStopPct: 0.05,
  maxSectorExposure: 0.25,
};

/**
 * Calculate position size based on risk management rules
 * Uses fixed-percentage risk model: risk only X% of portfolio per trade
 */
export function calculatePositionSize(
  signal: BotSignal,
  portfolio: PortfolioState,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): PositionSize {
  const { price, stopLoss, riskRewardRatio } = signal;
  const riskPerShare = price - stopLoss;

  // --- Rejection checks ---
  if (riskPerShare <= 0) {
    return reject('Stop-loss ต้องต่ำกว่าราคาเข้า');
  }

  if (riskRewardRatio < config.riskRewardMinimum) {
    return reject(`R:R ${riskRewardRatio.toFixed(2)} ต่ำกว่าขั้นต่ำ ${config.riskRewardMinimum}`);
  }

  if (portfolio.openPositions >= config.maxOpenPositions) {
    return reject(`เปิดตำแหน่งครบ ${config.maxOpenPositions} ตัวแล้ว`);
  }

  // Check drawdown
  const drawdown = portfolio.peakValue > 0
    ? (portfolio.peakValue - portfolio.totalValue) / portfolio.peakValue
    : 0;
  if (drawdown >= config.maxDrawdownPct) {
    return reject(`Drawdown ${(drawdown * 100).toFixed(1)}% เกินขีดจำกัด ${(config.maxDrawdownPct * 100).toFixed(0)}%`);
  }

  // --- Calculate position size ---
  // Method: Risk-based sizing
  // Risk amount = portfolio * maxPortfolioRisk
  const maxRiskAmount = portfolio.totalValue * config.maxPortfolioRisk;
  const sharesByRisk = Math.floor(maxRiskAmount / riskPerShare);

  // Method: Max position size limit
  const maxPositionAmount = portfolio.totalValue * config.maxPositionPct;
  const sharesByPosition = Math.floor(maxPositionAmount / price);

  // Method: Cash available
  const sharesByCash = Math.floor(portfolio.cash / price);

  // Take the smallest
  const shares = Math.max(1, Math.min(sharesByRisk, sharesByPosition, sharesByCash));
  const investmentAmount = round2(shares * price);
  const riskAmount = round2(shares * riskPerShare);
  const riskPercent = round2((riskAmount / portfolio.totalValue) * 100);
  const positionPercent = round2((investmentAmount / portfolio.totalValue) * 100);

  // Final check: ensure we have enough cash
  if (investmentAmount > portfolio.cash) {
    return reject(`เงินสดไม่พอ: ต้องการ $${investmentAmount.toFixed(2)}, มี $${portfolio.cash.toFixed(2)}`);
  }

  return {
    shares,
    investmentAmount,
    riskAmount,
    riskPercent,
    positionPercent,
    approved: true,
  };
}

/**
 * Calculate trailing stop price
 * Moves the stop-loss up as price increases, but never down
 */
export function calculateTrailingStop(
  entryPrice: number,
  currentPrice: number,
  currentStop: number,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): number {
  // Trailing stop = current price * (1 - trailing%)
  const newStop = round2(currentPrice * (1 - config.trailingStopPct));

  // Only move stop up, never down
  return Math.max(currentStop, newStop);
}

/**
 * Check if a position should be closed
 */
export function checkExitConditions(
  currentPrice: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2: number,
  highestPrice: number,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): { shouldExit: boolean; reason: string; exitType: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'none' } {
  // Stop-loss hit
  if (currentPrice <= stopLoss) {
    return { shouldExit: true, reason: `Stop-loss hit at $${stopLoss.toFixed(2)}`, exitType: 'stop_loss' };
  }

  // Take-profit 2 hit (full exit)
  if (currentPrice >= takeProfit2) {
    return { shouldExit: true, reason: `Take-profit 2 hit at $${takeProfit2.toFixed(2)}`, exitType: 'take_profit' };
  }

  // Trailing stop check
  const trailingStop = calculateTrailingStop(stopLoss, highestPrice, stopLoss, config);
  if (currentPrice <= trailingStop && currentPrice > stopLoss) {
    return { shouldExit: true, reason: `Trailing stop hit at $${trailingStop.toFixed(2)}`, exitType: 'trailing_stop' };
  }

  return { shouldExit: false, reason: '', exitType: 'none' };
}

/**
 * Score adjustment based on portfolio state
 * Reduces aggressiveness when drawdown is high
 */
export function adjustScoreForRisk(
  signal: BotSignal,
  portfolio: PortfolioState,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): number {
  let adjustedScore = signal.totalScore;
  const drawdown = portfolio.peakValue > 0
    ? (portfolio.peakValue - portfolio.totalValue) / portfolio.peakValue
    : 0;

  // Reduce score when in drawdown (more conservative)
  if (drawdown > config.maxDrawdownPct * 0.5) {
    adjustedScore *= 0.7; // 30% reduction
  }
  if (drawdown > config.maxDrawdownPct * 0.75) {
    adjustedScore *= 0.5; // Additional 50% reduction
  }

  // Boost score for very high confidence signals
  if (signal.confidence >= 80) {
    adjustedScore *= 1.1;
  }

  return round2(adjustedScore);
}

function reject(reason: string): PositionSize {
  return {
    shares: 0,
    investmentAmount: 0,
    riskAmount: 0,
    riskPercent: 0,
    positionPercent: 0,
    approved: false,
    rejectReason: reason,
  };
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
