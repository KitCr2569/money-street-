import { NextResponse } from 'next/server';
import { scanStocks, getCurrentPrices } from '@/lib/bot/scanner';
import { monitorPositions, executeBuy } from '@/lib/bot/paper-trader';
import { notifyScanResults, notifyTradeExecution } from '@/lib/bot/notifications';
import { confirmSignalWithAI } from '@/lib/bot/ai-confirm';
import { db } from '@/db';
import { botSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Auto-scan cron endpoint
 * Call this via external cron (e.g., cron-job.org) every 30 minutes
 * URL: POST /api/bot/cron
 * Or use Next.js middleware / setInterval for local dev
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.BOT_CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if bot is enabled
    const settings = await db.query.botSettings.findFirst({
      where: (s, { eq: e }) => e(s.id, 1),
    });

    if (!settings?.enabled) {
      return NextResponse.json({ message: 'Bot is disabled', ran: false });
    }

    // 1. Monitor existing positions
    const openTrades = await db.query.botTrades.findMany({
      where: (t, { eq: e }) => e(t.status, 'open'),
    });
    const openSymbols = openTrades.map(t => t.symbol);
    let closedCount = 0;

    if (openSymbols.length > 0) {
      const prices = await getCurrentPrices(openSymbols);
      const closed = await monitorPositions(prices);
      closedCount = closed.length;
    }

    // 2. Run scan
    const scanSymbols = settings.scanSymbols ? JSON.parse(settings.scanSymbols) : undefined;
    const result = await scanStocks(
      scanSymbols.length > 0 ? scanSymbols : undefined
    );

    // 3. Send notifications
    await notifyScanResults(result);

    // 4. Auto-trade if enabled
    const executedTrades = [];
    if (settings.autoTrade) {
      const buySignals = result.signals.filter(
        s => s.signal === 'strong_buy' || s.signal === 'buy'
      );

      for (const signal of buySignals.slice(0, 3)) {
        let aiOk = true;
        if (settings.useAiConfirm) {
          const aiResult = await confirmSignalWithAI(signal);
          aiOk = aiResult.confirmed;
          if (aiResult.adjustedStopLoss) signal.stopLoss = aiResult.adjustedStopLoss;
        }

        if (aiOk) {
          const trade = await executeBuy(signal);
          if (trade.success) {
            executedTrades.push(trade.trade);
            await notifyTradeExecution('buy', signal.symbol, trade.trade!.shares, signal.price);
          }
        }
      }
    }

    // 5. Update last scan time
    await db.update(botSettings)
      .set({ lastScanAt: new Date().toISOString() })
      .where(eq(botSettings.id, 1));

    return NextResponse.json({
      ran: true,
      scannedCount: result.scannedCount,
      buySignals: result.buySignals,
      sellSignals: result.sellSignals,
      executedTrades: executedTrades.length,
      closedPositions: closedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Bot cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 }
    );
  }
}
