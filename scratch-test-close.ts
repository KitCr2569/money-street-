
import { closeTrade } from './src/lib/bot/paper-trader';
import { db } from './src/db';

async function testClose() {
  const trade = await db.query.botTrades.findFirst({
    where: (t, { eq }) => eq(t.status, 'open'),
  });

  if (!trade) {
    console.log('No open trades found');
    return;
  }

  console.log(`Closing trade for ${trade.symbol} at price ${trade.entryPrice + 5} (+$5 gain)`);
  const result = await closeTrade(trade.id, trade.entryPrice + 5, 'take_profit', 'Manual test close');
  console.log('Close Result:', result);
}

testClose().catch(console.error);
