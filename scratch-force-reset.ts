import { resetPortfolio } from './src/lib/bot/paper-trader';

async function forceReset() {
  console.log('🔄 Force resetting portfolio to $5000...');
  try {
    await resetPortfolio(5000);
    console.log('✅ Portfolio reset successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to reset portfolio:', err);
    process.exit(1);
  }
}

forceReset();
