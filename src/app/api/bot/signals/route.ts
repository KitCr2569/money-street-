import { NextResponse } from 'next/server';
import { db } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Add timeout to prevent hanging (optimized for Mumbai database)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 7000)
    );

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '100');
    const signalType = searchParams.get('type'); // 'strong_buy' | 'buy' etc.

    let signals;
    if (signalType) {
      signals = await Promise.race([
        db.query.botSignals.findMany({
          where: (s: any, { eq }: any) => eq(s.signalType, signalType),
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        }),
        timeoutPromise
      ]) as any;
    } else {
      signals = await Promise.race([
        db.query.botSignals.findMany({
          orderBy: (s: any) => [desc(s.createdAt)],
          limit,
        }),
        timeoutPromise
      ]) as any;
    }


    // Parse factors JSON
    const parsed = signals.map((s: any) => ({
      ...s,
      factors: JSON.parse(s.factors),
    }));

    return NextResponse.json({ signals: parsed });
  } catch (err) {
    console.error('Signals GET error:', err);
    return NextResponse.json({ 
      signals: [],
      error: 'Database not configured - please set TURSO_DATABASE_URL in Vercel environment variables'
    });
  }
}
