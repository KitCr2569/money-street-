import { NextResponse } from 'next/server';
import { runUnifiedBotCycle } from '@/lib/bot/runner-logic';

/**
 * Auto-scan cron endpoint
 * Call this via external cron (e.g., cron-job.org)
 * URL: POST /api/bot/cron
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.BOT_CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the unified bot cycle
    const result = await runUnifiedBotCycle();

    return NextResponse.json(result);
  } catch (err) {
    console.error('Bot cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 }
    );
  }
}

// Support GET for testing if secret matches in query
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (process.env.BOT_CRON_SECRET && secret !== process.env.BOT_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return POST(request);
}

