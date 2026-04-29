import { NextRequest, NextResponse } from 'next/server';
import { getQuotes } from '@/lib/yahoo';
import { validateSymbols } from '@/lib/validate';

// Server-side cache — shared across all users
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 1000; // 60s

export async function GET(request: NextRequest) {
  try {
    const parsed = validateSymbols(request.nextUrl.searchParams.get('symbols'));

    if (!parsed) {
      return NextResponse.json({ error: 'Invalid or missing symbols parameter' }, { status: 400 });
    }

    const key = [...parsed].sort().join(',');
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const quotes = await getQuotes(parsed);
    cache.set(key, { data: quotes, ts: Date.now() });
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
