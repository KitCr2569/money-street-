import { db } from './src/db';
import { botSettings } from './src/db/schema';

async function checkSettings() {
  try {
    const settings = await db.query.botSettings.findFirst();
    if (settings) {
      console.log('✅ Found Bot Settings:', settings);
    } else {
      console.log('❌ No Bot Settings found in database.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking settings:', err);
    process.exit(1);
  }
}

checkSettings();
