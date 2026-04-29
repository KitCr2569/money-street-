import { scanStocks } from './src/lib/bot/scanner';
import { notifyScanResults, notifyTradeExecution } from './src/lib/bot/notifications';
import { monitorPositions, executeBuy } from './src/lib/bot/paper-trader';
import { getCurrentPrices } from './src/lib/bot/scanner';
import { db } from './src/db';
import { botSettings } from './src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Main loop for the background bot
 */
async function runBotCycle() {
  console.log(`\n[${new Date().toLocaleTimeString()}] 🤖 Bot cycle starting...`);
  
  try {
    // 1. Get current settings
    const settings = await db.query.botSettings.findFirst({
      where: (s, { eq }) => eq(s.id, 1),
    });

    if (!settings?.enabled) {
      console.log('💤 Bot is currently disabled in settings. Skipping cycle.');
      return;
    }

    // 2. Monitor existing positions
    console.log('🧐 Monitoring open positions...');
    const openTrades = await db.query.botTrades.findMany({
      where: (t, { eq }) => eq(t.status, 'open'),
    });
    
    if (openTrades.length > 0) {
      const symbols = openTrades.map(t => t.symbol);
      const prices = await getCurrentPrices(symbols);
      const closed = await monitorPositions(prices);
      if (closed.length > 0) {
        console.log(`✅ Closed ${closed.length} positions.`);
      }
    }

    // 3. Scan for new signals
    console.log('📡 Scanning for new signals...');
    const result = await scanStocks();
    
    // 4. Send notifications
    await notifyScanResults(result);

    // 5. Auto-trade if enabled
    if (settings.autoTrade) {
      const buySignals = result.signals.filter(
        s => s.signal === 'strong_buy' || s.signal === 'buy'
      );

      for (const signal of buySignals.slice(0, 3)) {
        // Execute buy (Paper Trading)
        const trade = await executeBuy(signal);
        if (trade.success) {
          console.log(`🚀 Executed BUY for ${signal.symbol}`);
          await notifyTradeExecution('buy', signal.symbol, trade.trade!.shares, signal.price);
        }
      }
    }

    // 6. Update last scan time
    await db.update(botSettings)
      .set({ lastScanAt: new Date().toISOString() })
      .where(eq(botSettings.id, 1));

    console.log(`✅ Cycle completed. Next run in ${settings.scanIntervalMinutes} minutes.`);
  } catch (err) {
    console.error('❌ Bot cycle error:', err);
  }
}

// Start the bot
console.log('🚀 Money Street Background Bot is starting...');
runBotCycle(); // Run immediately on start

// Set interval
const INTERVAL_MS = 30 * 60 * 1000; // Default 30 mins
setInterval(runBotCycle, INTERVAL_MS);
