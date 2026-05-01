import { db } from '@/db';
import { botTrades, botPortfolio } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { BotSignal } from './bot-engine';
import {
  calculatePositionSize, checkExitConditions, calculateTrailingStop,
  type RiskConfig, type PortfolioState, DEFAULT_RISK_CONFIG,
} from './risk-manager';
import { notifyTradeExecution, notifyTradeClosed } from './notifications';

// =====================================================
// Paper Trader — Simulated Trading Engine
// =====================================================

export interface TradeRecord {
  id: string;
  symbol: string;
  side: string;
  shares: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  highestPrice: number;
  strategy: string;
  signalScore: number;
  confidence: number;
  status: string;
  exitReason: string | null;
  pnl: number | null;
  pnlPercent: number | null;
  entryAt: string;
  exitAt: string | null;
}

/** Get or create portfolio state */
export async function getPortfolioState(): Promise<PortfolioState> {
  const rows = await db.query.botPortfolio.findMany();
  if (rows.length === 0) {
    // Initialize portfolio
    await db.insert(botPortfolio).values({
      id: 1,
      cash: 100000,
      totalValue: 100000,
      peakValue: 100000,
      initialCapital: 100000,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      totalPnl: 0,
    });
    return {
      cash: 100000,
      totalValue: 100000,
      peakValue: 100000,
      currentDrawdown: 0,
      openPositions: 0,
      totalPnl: 0,
    };
  }

  const p = rows[0];
  const openTrades = await db.query.botTrades.findMany({
    where: (t, { eq: e }) => e(t.status, 'open'),
  });

  return {
    cash: p.cash,
    totalValue: p.totalValue,
    peakValue: p.peakValue,
    currentDrawdown: p.peakValue > 0 ? (p.peakValue - p.totalValue) / p.peakValue : 0,
    openPositions: openTrades.length,
    totalPnl: p.totalPnl,
  };
}

/** Execute a buy signal (paper trade) */
export async function executeBuy(
  signal: BotSignal,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): Promise<{ success: boolean; trade?: TradeRecord; reason?: string }> {
  const portfolio = await getPortfolioState();
  const sizing = calculatePositionSize(signal, portfolio, config);

  if (!sizing.approved) {
    return { success: false, reason: sizing.rejectReason };
  }

  // Check if already holding this symbol
  const existing = await db.query.botTrades.findFirst({
    where: (t, { and, eq: e }) => and(e(t.symbol, signal.symbol), e(t.status, 'open')),
  });
  if (existing) {
    return { success: false, reason: `Already holding ${signal.symbol}` };
  }

  // Create trade record
  const tradeId = crypto.randomUUID();
  await db.insert(botTrades).values({
    id: tradeId,
    symbol: signal.symbol,
    side: 'buy',
    shares: sizing.shares,
    entryPrice: signal.price,
    stopLoss: signal.stopLoss,
    takeProfit1: signal.takeProfit1,
    takeProfit2: signal.takeProfit2,
    highestPrice: signal.price,
    strategy: signal.strategy,
    signalScore: signal.totalScore,
    confidence: signal.confidence,
    status: 'open',
  });

  // Update portfolio cash
  const newCash = portfolio.cash - sizing.investmentAmount;
  await db.update(botPortfolio)
    .set({ cash: newCash, updatedAt: new Date().toISOString() })
    .where(eq(botPortfolio.id, 1));

  const trade: TradeRecord = {
    id: tradeId,
    symbol: signal.symbol,
    side: 'buy',
    shares: sizing.shares,
    entryPrice: signal.price,
    exitPrice: null,
    stopLoss: signal.stopLoss,
    takeProfit1: signal.takeProfit1,
    takeProfit2: signal.takeProfit2,
    highestPrice: signal.price,
    strategy: signal.strategy,
    signalScore: signal.totalScore,
    confidence: signal.confidence,
    status: 'open',
    exitReason: null,
    pnl: null,
    pnlPercent: null,
    entryAt: new Date().toISOString(),
    exitAt: null,
  };

  // Notify
  notifyTradeExecution('buy', signal.symbol, sizing.shares, signal.price).catch(() => {});

  return { success: true, trade };
}

/** Check and close positions that hit SL/TP */
export async function monitorPositions(
  currentPrices: Map<string, number>,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
): Promise<TradeRecord[]> {
  const openTrades = await db.query.botTrades.findMany({
    where: (t, { eq: e }) => e(t.status, 'open'),
  });

  const closedTrades: TradeRecord[] = [];

  for (const trade of openTrades) {
    const currentPrice = currentPrices.get(trade.symbol);
    if (!currentPrice) continue;

    // Update highest price for trailing stop
    const newHighest = Math.max(trade.highestPrice, currentPrice);
    if (newHighest > trade.highestPrice) {
      await db.update(botTrades)
        .set({ highestPrice: newHighest })
        .where(eq(botTrades.id, trade.id));
    }

    // Calculate trailing stop
    const trailingStop = calculateTrailingStop(
      trade.entryPrice, newHighest, trade.stopLoss, config
    );

    // Check exit conditions
    const exit = checkExitConditions(
      currentPrice, trailingStop, trade.takeProfit1, trade.takeProfit2, newHighest, config
    );

    if (exit.shouldExit) {
      const closed = await closeTrade(trade.id, currentPrice, exit.exitType, exit.reason);
      if (closed) closedTrades.push(closed);
    }
  }

  // Update portfolio total value
  await updatePortfolioValue(currentPrices);

  return closedTrades;
}

