import { sendTelegram } from './src/lib/bot/notifications';

async function testNotify() {
  console.log('🚀 Sending test message to Telegram...');
  console.log('Token:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Found' : '❌ Missing');
  console.log('Chat ID:', process.env.TELEGRAM_CHAT_ID ? '✅ Found' : '❌ Missing');

  const html = '🤖 <b>Money Street Bot</b>\n\n✅ ทดสอบการเชื่อมต่อสำเร็จ!\n\n<i>พร้อมส่งสัญญาณเทรดให้คุณแล้วครับ</i>';
  const success = await sendTelegram(html);

  if (success) {
    console.log('✅ Telegram notification sent successfully!');
  } else {
    console.log('❌ Failed to send Telegram notification.');
  }
}

testNotify();
