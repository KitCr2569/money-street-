import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/db';
import { portfolioHoldings, portfolioLots } from '@/db/schema';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const db = await getDB();
    if (!db || !db.query) {
      throw new Error('Database not initialized');
    }
    
    const holdings = await db.query.portfolioHoldings.findMany();

    const lots = await db.query.portfolioLots.findMany();

    const result = holdings.map((h: any) => ({
      symbol: h.symbol,
      lots: lots
        .filter((l: any) => l.holdingId === h.id)
        .map((l: any) => ({
          id: l.id,
          shares: l.shares,
          price: l.price,
          date: l.date,
        })),
    }));

    return NextResponse.json({ holdings: result });
  } catch (err) {
    console.error('Portfolio GET error:', err);
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { holdings } = body as {
      holdings: Array<{
        symbol: string;
        lots: Array<{ id?: string; shares: number; price: number; date: string }>;
      }>;
    };

    // Get DB for operations
    const db = await getDB();
    if (!db || !db.query) {
      throw new Error('Database not initialized');
    }
    
    // Delete all existing
    await db.delete(portfolioLots);
    await db.delete(portfolioHoldings);

    // Insert new
    for (const h of holdings) {
      const holdingId = crypto.randomUUID();
      await db.insert(portfolioHoldings).values({
        id: holdingId,
        symbol: h.symbol,
      });

      for (const lot of h.lots) {
        await db.insert(portfolioLots).values({
          holdingId,
          shares: lot.shares,
          price: lot.price,
          date: lot.date,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Portfolio POST error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
