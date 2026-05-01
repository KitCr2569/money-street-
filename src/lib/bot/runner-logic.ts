import { scanStocks, getCurrentPrices } from './scanner';
import { monitorPositions, executeBuy } from './paper-trader';
import { executeAlpacaBuy, getAlpacaClient, updateAlpacaStopLoss } from './alpaca-trader';
import { notifyScanResults } from './notifications';
import { confirmSignalWithAI } from './ai-confirm';
import { calculatePositionSize, DEFAULT_RISK_CONFIG } from './risk-manager';
import { db } from '@/db';
import { botSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Unified Bot Cycle Logic
 * Used by both CLI runner and API cron
 */
export async function runUnifiedBotCycle() {
  console.log(`\n[${new Date().toLocaleTimeString()}] 🤖 Starting unified bot cycle...`);

  try {
    // 1. Get current settings
    const settings = await db.query.botSettings.findFirst({
      where: (s, { eq: e }) => e(s.id, 1),
    });

    if (!settings?.enabled) {
      console.log('💤 Bot is currently disabled in settings.');
      return { ran: false, reason: 'disabled' };
    }

    // 2. Monitor Positions
    console.log('🧐 Monitoring positions...');
    
    // 2.1 Monitor Local Paper Trades
    const openTrades = await db.query.botTrades.findMany({
      where: (t, { eq: e }) => e(t.status, 'open'),
    });
    let closedLocal = 0;
    if (openTrades.length > 0) {
      const symbols = openTrades.map(t => t.symbol);
      const prices = await getCurrentPrices(symbols);
      const closed = await monitorPositions(prices);
      closedLocal = closed.length;
    }

    // 2.2 Monitor Alpaca Positions (Trailing Stop)
    const alpaca = getAlpacaClient();
    if (alpaca) {
      try {
        const positions = await alpaca.getPositions();
        for (const pos of positions) {
          const profitPct = parseFloat(pos.unrealized_plpc) * 100;
          const currentPrice = parseFloat(pos.current_price);
          
          // Basic Trailing Stop Logic using Settings
          const trailingStopThreshold = 2; // Start trailing after 2% profit
          if (profitPct > trailingStopThreshold) {
            const trailingPct = settings.trailingStopPct || 0.05;
            const newStop = currentPrice * (1 - trailingPct);
            await updateAlpacaStopLoss(pos.symbol, newStop);
          }
        }
      } catch (err) {
        console.error('❌ Alpaca monitoring error:', err);
      }
    }

    // 3. Scan for new signals
    console.log('📡 Scanning for new signals...');
    const scanSymbols = settings.scanSymbols ? JSON.parse(settings.scanSymbols) : undefined;
    const result = await scanStocks(
      scanSymbols && scanSymbols.length > 0 ? scanSymbols : undefined
    );
    
    // 4. Send notifications
    await notifyScanResults(result);

    // 5. Auto-trade if enabled
    const executedTrades = [];
    if (settings.autoTrade) {
      const buySignals = result.signals.filter(
        s => s.signal === 'strong_buy' || s.signal === 'buy'
      );

      // Limit to top 3 signals per cycle to avoid over-exposure
      for (const signal of buySignals.slice(0, 3)) {
        console.log(`\n🎯 Processing signal: ${signal.symbol} (Score: ${signal.totalScore})`);
        
        // 5.1 AI Confirmation
        let aiConfirmed = true;
        let aiReason = 'AI Confirmation skipped';
        
        if (settings.useAiConfirm) {
          const aiResult = await confirmSignalWithAI(signal);
          aiConfirmed = aiResult.confirmed;
          aiReason = aiResult.reason;
          if (aiResult.adjustedStopLoss) signal.stopLoss = aiResult.adjustedStopLoss;
          if (aiResult.adjustedTakeProfit) signal.takeProfit1 = aiResult.adjustedTakeProfit;
          
          if (!aiConfirmed) {
            console.log(`❌ AI Rejected signal for ${signal.symbol}: ${aiReason}`);
            continue;
          }
          console.log(`✅ AI Confirmed signal for ${signal.symbol}`);
        }

        // 5.2 Risk Management / Position Sizing
        // If Alpaca is available, use Alpaca account state for sizing
        let portfolioState = {
          cash: settings.initialCapital,
          totalValue: settings.initialCapital,
          peakValue: settings.initialCapital,
          currentDrawdown: 0,
          openPositions: openTrades.length,
          totalPnl: 0
        };

        if (alpaca) {
          const account = await alpaca.getAccount();
          portfolioState = {
            cash: parseFloat(account.buying_power),
            totalValue: parseFloat(account.equity),
            peakValue: parseFloat(account.last_equity),
            currentDrawdown: (parseFloat(account.last_equity) - parseFloat(account.equity)) / parseFloat(account.last_equity),
            openPositions: (await alpaca.getPositions()).length,
            totalPnl: parseFloat(account.equity) - settings.initialCapital
          };
        }

        const riskConfig = {
          initialCapital: settings.initialCapital,
          maxPositionPct: settings.maxPositionPct,
          maxDrawdownPct: settings.maxDrawdownPct,
          maxOpenPositions: settings.maxOpenPositions,
          riskRewardMinimum: settings.riskRewardMinimum,
          trailingStopPct: settings.trailingStopPct,
          maxPortfolioRisk: 0.02, // 2% risk per trade default
          maxSectorExposure: 0.25
        };

        const sizeInfo = calculatePositionSize(signal, portfolioState, riskConfig);

        if (!sizeInfo.approved) {
          console.log(`⚠️ Risk Manager rejected ${signal.symbol}: ${sizeInfo.rejectReason}`);
          continue;
        }

        // 5.3 Execution
        if (alpaca) {
          console.log(`🚀 Executing Alpaca Trade for ${signal.symbol} (${sizeInfo.shares} shares)`);
          const res = await executeAlpacaBuy(signal, riskConfig);
          if (res.success) {
            executedTrades.push({ symbol: signal.symbol, type: 'alpaca', shares: sizeInfo.shares });
          } else {
            console.warn(`❌ Alpaca execution failed: ${res.reason}`);
          }
        } else {
          console.log(`🚀 Executing Local Paper Trade for ${signal.symbol} (${sizeInfo.shares} shares)`);
          const trade = await executeBuy(signal);
          if (trade.success) {
            executedTrades.push({ symbol: signal.symbol, type: 'paper', shares: sizeInfo.shares });
          }
        }
      }
    }

    // 6. Update last scan time
    await db.update(botSettings)
      .set({ lastScanAt: new Date().toISOString() })
      .where(eq(botSettings.id, 1));

    console.log(`✅ Cycle completed. Executed ${executedTrades.length} trades.`);
    
    return {
      ran: true,
      scannedCount: result.scannedCount,
      buySignals: result.buySignals,
      executedTrades: executedTrades.length,
      closedPositions: closedLocal,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('❌ Bot cycle error:', err);
    throw err;
  }
}
