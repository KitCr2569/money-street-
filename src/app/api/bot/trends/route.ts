import { NextResponse } from 'next/server';
import { discoverSymbolsFromTrend, TRENDING_CATEGORIES } from '@/lib/bot/trends-discovery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (keyword) {
      const discovery = await discoverSymbolsFromTrend(keyword);
      return NextResponse.json(discovery);
    }

    // Default: return categories
    return NextResponse.json({ categories: TRENDING_CATEGORIES });
  } catch (err) {
    console.error('Trends API error:', err);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keywords } = body as { keywords: string[] };

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'Keywords array required' }, { status: 400 });
    }

    const results = await Promise.all(
      keywords.map((k: string) => discoverSymbolsFromTrend(k))
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Trends API error:', err);
    return NextResponse.json({ error: 'Failed to process trends' }, { status: 500 });
  }
}
