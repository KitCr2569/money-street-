import { scanStocks } from './src/lib/bot/scanner';

async function testScan() {
  console.log('Scanning AAPL, TSLA, MSFT...');
  const result = await scanStocks(['AAPL', 'TSLA', 'MSFT'], { saveSignals: false });
  console.log(`Scanned ${result.scannedCount} symbols`);
  
  result.signals.forEach(s => {
    console.log(`\nSymbol: ${s.symbol} | Signal: ${s.signal} | Score: ${s.totalScore}`);
    console.log('Factors:');
    s.factors.forEach(f => {
      console.log(`  - ${f.name}: ${f.score} (${f.reason})`);
    });
  });
}

testScan().catch(console.error);
