import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import fs from 'node:fs';
import path from 'node:path';
import type { NewsArticle } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data/news/articles.json');

function readArticles(): NewsArticle[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeArticles(articles: NewsArticle[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

// GET: public — anyone can read MoneyStreet news
export async function GET(request: NextRequest) {
  const articles = readArticles();
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (symbol) {
    const filtered = articles.filter((a: any) =>
      a.relatedSymbols.some((s: string) => s.toUpperCase() === symbol.toUpperCase())
    );

    return NextResponse.json(filtered);
  }

  return NextResponse.json(articles);
}

// POST: admin only — create a new article
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { title, description, relatedSymbols, sentiment, imageUrl } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'title and description required' }, { status: 400 });
    }

    const article: NewsArticle = {
      title,
      description,
      link: '',
      pubDate: new Date().toISOString(),
      source: 'MoneyStreet',
      relatedSymbols: relatedSymbols ?? [],
      sentiment: sentiment ?? 'neutral',
      provider: 'moneystreet',
      imageUrl: imageUrl ?? undefined,
    };

    const articles = readArticles();
    articles.unshift(article); // newest first
    writeArticles(articles);

    return NextResponse.json(article);
  } catch (err) {
    console.error('MoneyStreet news POST error:', err);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
