import { NextResponse } from 'next/server';
import { db } from '@/db';
import { botTrades } from '@/db/schema';
import { closeTrade } from '@/lib/bot/paper-trader';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Add timeout to prevent hanging (optimized for reliability)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'open' | 'closed' | 'stopped' | null (all)
    const limit = parseInt(searchParams.get('limit') ?? '50');

    let trades;
    if (status) {
      trades = await Promise.race([
        db.query.botTrades.findMany({
          where: (t: any, { eq: e }: any) => e(t.status, status),
          orderBy: (t: any, { desc }: any) => [desc(t.entryAt)],
          limit,
        }),
        timeoutPromise
      ]) as any;
    } else {
      trades = await Promise.race([
        db.query.botTrades.findMany({
          orderBy: (t: any) => [desc(t.entryAt)],
          limit,
        }),
        timeoutPromise
      ]) as any;
    }


    return NextResponse.json({ trades });
  } catch (err) {
    console.error('Bot trades GET error:', err);
    return NextResponse.json({ 
      trades: [],
      error: 'Database not configured - please set TURSO_DATABASE_URL in Vercel environment variables'
    });
  }
}

// Manual close trade
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tradeId, exitPrice } = body as { tradeId: string; exitPrice: number };

    if (!tradeId || !exitPrice) {
      return NextResponse.json({ error: 'tradeId and exitPrice required' }, { status: 400 });
    }

    const result = await closeTrade(tradeId, exitPrice, 'manual', 'Manual close by user');
    if (!result) {
      return NextResponse.json({ error: 'Trade not found or already closed' }, { status: 404 });
    }

    return NextResponse.json({ trade: result });
  } catch (err) {
    console.error('Bot trades POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to close trade' },
      { status: 500 }
    );
  }
}
