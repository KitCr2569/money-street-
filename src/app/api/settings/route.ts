import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, 1),
    });

    if (!settings) {
      return NextResponse.json({
        watchlistRange: '6mo',
        watchlistSortKey: 'change',
        watchlistSortAsc: false,
        watchlistFilter: 'all',
        showTags: true,
        homeWatchlistId: '',
        watchlistShowAll: false,
      });
    }

    return NextResponse.json({
      watchlistRange: settings.watchlistRange,
      watchlistSortKey: settings.watchlistSortKey,
      watchlistSortAsc: settings.watchlistSortAsc,
      watchlistFilter: settings.watchlistFilter,
      showTags: settings.showTags,
      homeWatchlistId: settings.homeWatchlistId,
      watchlistShowAll: settings.watchlistShowAll,
    });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    await db
      .insert(userSettings)
      .values({ id: 1, ...body, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: userSettings.id,
        set: { ...body, updatedAt: new Date().toISOString() },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Settings POST error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
