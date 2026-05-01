import { NextResponse } from 'next/server';
import { getPortfolioState, resetPortfolio } from '@/lib/bot/paper-trader';
import { getAlpacaPortfolioState, getAlpacaHoldings } from '@/lib/bot/alpaca-trader';
import { getCurrentPrices } from '@/lib/bot/scanner';
import { db } from '@/db';
import { botPortfolio } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Add timeout to prevent hanging (reduced for performance)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 3000)
    );

    // 1. Check Alpaca first
    const alpacaPortfolio = await Promise.race([
      getAlpacaPortfolioState().catch(() => null),
      timeoutPromise
    ]) as any;
    const alpacaHoldings = await Promise.race([
      getAlpacaHoldings().catch(() => []),
      timeoutPromise
    ]) as any;

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
    const portfolio = await Promise.race([
      getPortfolioState(),
      timeoutPromise
    ]);
    const openTrades = await Promise.race([
      db.query.botTrades.findMany({
        where: (t: any, { eq }: any) => eq(t.status, 'open'),
      }),
      timeoutPromise
    ]) as any;

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
      drawdown: (portfolio as any).currentDrawdown * 100,
      openPositions: (portfolio as any).openPositions,
      totalTrades: portfolioRecord?.totalTrades ?? 0,
      winTrades: portfolioRecord?.winTrades ?? 0,
      lossTrades: portfolioRecord?.lossTrades ?? 0,
      winRate: Math.round(winRate * 100) / 100,
      holdings,
      isAlpaca: false,
    });
  } catch (err) {
    console.error('Portfolio GET error:', err);
    // Return empty portfolio on error to prevent hanging
    return NextResponse.json({
      cash: 100000,
      totalValue: 100000,
      peakValue: 100000,
      initialCapital: 100000,
      totalPnl: 0,
      totalPnlPct: 0,
      drawdown: 0,
      openPositions: 0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      winRate: 0,
      holdings: [],
      isAlpaca: false,
      error: 'Database not configured - please set TURSO_DATABASE_URL in Vercel environment variables'
    });
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
