import { NextResponse } from 'next/server';
import { getPortfolioState, resetPortfolio } from '@/lib/bot/paper-trader';
import { getCurrentPrices } from '@/lib/bot/scanner';
import { db } from '@/db';

export async function GET() {
  try {
    const portfolio = await getPortfolioState();

    // Get open trades for current holdings
    const openTrades = await db.query.botTrades.findMany({
      where: (t, { eq }) => eq(t.status, 'open'),
    });

    // Get current prices for open positions
    const symbols = openTrades.map(t => t.symbol);
    const prices = symbols.length > 0 ? await getCurrentPrices(symbols) : new Map();

    const holdings = openTrades.map(t => {
      const currentPrice = prices.get(t.symbol) ?? t.entryPrice;
      const unrealizedPnl = (currentPrice - t.entryPrice) * t.shares;
      const unrealizedPnlPct = ((currentPrice - t.entryPrice) / t.entryPrice) * 100;
      return {
        ...t,
        currentPrice,
        unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
      };
    });

    // Get portfolio DB record for win/loss stats
    const portfolioRecord = await db.query.botPortfolio.findFirst({
      where: (p, { eq }) => eq(p.id, 1),
    });

    const winRate = portfolioRecord && portfolioRecord.totalTrades > 0
      ? (portfolioRecord.winTrades / portfolioRecord.totalTrades) * 100
      : 0;

    return NextResponse.json({
      cash: portfolio.cash,
      totalValue: portfolio.totalValue,
      peakValue: portfolio.peakValue,
      initialCapital: portfolioRecord?.initialCapital ?? 100000,
      totalPnl: portfolio.totalPnl,
      totalPnlPct: portfolioRecord?.initialCapital
        ? ((portfolio.totalPnl) / portfolioRecord.initialCapital) * 100
        : 0,
      drawdown: portfolio.currentDrawdown * 100,
      openPositions: portfolio.openPositions,
      totalTrades: portfolioRecord?.totalTrades ?? 0,
      winTrades: portfolioRecord?.winTrades ?? 0,
      lossTrades: portfolioRecord?.lossTrades ?? 0,
      winRate: Math.round(winRate * 100) / 100,
      holdings,
    });
  } catch (err) {
    console.error('Portfolio GET error:', err);
    return NextResponse.json({ error: 'Failed to get portfolio' }, { status: 500 });
  }
}

// Reset portfolio
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { initialCapital = 100000 } = body as { initialCapital?: number };

    await resetPortfolio(initialCapital);

    return NextResponse.json({ ok: true, message: `Portfolio reset with $${initialCapital}` });
  } catch (err) {
    console.error('Portfolio reset error:', err);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
