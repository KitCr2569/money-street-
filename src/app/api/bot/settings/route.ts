import { NextResponse } from 'next/server';
import { db } from '@/db';
import { botSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    let settings = await db.query.botSettings.findFirst({
      where: (s, { eq: e }) => e(s.id, 1),
    });

    if (!settings) {
      await db.insert(botSettings).values({ id: 1 });
      settings = await db.query.botSettings.findFirst({
        where: (s, { eq: e }) => e(s.id, 1),
      });
    }

    return NextResponse.json({
      ...settings,
      scanSymbols: JSON.parse(settings?.scanSymbols ?? '[]'),
    });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      enabled, initialCapital, maxPositionPct, maxDrawdownPct,
      maxOpenPositions, riskRewardMinimum, trailingStopPct,
      scanIntervalMinutes, scanSymbols, autoTrade, useAiConfirm,
    } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (enabled !== undefined) updates.enabled = enabled;
    if (initialCapital !== undefined) updates.initialCapital = initialCapital;
    if (maxPositionPct !== undefined) updates.maxPositionPct = maxPositionPct;
    if (maxDrawdownPct !== undefined) updates.maxDrawdownPct = maxDrawdownPct;
    if (maxOpenPositions !== undefined) updates.maxOpenPositions = maxOpenPositions;
    if (riskRewardMinimum !== undefined) updates.riskRewardMinimum = riskRewardMinimum;
    if (trailingStopPct !== undefined) updates.trailingStopPct = trailingStopPct;
    if (scanIntervalMinutes !== undefined) updates.scanIntervalMinutes = scanIntervalMinutes;
    if (scanSymbols !== undefined) updates.scanSymbols = JSON.stringify(scanSymbols);
    if (autoTrade !== undefined) updates.autoTrade = autoTrade;
    if (useAiConfirm !== undefined) updates.useAiConfirm = useAiConfirm;

    // Ensure row exists
    const existing = await db.query.botSettings.findFirst({
      where: (s, { eq: e }) => e(s.id, 1),
    });
    if (!existing) {
      await db.insert(botSettings).values({ id: 1, ...updates } as typeof botSettings.$inferInsert);
    } else {
      await db.update(botSettings).set(updates).where(eq(botSettings.id, 1));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
