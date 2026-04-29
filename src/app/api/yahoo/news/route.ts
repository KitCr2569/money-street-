import { NextRequest, NextResponse } from 'next/server';
import type { NewsArticle, NewsSentiment } from '@/types';

interface CacheEntry {
  data: NewsArticle[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ── Yahoo RSS helpers ──

function extractImageUrl(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return match?.[1];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function parseRssItems(xml: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
      ?? content.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const link = content.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
    const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    const descRaw = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
      ?? content.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
    const source = content.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? 'Yahoo Finance';

    const imageUrl = extractImageUrl(descRaw);
    const description = stripHtml(descRaw).slice(0, 300);

    const symbolMatches = title.match(/\(([A-Z]{1,5})\)|\$([A-Z]{1,5})/g) ?? [];
    const relatedSymbols = symbolMatches.map((s) => s.replace(/[()$]/g, ''));

    const cleanTitle = stripHtml(title);
    items.push({ title: cleanTitle, link, pubDate, description, source, relatedSymbols, imageUrl, provider: 'yahoo', sentiment: analyzeSentiment(cleanTitle, description) });
  }

  return items;
}

async function fetchYahooNews(symbol?: string): Promise<NewsArticle[]> {
  const url = symbol
    ? `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(symbol)}`
    : 'https://finance.yahoo.com/news/rssindex';

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoneyStreet/1.0)' },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Yahoo RSS failed: ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml);
}

// ── Finnhub helpers ──

interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// ── Keyword-based sentiment analysis ──

const POSITIVE_KEYWORDS = [
  'surge', 'surges', 'soar', 'soars', 'jump', 'jumps', 'rally', 'rallies', 'gain', 'gains',
  'rise', 'rises', 'climb', 'climbs', 'boost', 'record high', 'all-time high', 'beat', 'beats',
  'upgrade', 'upgraded', 'outperform', 'bullish', 'profit', 'growth', 'strong', 'positive',
  'recover', 'recovery', 'breakout', 'upbeat', 'optimism', 'dividend', 'buyback', 'buy',
];

const NEGATIVE_KEYWORDS = [
  'fall', 'falls', 'drop', 'drops', 'crash', 'plunge', 'plunges', 'sink', 'sinks', 'tumble',
  'decline', 'declines', 'slip', 'slips', 'lose', 'loss', 'losses', 'cut', 'cuts', 'slash',
  'downgrade', 'downgraded', 'bearish', 'selloff', 'sell-off', 'warning', 'fear', 'fears',
  'risk', 'layoff', 'layoffs', 'recall', 'investigation', 'lawsuit', 'fraud', 'miss', 'misses',
  'weak', 'concern', 'concerns', 'recession', 'inflation', 'tariff', 'tariffs', 'war', 'attack',
];

function analyzeSentiment(title: string, summary: string): NewsSentiment {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) score++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) score--;
  }
  if (score >= 1) return 'positive';
  if (score <= -1) return 'negative';
  return 'neutral';
}

async function fetchFinnhubNews(symbol?: string): Promise<NewsArticle[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  let url: string;
  if (symbol) {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`;
  } else {
    url = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub failed: ${res.status}`);

  const items: FinnhubNewsItem[] = await res.json();

  return items.slice(0, 50).map((item) => {
    const relatedSymbols = item.related
      ? item.related.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const desc = item.summary?.slice(0, 300) ?? '';

    return {
      title: item.headline,
      link: item.url,
      pubDate: new Date(item.datetime * 1000).toUTCString(),
      description: desc,
      source: item.source,
      relatedSymbols,
      imageUrl: item.image || undefined,
      sentiment: analyzeSentiment(item.headline, desc),
      provider: 'finnhub' as const,
    };
  });
}

// ── Main handler ──

async function fetchNews(symbol?: string, provider?: string): Promise<NewsArticle[]> {
  const cacheKey = `${provider ?? 'all'}_${symbol || '__general__'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let articles: NewsArticle[];

  if (provider === 'yahoo') {
    articles = await fetchYahooNews(symbol);
  } else if (provider === 'finnhub') {
    articles = await fetchFinnhubNews(symbol);
  } else {
    // Fetch both sources in parallel, merge and sort by date
    const [yahoo, finnhub] = await Promise.allSettled([
      fetchYahooNews(symbol),
      fetchFinnhubNews(symbol),
    ]);

    const yahooArticles = yahoo.status === 'fulfilled' ? yahoo.value : [];
    const finnhubArticles = finnhub.status === 'fulfilled' ? finnhub.value : [];

    articles = [...yahooArticles, ...finnhubArticles].sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }

  cache.set(cacheKey, { data: articles, timestamp: Date.now() });
  return articles;
}

export async function GET(request: NextRequest) {
  try {
    const rawSymbol = request.nextUrl.searchParams.get('symbol');
    const symbol = rawSymbol ? rawSymbol.trim().toUpperCase() : undefined;
    if (rawSymbol && (!symbol || !/^[A-Z0-9.,^= ]{1,100}$/.test(symbol))) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    const provider = request.nextUrl.searchParams.get('provider') || undefined;
    const articles = await fetchNews(symbol, provider);
    return NextResponse.json(articles);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
