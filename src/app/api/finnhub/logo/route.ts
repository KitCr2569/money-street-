import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const CACHE_FILE = path.join(process.cwd(), 'data', 'logo-cache.json');

type LogoCache = Record<string, { url: string; fetchedAt: string }>;
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — logos rarely change

async function readCache(): Promise<LogoCache> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCache(cache: LogoCache) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function fetchLogo(symbol: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
  );
  if (!res.ok) return '';
  const data = await res.json();
  return data.logo || '';
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'Missing symbols param' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
  }

  const symList = symbols.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);

  const cache = await readCache();
  const now = Date.now();
  const result: Record<string, string> = {};
  const toFetch: string[] = [];

  // Check cache
  for (const sym of symList) {
    const entry = cache[sym];
    if (entry && now - new Date(entry.fetchedAt).getTime() < CACHE_TTL) {
      result[sym] = entry.url;
    } else {
      toFetch.push(sym);
    }
  }

  // Fetch missing logos (sequential to respect rate limits)
  if (toFetch.length > 0) {
    for (const sym of toFetch) {
      const url = await fetchLogo(sym, apiKey);
      cache[sym] = { url, fetchedAt: new Date().toISOString() };
      result[sym] = url;
    }
    // Persist updated cache
    await writeCache(cache).catch(() => {});
  }

  return NextResponse.json(result);
}
