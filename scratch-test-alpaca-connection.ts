import { getAlpacaClient } from './src/lib/bot/alpaca-trader';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log('🔌 Testing Alpaca Connection...');
  const alpaca = getAlpacaClient();
  
  if (!alpaca) {
    console.error('❌ Alpaca API keys are missing or invalid in .env.local');
    return;
  }

  try {
    const account = await alpaca.getAccount();
    console.log('✅ Connected to Alpaca successfully!');
    console.log(`💰 Account Status: ${account.status}`);
    console.log(`💵 Cash: $${account.cash}`);
    console.log(`📈 Equity: $${account.equity}`);
    console.log(`🏷️ Account Number: ${account.account_number}`);
  } catch (err) {
    console.error('❌ Alpaca connection failed:', err instanceof Error ? err.message : err);
  }
}

testConnection();
