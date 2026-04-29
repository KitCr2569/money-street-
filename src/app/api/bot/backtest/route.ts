import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/yahoo';
import { runBacktest } from '@/lib/bot/backtester';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, range = '2y', initialCapital = 100000 } = body as {
      symbol: string;
      range?: string;
      initialCapital?: number;
    };

    if (!symbol) {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 });
    }

    // Fetch historical data
    const candles = await getHistory(symbol, range);
    if (candles.length < 220) {
      return NextResponse.json(
        { error: `Not enough data for ${symbol}: ${candles.length} candles (need 220+)` },
        { status: 400 }
      );
    }

    const result = runBacktest(symbol, candles, {
      initialCapital,
      maxPositionPct: 0.05,
      maxPortfolioRisk: 0.02,
      maxDrawdownPct: 0.10,
      maxOpenPositions: 10,
      riskRewardMinimum: 1.5,
      trailingStopPct: 0.05,
      maxSectorExposure: 0.25,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Backtest error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backtest failed' },
      { status: 500 }
    );
  }
}
