import { db } from './src/db';
import { botSettings } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function enableFullAutomation() {
  console.log('🤖 Enabling Full Automation...');
  try {
    await db.update(botSettings)
      .set({ 
        enabled: true,
        autoTrade: true,
        useAiConfirm: false, // ปิด AI ไว้ก่อนถ้ายังไม่มี API Key เพื่อไม่ให้บอทสะดุด
        scanIntervalMinutes: 30
      })
      .where(eq(botSettings.id, 1));
    
    console.log('✅ Auto Trade & Automation enabled in database!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update settings:', err);
    process.exit(1);
  }
}

enableFullAutomation();
