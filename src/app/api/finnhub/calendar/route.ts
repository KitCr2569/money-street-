import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateDate } from '@/lib/validate';
import type { CalendarEvent } from '@/types';

const CACHE_DIR = path.join(process.cwd(), 'data', 'calendar-cache');

interface CacheFile {
  updatedAt: string;
  from: string;
  to: string;
  events: CalendarEvent[];
}

export async function GET(request: NextRequest) {
  try {
    const from = validateDate(request.nextUrl.searchParams.get('from'));
    const to = validateDate(request.nextUrl.searchParams.get('to'));

    if (!from || !to) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // Determine which monthly cache files to read
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T23:59:59');
    const months = new Set<string>();

    const d = new Date(fromDate);
    while (d <= toDate) {
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      d.setMonth(d.getMonth() + 1);
    }

    const allEvents: CalendarEvent[] = [];

    for (const key of months) {
      const cacheFile = path.join(CACHE_DIR, `${key}.json`);
      try {
        const raw = await fs.readFile(cacheFile, 'utf-8');
        const cache: CacheFile = JSON.parse(raw);
        // Filter events within the requested date range
        for (const ev of cache.events) {
          if (ev.date >= from && ev.date <= to) {
            allEvents.push(ev);
          }
        }
      } catch {
        // Cache file doesn't exist — return empty for this month
      }
    }

    allEvents.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(allEvents, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
