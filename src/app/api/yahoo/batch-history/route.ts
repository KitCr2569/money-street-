import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/yahoo';
import { calculateSupportResistance } from '@/lib/support-resistance';
import { calculateIndicators } from '@/lib/indicators';
import { validateSymbols } from '@/lib/validate';
import type { HistoryResponse } from '@/types';

// Server-side cache — shared across all users
const cache = new Map<string, { data: HistoryResponse; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const symbols = validateSymbols(request.nextUrl.searchParams.get('symbols'));
    const range = request.nextUrl.searchParams.get('range') ?? '6mo';

    if (!symbols) {
      return NextResponse.json({ error: 'Invalid or missing symbols' }, { status: 400 });
    }

    const results: Record<string, HistoryResponse> = {};

    for (const symbol of symbols) {
      const cacheKey = `${symbol}:${range}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        results[symbol] = cached.data;
        continue;
      }

      try {
        const candles = await getHistory(symbol, range);
        if (candles.length > 0) {
          const levels = calculateSupportResistance(candles);
          const indicators = calculateIndicators(candles);
          const entry = { symbol, candles, levels, indicators };
          results[symbol] = entry;
          cache.set(cacheKey, { data: entry, ts: Date.now() });
        }
      } catch (err) {
        console.error(`batch-history error for ${symbol}:`, err);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Batch history API error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch history' }, { status: 500 });
  }
}