/** Close a trade */
export async function closeTrade(
  tradeId: string,
  exitPrice: number,
  exitType: string,
  exitReason: string,
): Promise<TradeRecord | null> {
  const trade = await db.query.botTrades.findFirst({
    where: (t, { eq: e }) => e(t.id, tradeId),
  });
  if (!trade || trade.status !== 'open') return null;

  const pnl = (exitPrice - trade.entryPrice) * trade.shares;
  const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
  const isWin = pnl > 0;
  const now = new Date().toISOString();

  // Update trade
  await db.update(botTrades).set({
    exitPrice,
    exitReason,
    status: exitType === 'stop_loss' ? 'stopped' : 'closed',
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    exitAt: now,
  }).where(eq(botTrades.id, tradeId));

  // Update portfolio
  const portfolio = await db.query.botPortfolio.findFirst({
    where: (p, { eq: e }) => e(p.id, 1),
  });
  if (portfolio) {
    const cashReturn = exitPrice * trade.shares;
    const newCash = portfolio.cash + cashReturn;
    const newTotalPnl = portfolio.totalPnl + pnl;
    
    // Get all remaining open trades to calculate new total value
    const remainingTrades = await db.query.botTrades.findMany({
      where: (t, { and, eq: e, ne }) => and(e(t.status, 'open'), ne(t.id, tradeId)),
    });
    let remainingHoldingsValue = 0;
    for (const rt of remainingTrades) {
      remainingHoldingsValue += rt.entryPrice * rt.shares; // approximation using entry price
    }
    const newTotalValue = Math.round((newCash + remainingHoldingsValue) * 100) / 100;
    const newPeakValue = Math.max(portfolio.peakValue, newTotalValue);

    await db.update(botPortfolio).set({
      cash: newCash,
      totalValue: newTotalValue,
      peakValue: newPeakValue,
      totalPnl: Math.round(newTotalPnl * 100) / 100,
      totalTrades: portfolio.totalTrades + 1,
      winTrades: portfolio.winTrades + (isWin ? 1 : 0),
      lossTrades: portfolio.winTrades + (isWin ? 0 : 1),
      updatedAt: now,
    }).where(eq(botPortfolio.id, 1));

    // Notify
    notifyTradeClosed(
      trade.symbol,
      Math.round(pnl * 100) / 100,
      Math.round(pnlPercent * 100) / 100,
      exitReason
    ).catch(() => {});
  }

  return {
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    shares: trade.shares,
    entryPrice: trade.entryPrice,
    exitPrice,
    stopLoss: trade.stopLoss,
    takeProfit1: trade.takeProfit1,
    takeProfit2: trade.takeProfit2,
    highestPrice: trade.highestPrice,
    strategy: trade.strategy,
    signalScore: trade.signalScore,
    confidence: trade.confidence,
    status: exitType === 'stop_loss' ? 'stopped' : 'closed',
    exitReason,
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    entryAt: trade.entryAt,
    exitAt: now,
  };
}

/** Update portfolio total value including open positions */
async function updatePortfolioValue(currentPrices: Map<string, number>) {
  const portfolio = await db.query.botPortfolio.findFirst({
    where: (p, { eq: e }) => e(p.id, 1),
  });
  if (!portfolio) return;

  const openTrades = await db.query.botTrades.findMany({
    where: (t, { eq: e }) => e(t.status, 'open'),
  });

  let holdingsValue = 0;
  for (const trade of openTrades) {
    const price = currentPrices.get(trade.symbol) ?? trade.entryPrice;
    holdingsValue += price * trade.shares;
  }

  const totalValue = Math.round((portfolio.cash + holdingsValue) * 100) / 100;
  const newPeak = Math.max(portfolio.peakValue, totalValue);

  await db.update(botPortfolio).set({
    totalValue,
    peakValue: newPeak,
    updatedAt: new Date().toISOString(),
  }).where(eq(botPortfolio.id, 1));
}

/** Reset the paper trading portfolio */
export async function resetPortfolio(initialCapital = 100000) {
  // Delete all trades
  await db.delete(botTrades);

  // Reset portfolio
  await db.delete(botPortfolio);
  await db.insert(botPortfolio).values({
    id: 1,
    cash: initialCapital,
    totalValue: initialCapital,
    peakValue: initialCapital,
    initialCapital,
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    totalPnl: 0,
  });
}
