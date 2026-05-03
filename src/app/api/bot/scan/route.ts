import { NextResponse } from 'next/server';
import { scanStocks, quickScan, getCurrentPrices } from '@/lib/bot/scanner';
import { executeBuy, monitorPositions, getPortfolioState } from '@/lib/bot/paper-trader';
import { confirmSignalWithAI } from '@/lib/bot/ai-confirm';
import { notifyScanResults } from '@/lib/bot/notifications';
import { getDB } from '@/db';
import { botSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { symbols, autoTrade = false } = body as {
      symbols?: string[];
      autoTrade?: boolean;
    };

    // Detect if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
    
    if (isVercel) {
      // Vercel: Use timeout to prevent function timeout (max 60s on hobby plan)
      const VERCEL_TIMEOUT = 45000; // 45 seconds to stay safe
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scan timeout - Vercel limit')), VERCEL_TIMEOUT)
      );
      
      const result = await Promise.race([
        scanStocks(symbols, { maxSymbols: 20 }), // Limit symbols for Vercel
        timeoutPromise
      ]) as any;
      
      return NextResponse.json({
        ...result,
        executedTrades: [],
        note: 'Vercel mode: Limited to 20 symbols max'
      });
    }
    
    // Local: Run without timeout
    const result = await scanStocks(symbols);

    // Send LINE notifications for strong signals
    notifyScanResults(result).catch(err => console.error('Notify error:', err));

    // Auto-trade if enabled: execute buy for strong signals
    const executedTrades = [];
    if (autoTrade) {
      const buySignals = result.signals.filter(
        (s: any) => s.signal === 'strong_buy' || s.signal === 'buy'
      );

      // Get DB and settings for auto-trade
      const db = await getDB();
      if (!db || !db.query) {
        console.error('Database not available for auto-trade');
      } else {
        const settings = await db.query.botSettings.findFirst({
          where: (s: any, { eq: e }: any) => e(s.id, 1),
        });

        for (const signal of buySignals.slice(0, 3)) {
          // AI confirmation check
          let aiOk = true;
          if (settings?.useAiConfirm) {
            const aiResult = await confirmSignalWithAI(signal);
            aiOk = aiResult.confirmed;
            if (aiResult.adjustedStopLoss) signal.stopLoss = aiResult.adjustedStopLoss;
          }

          if (aiOk) {
            const trade = await executeBuy(signal);
            if (trade.success) {
              executedTrades.push(trade.trade);
              console.log(`✅ Trade executed: ${signal.symbol}`);
            } else {
              console.log(`❌ Trade failed: ${signal.symbol} - ${trade.reason}`);
            }
          }
        }
      }

      // Also monitor existing positions
      if (db && db.query) {
        const openSymbols = (await db.query.botTrades.findMany({
          where: (t: any, { eq: e }: any) => e(t.status, 'open'),
        })).map((t: any) => t.symbol);

        if (openSymbols.length > 0) {
          const prices = await getCurrentPrices(openSymbols);
          await monitorPositions(prices);
        }
      }
    }

    return NextResponse.json({
      ...result,
      executedTrades,
    });
  } catch (err) {
    console.error('Bot scan error:', err);
    // Return proper structure even on error to prevent UI showing undefined/NaN
    return NextResponse.json({
      signals: [],
      scannedCount: 0,
      buySignals: 0,
      sellSignals: 0,
      errors: [err instanceof Error ? err.message : 'Scan failed'],
      scanDuration: 0,
      timestamp: new Date().toISOString(),
      executedTrades: [],
      error: err instanceof Error ? err.message : 'Scan failed'
    }, { status: 200 }); // Return 200 with error info so UI can display gracefully
  }
}

export async function GET() {
  // Quick scan — strong signals only
  try {
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
    
    if (isVercel) {
      // Vercel: Quick scan with timeout
      const VERCEL_TIMEOUT = 30000; // 30 seconds for quick scan
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Quick scan timeout - Vercel limit')), VERCEL_TIMEOUT)
      );
      
      const result = await Promise.race([
        quickScan(20), // Limit to 20 symbols for Vercel
        timeoutPromise
      ]) as any;
      
      return NextResponse.json({
        ...result,
        note: 'Vercel mode: Quick scan limited'
      });
    }
    
    // Local: Run without timeout
    const result = await quickScan();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Quick scan error:', err);
    // Return proper structure even on error to prevent UI showing undefined/NaN
    return NextResponse.json({
      signals: [],
      scannedCount: 0,
      buySignals: 0,
      sellSignals: 0,
      errors: [err instanceof Error ? err.message : 'Quick scan failed'],
      scanDuration: 0,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Quick scan failed'
    }, { status: 200 });
  }
}
