import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export interface ArticleMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  author: string;
  image?: string;
  excerpt: string;
  filename: string;
}

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: unknown = line.slice(idx + 1).trim();
    // Parse array [a, b, c]
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim());
    }
    meta[key] = val;
  }

  return { meta, body: match[2] };
}

function getArticles(): ArticleMeta[] {
  const dir = path.join(process.cwd(), 'data', 'articles');
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse();
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { meta } = parseFrontmatter(content);

    articles.push({
      slug: (meta.slug as string) || file.replace('.md', ''),
      title: (meta.title as string) || file,
      category: (meta.category as string) || 'บทความ',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      date: (meta.date as string) || '',
      author: (meta.author as string) || 'Money Street',
      image: meta.image as string | undefined,
      excerpt: (meta.excerpt as string) || '',
      filename: file,
    });
  }

  return articles;
}

// GET /api/articles — list all or get single by ?slug=xxx
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (slug) {
    const dir = path.join(process.cwd(), 'data', 'articles');
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const { meta, body } = parseFrontmatter(content);
      const fileSlug = (meta.slug as string) || file.replace('.md', '');
      if (fileSlug === slug) {
        return NextResponse.json({
          slug: fileSlug,
          title: (meta.title as string) || file,
          category: (meta.category as string) || 'บทความ',
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          date: (meta.date as string) || '',
          author: (meta.author as string) || 'Money Street',
          image: meta.image as string | undefined,
          excerpt: (meta.excerpt as string) || '',
          content: body.trim(),
        });
      }
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(getArticles());
}
