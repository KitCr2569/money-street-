import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  // Detect Vercel environment (outside try block for catch access)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '100');
    const signalType = searchParams.get('type'); // 'strong_buy' | 'buy' etc.

    // Initialize DB connection
    const db = await getDB();
    if (!db || !db.query) {
      throw new Error('Database not initialized');
    }

    let signals;
    if (signalType) {
      signals = await db.query.botSignals.findMany({
          where: (s: any, { eq }: any) => eq(s.signalType, signalType),
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        });
    } else {
      signals = await db.query.botSignals.findMany({
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        });
    }


    // Parse factors JSON
    const parsed = signals.map((s: any) => ({
      ...s,
      factors: JSON.parse(s.factors),
    }));

    return NextResponse.json({ signals: parsed });
  } catch (err) {
    console.error('Signals GET error:', err);
    // Return empty signals with note for graceful UI display
    return NextResponse.json({ 
      signals: [],
      note: isVercel 
        ? 'Database loading... Please wait or check TURSO_DATABASE_URL'
        : 'Local mode: No signals yet - click "Scan Stocks" to start'
    });
  }
}
