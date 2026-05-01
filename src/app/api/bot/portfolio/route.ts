import { NextResponse } from 'next/server';
import { getPortfolioState, resetPortfolio } from '@/lib/bot/paper-trader';
import { getAlpacaPortfolioState, getAlpacaHoldings } from '@/lib/bot/alpaca-trader';
import { getCurrentPrices } from '@/lib/bot/scanner';
import { db } from '@/db';
import { botPortfolio } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Check Alpaca first
    const alpacaPortfolio = await getAlpacaPortfolioState();
    const alpacaHoldings = await getAlpacaHoldings();

    if (alpacaPortfolio) {
      return NextResponse.json({
        ...alpacaPortfolio,
        drawdown: 0, // Alpaca account doesn't give this directly in this call
        openPositions: alpacaHoldings.length,
        winRate: 0, // Would need order history to calculate
        holdings: alpacaHoldings,
        isAlpaca: true,
      });
    }

    // 2. Fallback to Paper Trading (original logic)
    const portfolio = await getPortfolioState();
    const openTrades = await db.query.botTrades.findMany({
      where: (t: any, { eq }: any) => eq(t.status, 'open'),
    });

    const symbols = openTrades.map((t: any) => t.symbol);
    const prices = symbols.length > 0 ? await getCurrentPrices(symbols) : new Map();

    let totalUnrealizedPnl = 0;
    let totalHoldingsValue = 0;
    const holdings = openTrades.map((t: any) => {
      const currentPrice = prices.get(t.symbol) ?? t.entryPrice;
      const isBuy = t.side === 'buy';
      
      const unrealizedPnl = isBuy 
        ? (currentPrice - t.entryPrice) * t.shares
        : (t.entryPrice - currentPrice) * t.shares;
        
      const unrealizedPnlPct = isBuy
        ? ((currentPrice - t.entryPrice) / t.entryPrice) * 100
        : ((t.entryPrice - currentPrice) / t.entryPrice) * 100;
        
      totalUnrealizedPnl += unrealizedPnl;
      totalHoldingsValue += currentPrice * t.shares;

      return {
        ...t,
        currentPrice,
        unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        unrealizedPnlPct: Math.round(unrealizedPnlPct * 100) / 100,
      };
    });

    const performance = await db.query.botSettings.findFirst({
      where: (p: any, { eq }: any) => eq(p.id, 1),
    });

    const portfolioRecord = await db.query.botPortfolio.findFirst({
      where: (p: any, { eq }: any) => eq(p.id, 1),
    });

    if (!portfolioRecord) throw new Error('Portfolio not found');

    const liveTotalValue = Math.round((portfolioRecord.cash + totalHoldingsValue) * 100) / 100;
    const finalTotalPnl = portfolioRecord.totalPnl + totalUnrealizedPnl;
    const newPeakValue = Math.max(portfolioRecord.peakValue, liveTotalValue);

    await db.update(botPortfolio).set({
      totalValue: liveTotalValue,
      peakValue: newPeakValue,
      updatedAt: new Date().toISOString(),
    }).where(eq(botPortfolio.id, 1));

    const winRate = portfolioRecord && portfolioRecord.totalTrades > 0
      ? (portfolioRecord.winTrades / portfolioRecord.totalTrades) * 100
      : 0;

    return NextResponse.json({
      cash: portfolioRecord.cash,
      totalValue: liveTotalValue,
      peakValue: newPeakValue,
      initialCapital: portfolioRecord?.initialCapital ?? 100000,
      totalPnl: Math.round(finalTotalPnl * 100) / 100,
      totalPnlPct: portfolioRecord?.initialCapital
        ? (finalTotalPnl / portfolioRecord.initialCapital) * 100
        : 0,
      drawdown: portfolio.currentDrawdown * 100,
      openPositions: portfolio.openPositions,
      totalTrades: portfolioRecord?.totalTrades ?? 0,
      winTrades: portfolioRecord?.winTrades ?? 0,
      lossTrades: portfolioRecord?.lossTrades ?? 0,
      winRate: Math.round(winRate * 100) / 100,
      holdings,
      isAlpaca: false,
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
