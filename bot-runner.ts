import { runUnifiedBotCycle } from './src/lib/bot/runner-logic';
import { db } from './src/db';

/**
 * Main loop for the background bot (CLI)
 */
async function startBot() {
  console.log('🚀 Money Street Background Bot is starting...');
  
  // 1. Initial run
  await runUnifiedBotCycle();

  // 2. Continuous loop
  const loop = async () => {
    try {
      // Get current settings for interval
      const settings = await db.query.botSettings.findFirst({
        where: (s, { eq }) => eq(s.id, 1),
      });

      const intervalMinutes = settings?.scanIntervalMinutes || 30;
      const intervalMs = intervalMinutes * 60 * 1000;

      console.log(`\n💤 Waiting ${intervalMinutes} minutes for next cycle...`);
      
      setTimeout(async () => {
        await runUnifiedBotCycle();
        loop(); // Schedule next
      }, intervalMs);

    } catch (err) {
      console.error('❌ Loop error:', err);
      setTimeout(loop, 60000); // Retry in 1 min on error
    }
  };

  loop();
}

startBot();

