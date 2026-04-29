import { scanStocks } from './src/lib/bot/scanner';
import { notifyScanResults } from './src/lib/bot/notifications';

async function runScan() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BTC-USD', 'ETH-USD'];
  console.log(`📡 Starting scan for ${symbols.length} symbols...`);
  
  try {
    // Run the scan logic
    const result = await scanStocks(symbols, { saveSignals: true });
    
    console.log(`✅ Scan completed in ${(result.scanDuration / 1000).toFixed(1)}s`);
    console.log(`📊 Results: Buy: ${result.buySignals} | Sell: ${result.sellSignals}`);
    
    if (result.errors.length > 0) {
      console.log('⚠️ Errors:', result.errors);
    }

    // Send notification
    console.log('🔔 Sending results to Telegram...');
    await notifyScanResults(result);
    
    console.log('🏁 Process finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Scan failed:', err);
    process.exit(1);
  }
}

runScan();
