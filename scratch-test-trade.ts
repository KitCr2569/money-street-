import { scanStocks } from './src/lib/bot/scanner';
import { executeAlpacaBuy } from './src/lib/bot/alpaca-trader';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTestTrade() {
  console.log('🧪 Starting Test Trade for TSM...');
  const res = await scanStocks(['TSM']);
  
  if (res.signals.length > 0) {
    const signal = res.signals[0];
    console.log(`📡 Signal found for ${signal.symbol}: ${signal.signal} (Score: ${signal.totalScore})`);
    
    const tradeRes = await executeAlpacaBuy(signal);
    if (tradeRes.success) {
      console.log('✅ TEST TRADE SUCCESSFUL!');
      console.log(`📦 Order ID: ${tradeRes.orderId}`);
      console.log(`🔢 Shares: ${tradeRes.shares}`);
    } else {
      console.error(`❌ TEST TRADE FAILED: ${tradeRes.reason}`);
    }
  } else {
    console.log('❌ No signal found for TSM at this moment.');
  }
}

runTestTrade();
