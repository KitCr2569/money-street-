
import { getCurrentPrices } from './src/lib/bot/scanner';

async function testPrices() {
  const symbols = ['ARM', 'TSM', 'AAPL'];
  console.log('Fetching prices for:', symbols);
  const prices = await getCurrentPrices(symbols);
  console.log('Prices Map:');
  for (const [symbol, price] of prices.entries()) {
    console.log(`${symbol}: ${price}`);
  }
}

testPrices().catch(console.error);
