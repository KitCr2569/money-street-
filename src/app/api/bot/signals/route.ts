import { NextResponse } from 'next/server';
import { db } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  // Detect Vercel environment (outside try block for catch access)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '100');
    const signalType = searchParams.get('type'); // 'strong_buy' | 'buy' etc.

    const DB_TIMEOUT = isVercel ? 8000 : 30000; // 8s for Vercel, 30s for local

    let signalsQuery;
    if (signalType) {
      signalsQuery = db.query.botSignals.findMany({
          where: (s: any, { eq }: any) => eq(s.signalType, signalType),
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        });
    } else {
      signalsQuery = db.query.botSignals.findMany({
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        });
    }

    // Add timeout for database query
    const signals = await Promise.race([
      signalsQuery,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT)
      )
    ]) as any[];


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
