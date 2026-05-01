
import { db } from './src/db';
import { botTrades, botPortfolio } from './src/db/schema';

async function check() {
  const portfolio = await db.query.botPortfolio.findFirst();
  console.log('Portfolio:', portfolio);

  const openTrades = await db.query.botTrades.findMany({
    where: (t, { eq }) => eq(t.status, 'open'),
  });
  console.log('Open Trades Count:', openTrades.length);
  if (openTrades.length > 0) {
    console.log('First 3 Open Trades:', openTrades.slice(0, 3));
  }

  const closedTrades = await db.query.botTrades.findMany({
    where: (t, { ne }) => ne(t.status, 'open'),
  });
  console.log('Closed Trades Count:', closedTrades.length);
}

check().catch(console.error);
