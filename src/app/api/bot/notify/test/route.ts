import { NextResponse } from 'next/server';
import { sendTelegram, sendLineNotify } from '@/lib/bot/notifications';

/** Test notification channels */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { channel = 'all', message } = body as {
      channel?: 'telegram' | 'line' | 'all';
      message?: string;
    };

    const testMsg = message ?? '🤖 Trading Bot — ทดสอบการแจ้งเตือน!\n\n✅ ระบบแจ้งเตือนทำงานปกติ';
    const results: Record<string, boolean | string> = {};

    if (channel === 'telegram' || channel === 'all') {
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const html = '🤖 <b>Trading Bot</b> — ทดสอบการแจ้งเตือน!\n\n✅ ระบบแจ้งเตือนทำงานปกติ';
        results.telegram = await sendTelegram(html);
      } else {
        results.telegram = 'No TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID configured';
      }
    }

    if (channel === 'line' || channel === 'all') {
      if (process.env.LINE_NOTIFY_TOKEN) {
        results.line = await sendLineNotify(testMsg);
      } else {
        results.line = 'No LINE_NOTIFY_TOKEN configured';
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
