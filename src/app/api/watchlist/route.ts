import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/db';
import { watchlistLists, watchlistItems, userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const db = await getDB();
    if (!db || !db.query) {
      throw new Error('Database not initialized');
    }
    
    const lists = await db.query.watchlistLists.findMany({
      orderBy: (t: any, { asc }: any) => [asc(t.createdAt)],
    });

    const items = await db.query.watchlistItems.findMany();

    // Get activeListId from settings
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, 1),
    });

    const result = lists.map((list: any) => ({
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      items: items
        .filter((item: any) => item.listId === list.id)
        .map((item: any) => ({
          symbol: item.symbol,
          addedAt: item.addedAt,
        })),
      pinnedSymbols: items
        .filter((item: any) => item.listId === list.id && item.pinned)
        .map((item: any) => item.symbol),

    }));

    return NextResponse.json({
      lists: result,
      activeListId: settings?.activeListId || (result[0]?.id ?? ''),
    });
  } catch (err) {
    console.error('Watchlist GET error:', err);
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { lists, activeListId } = body as {
      lists: Array<{
        id: string;
        name: string;
        items: Array<{ symbol: string; addedAt: string }>;
        pinnedSymbols?: string[];
        createdAt: string;
      }>;
      activeListId: string;
    };

    // Delete all existing lists and items
    await db.delete(watchlistItems);
    await db.delete(watchlistLists);

    // Insert new lists and items
    for (const list of lists) {
      await db.insert(watchlistLists).values({
        id: list.id,
        name: list.name,
        createdAt: list.createdAt,
      });

      const pinned = new Set(list.pinnedSymbols ?? []);
      for (const item of list.items) {
        await db.insert(watchlistItems).values({
          listId: list.id,
          symbol: item.symbol,
          pinned: pinned.has(item.symbol),
          addedAt: item.addedAt,
        });
      }
    }

    // Save activeListId to settings
    await db
      .insert(userSettings)
      .values({ id: 1, activeListId })
      .onConflictDoUpdate({
        target: userSettings.id,
        set: { activeListId, updatedAt: new Date().toISOString() },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Watchlist POST error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
