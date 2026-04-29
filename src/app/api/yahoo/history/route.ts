import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/yahoo';
import { calculateSupportResistance } from '@/lib/support-resistance';
import { calculateIndicators } from '@/lib/indicators';
import { validateSymbol } from '@/lib/validate';
import type { HistoryResponse } from '@/types';

// Server-side cache — shared across all users
const cache = new Map<string, { data: HistoryResponse; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    const symbol = validateSymbol(request.nextUrl.searchParams.get('symbol'));
    const range = request.nextUrl.searchParams.get('range') ?? '6mo';

    if (!symbol) {
      return NextResponse.json({ error: 'Invalid or missing symbol' }, { status: 400 });
    }

    const key = `${symbol}_${range}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const candles = await getHistory(symbol, range);
    const levels = calculateSupportResistance(candles);
    const indicators = calculateIndicators(candles);

    const response: HistoryResponse = { symbol, candles, levels, indicators };
    cache.set(key, { data: response, ts: Date.now() });
    return NextResponse.json(response);
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
