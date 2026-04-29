import type { Candle } from '@/types';
import { analyzeStock, generateSignal, type BotSignal } from './bot-engine';
import { DEFAULT_RISK_CONFIG, type RiskConfig } from './risk-manager';

// =====================================================
// Backtester — Test strategies against historical data
// =====================================================

export interface BacktestTrade {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  exitReason: string;
  strategy: string;
  holdDays: number;
}

export interface BacktestResult {
  symbol: string;
  period: string;
  totalReturn: number;
  totalReturnPct: number;
  buyHoldReturn: number;
  buyHoldReturnPct: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgHoldDays: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; value: number }[];
  benchmarkCurve: { date: string; value: number }[];
}

/**
 * Run backtest on a single symbol
 * Simulates the bot's strategy on historical data
 */
export function runBacktest(
  symbol: string,
  candles: Candle[],
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): BacktestResult {
  const initialCapital = config.initialCapital;
  let cash = initialCapital;
  let position: {
    shares: number;
    entryPrice: number;
    entryDate: string;
    entryIdx: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    highestPrice: number;
    strategy: string;
  } | null = null;

  const trades: BacktestTrade[] = [];
  const equityCurve: { date: string; value: number }[] = [];
  const benchmarkCurve: { date: string; value: number }[] = [];

  // Need at least 200 candles for EMA200
  const lookback = 200;
  if (candles.length < lookback + 20) {
    return emptyResult(symbol, candles);
  }

  const startPrice = candles[lookback].close;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  const dailyReturns: number[] = [];
  let prevEquity = initialCapital;

  // Walk forward through history
  for (let i = lookback; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const currentPrice = candles[i].close;
    const currentDate = candles[i].time;

    // Calculate equity
    const holdingsValue = position ? position.shares * currentPrice : 0;
    const equity = cash + holdingsValue;
    equityCurve.push({ date: currentDate, value: Math.round(equity * 100) / 100 });

    // Benchmark (buy & hold)
    const benchValue = initialCapital * (currentPrice / startPrice);
    benchmarkCurve.push({ date: currentDate, value: Math.round(benchValue * 100) / 100 });

    // Track drawdown
    peakEquity = Math.max(peakEquity, equity);
    const dd = (peakEquity - equity) / peakEquity;
    maxDrawdown = Math.max(maxDrawdown, dd);

    // Track daily returns
    const dailyReturn = prevEquity > 0 ? (equity - prevEquity) / prevEquity : 0;
    dailyReturns.push(dailyReturn);
    prevEquity = equity;

    // --- Check exit if holding ---
    if (position) {
      position.highestPrice = Math.max(position.highestPrice, currentPrice);

      // Trailing stop
      const trailingStop = position.highestPrice * (1 - config.trailingStopPct);
      const effectiveStop = Math.max(position.stopLoss, trailingStop);

      let shouldExit = false;
      let exitReason = '';

      if (currentPrice <= effectiveStop) {
        shouldExit = true;
        exitReason = currentPrice <= position.stopLoss ? 'stop_loss' : 'trailing_stop';
      } else if (currentPrice >= position.takeProfit2) {
        shouldExit = true;
        exitReason = 'take_profit';
      }

      // Max hold: 30 trading days
      const holdDays = i - position.entryIdx;
      if (holdDays >= 30) {
        shouldExit = true;
        exitReason = 'max_hold_time';
      }

      if (shouldExit) {
        const pnl = (currentPrice - position.entryPrice) * position.shares;
        const pnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        cash += currentPrice * position.shares;

        trades.push({
          symbol,
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          exitDate: currentDate,
          exitPrice: currentPrice,
          shares: position.shares,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPct * 100) / 100,
          exitReason,
          strategy: position.strategy,
          holdDays,
        });

        position = null;
      }
    }

    // --- Check entry if not holding (skip last 5 days) ---
    if (!position && i < candles.length - 5 && i % 3 === 0) {
      // Only check every 3rd candle to simulate scan interval
      try {
        const analysis = analyzeStock(slice);
        if (analysis) {
          const signal = generateSignal(symbol, analysis);

          if (signal.signal === 'strong_buy' || signal.signal === 'buy') {
            if (signal.riskRewardRatio >= config.riskRewardMinimum) {
              // Position sizing
              const riskPerShare = currentPrice - signal.stopLoss;
              if (riskPerShare > 0) {
                const maxRisk = equity * config.maxPortfolioRisk;
                const maxPos = equity * config.maxPositionPct;
                const sharesByRisk = Math.floor(maxRisk / riskPerShare);
                const sharesByPos = Math.floor(maxPos / currentPrice);
                const sharesByCash = Math.floor(cash / currentPrice);
                const shares = Math.max(1, Math.min(sharesByRisk, sharesByPos, sharesByCash));
                const cost = shares * currentPrice;

                if (cost <= cash) {
                  cash -= cost;
                  position = {
                    shares,
                    entryPrice: currentPrice,
                    entryDate: currentDate,
                    entryIdx: i,
                    stopLoss: signal.stopLoss,
                    takeProfit1: signal.takeProfit1,
                    takeProfit2: signal.takeProfit2,
                    highestPrice: currentPrice,
                    strategy: signal.strategy,
                  };
                }
              }
            }
          }
        }
      } catch {
        // Skip analysis errors during backtest
      }
    }
  }

  // Close any remaining position at last price
  if (position) {
    const lastPrice = candles[candles.length - 1].close;
    const pnl = (lastPrice - position.entryPrice) * position.shares;
    const pnlPct = ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
    cash += lastPrice * position.shares;
    trades.push({
      symbol,
      entryDate: position.entryDate,
      entryPrice: position.entryPrice,
      exitDate: candles[candles.length - 1].time,
      exitPrice: lastPrice,
      shares: position.shares,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPct * 100) / 100,
      exitReason: 'end_of_test',
      strategy: position.strategy,
      holdDays: candles.length - 1 - position.entryIdx,
    });
  }

  // Calculate metrics
  const totalReturn = cash - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  const endPrice = candles[candles.length - 1].close;
  const buyHoldReturn = initialCapital * (endPrice / startPrice) - initialCapital;
  const buyHoldReturnPct = (buyHoldReturn / initialCapital) * 100;

  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
  const avgWinPct = winTrades.length > 0
    ? winTrades.reduce((s, t) => s + t.pnlPercent, 0) / winTrades.length : 0;
  const avgLossPct = lossTrades.length > 0
    ? lossTrades.reduce((s, t) => s + t.pnlPercent, 0) / lossTrades.length : 0;

  const grossProfit = winTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgHoldDays = trades.length > 0
    ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length : 0;

  // Sharpe Ratio (annualized, assuming 252 trading days)
  const avgReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const stdReturn = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
    : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  const period = `${candles[lookback].time} → ${candles[candles.length - 1].time}`;

  return {
    symbol,
    period,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
    buyHoldReturnPct: Math.round(buyHoldReturnPct * 100) / 100,
    totalTrades: trades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWinPct: Math.round(avgWinPct * 100) / 100,
    avgLossPct: Math.round(avgLossPct * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgHoldDays: Math.round(avgHoldDays * 10) / 10,
    trades,
    equityCurve,
    benchmarkCurve,
  };
}

function emptyResult(symbol: string, candles: Candle[]): BacktestResult {
  return {
    symbol, period: 'N/A', totalReturn: 0, totalReturnPct: 0,
    buyHoldReturn: 0, buyHoldReturnPct: 0, totalTrades: 0,
    winTrades: 0, lossTrades: 0, winRate: 0, avgWinPct: 0,
    avgLossPct: 0, maxDrawdown: 0, sharpeRatio: 0, profitFactor: 0,
    avgHoldDays: 0, trades: [], equityCurve: [], benchmarkCurve: [],
  };
}
