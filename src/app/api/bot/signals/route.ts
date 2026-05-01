import { NextResponse } from 'next/server';
import { db } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '100');
    const signalType = searchParams.get('type'); // 'strong_buy' | 'buy' etc.

    let signals;
    if (signalType) {
      signals = await db.query.botSignals.findMany({
        where: (s: any, { eq }: any) => eq(s.signalType, signalType),
        orderBy: (s: any) => [desc(s.createdAt)],
        limit,
      });
    } else {
      signals = await db.query.botSignals.findMany({
        orderBy: (s) => [desc(s.createdAt)],
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
    return NextResponse.json({ signals: [] });
  }
}
