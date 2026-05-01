import { db } from './src/db';
import { botSettings } from './src/db/schema';

async function initDb() {
  console.log('🔍 Checking database connection...');
  try {
    const settings = await db.query.botSettings.findFirst();
    if (!settings) {
      console.log('🌱 Seeding default bot settings...');
      await db.insert(botSettings).values({
        id: 1,
        enabled: true,
        initialCapital: 100000,
        maxPositionPct: 0.05,
        maxDrawdownPct: 0.1,
        maxOpenPositions: 10,
        riskRewardMinimum: 1.5,
        trailingStopPct: 0.05,
        scanIntervalMinutes: 30,
        autoTrade: true,
        useAiConfirm: false,
        scanSymbols: JSON.stringify(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'BTC-USD', 'ETH-USD']),
      });
      console.log('✅ Default settings created.');
    } else {
      console.log('✅ Database already initialized.');
      console.log('Current settings:', settings);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}

initDb();
