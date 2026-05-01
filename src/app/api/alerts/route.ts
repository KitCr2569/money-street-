import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { priceAlerts } from '@/db/schema';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const alerts = await db.query.priceAlerts.findMany({
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });


    return NextResponse.json(
      alerts.map((a: any) => ({
        id: a.id,
        symbol: a.symbol,

        targetPrice: a.targetPrice,
        direction: a.direction,
        source: a.source,
        createdAt: a.createdAt,
        triggered: a.triggered,
        triggeredAt: a.triggeredAt ?? undefined,
        dismissed: a.dismissed,
      }))
    );
  } catch (err) {
    console.error('Alerts GET error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { alerts } = body as {
      alerts: Array<{
        id: string;
        symbol: string;
        targetPrice: number;
        direction: 'above' | 'below';
        source: 'support' | 'resistance' | 'custom';
        createdAt: string;
        triggered: boolean;
        triggeredAt?: string;
        dismissed: boolean;
      }>;
    };

    // Replace all alerts
    await db.delete(priceAlerts);

    for (const a of alerts) {
      await db.insert(priceAlerts).values({
        id: a.id,
        symbol: a.symbol,
        targetPrice: a.targetPrice,
        direction: a.direction,
        source: a.source,
        triggered: a.triggered,
        triggeredAt: a.triggeredAt ?? null,
        dismissed: a.dismissed,
        createdAt: a.createdAt,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Alerts POST error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
