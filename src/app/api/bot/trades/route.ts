import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { botTrades } from '@/db/schema';
import { closeTrade } from '@/lib/bot/paper-trader';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  // Detect Vercel environment (outside try block for catch access)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'open' | 'closed' | 'stopped' | null (all)
    const limit = parseInt(searchParams.get('limit') ?? '50');

    // Initialize DB connection
    const db = await getDB();
    if (!db || !db.query) {
      throw new Error('Database not initialized');
    }

    let trades;
    if (status) {
      trades = await db.query.botTrades.findMany({
          where: (t: any, { eq: e }: any) => e(t.status, status),
          orderBy: (t: any, { desc }: any) => [desc(t.entryAt)],
          limit,
        });
    } else {
      trades = await db.query.botTrades.findMany({
          orderBy: (t: any) => [desc(t.entryAt)],
          limit,
        });
    }


    return NextResponse.json({ trades });
  } catch (err) {
    console.error('Bot trades GET error:', err);
    // Return empty trades with note for graceful UI display
    return NextResponse.json({ 
      trades: [],
      note: isVercel 
        ? 'Database loading... Please wait or check TURSO_DATABASE_URL'
        : 'Local mode: No trades yet - click "Scan + Auto Trade" to start'
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
