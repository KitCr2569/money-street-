import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 7000)
    );

    const settings = await Promise.race([
      db.query.userSettings.findFirst({
        where: eq(userSettings.id, 1),
      }),
      timeoutPromise
    ]) as any;

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
    // Return default settings on error
    return NextResponse.json({
      watchlistRange: '6mo',
      watchlistSortKey: 'change',
      watchlistSortAsc: false,
      watchlistFilter: 'all',
      showTags: true,
      homeWatchlistId: '',
      watchlistShowAll: false,
      error: 'Database not configured - using default settings'
    });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 7000)
    );

    const body = await request.json();
    await Promise.race([
      db
        .insert(userSettings)
        .values({ id: 1, ...body, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({
          target: userSettings.id,
          set: { ...body, updatedAt: new Date().toISOString() },
        }),
      timeoutPromise
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Settings POST error:', err);
    return NextResponse.json({ error: 'Failed to save - database timeout' }, { status: 500 });
  }
}
