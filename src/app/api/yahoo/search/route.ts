import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/lib/yahoo';
import { validateSearchQuery } from '@/lib/validate';

export async function GET(request: NextRequest) {
  try {
    const q = validateSearchQuery(request.nextUrl.searchParams.get('q'));

    if (!q) {
      return NextResponse.json({ error: 'Invalid or missing q parameter' }, { status: 400 });
    }

    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 });
  }
}
