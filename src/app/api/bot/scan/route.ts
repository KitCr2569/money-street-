import { NextResponse } from 'next/server';
import { scanStocks, quickScan, getCurrentPrices } from '@/lib/bot/scanner';
import { executeBuy, monitorPositions, getPortfolioState } from '@/lib/bot/paper-trader';
import { confirmSignalWithAI } from '@/lib/bot/ai-confirm';
import { notifyScanResults } from '@/lib/bot/notifications';
import { db } from '@/db';
import { botSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { symbols, autoTrade = false } = body as {
      symbols?: string[];
      autoTrade?: boolean;
    };

    // Run scan
    const result = await scanStocks(symbols);

    // Send LINE notifications for strong signals
    notifyScanResults(result).catch(err => console.error('Notify error:', err));

    // Auto-trade if enabled: execute buy for strong signals
    const executedTrades = [];
    if (autoTrade) {
      const buySignals = result.signals.filter(
        s => s.signal === 'strong_buy' || s.signal === 'buy'
      );

      for (const signal of buySignals.slice(0, 3)) {
        // AI confirmation check
        let aiOk = true;
        const settings = await db.query.botSettings.findFirst({
          where: (s: any, { eq: e }: any) => e(s.id, 1),
        });
        if (settings?.useAiConfirm) {
          const aiResult = await confirmSignalWithAI(signal);
          aiOk = aiResult.confirmed;
          if (aiResult.adjustedStopLoss) signal.stopLoss = aiResult.adjustedStopLoss;
        }

        if (aiOk) {
          const trade = await executeBuy(signal);
          if (trade.success) {
            executedTrades.push(trade.trade);
          }
        }
      }

      // Also monitor existing positions
      const openSymbols = (await db.query.botTrades.findMany({
        where: (t: any, { eq: e }: any) => e(t.status, 'open'),
      })).map((t: any) => t.symbol);

      if (openSymbols.length > 0) {
        const prices = await getCurrentPrices(openSymbols);
        await monitorPositions(prices);
      }
    }

    return NextResponse.json({
      ...result,
      executedTrades,
    });
  } catch (err) {
    console.error('Bot scan error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Quick scan — strong signals only
  try {
    const result = await quickScan();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Quick scan error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Quick scan failed' },
      { status: 500 }
    );
  }
}
