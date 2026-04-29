import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requirePro } from '@/lib/api-auth';

export interface NewsDigestHistoryItem {
  filename: string;
  title: string;
  source: string;
  date: string;
  time: string;
  pubDate: string;
  link: string;
  symbols: string[];
  summary: string;
}

export async function GET() {
  const { error } = await requirePro();
  if (error) return error;

  try {
    const dir = path.join(process.cwd(), 'data', 'news-digests');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    const items: NewsDigestHistoryItem[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      if (lines[0] === '---') {
        const endIdx = lines.indexOf('---', 1);
        if (endIdx > 0) {
          const meta: Record<string, string> = {};
          for (let i = 1; i < endIdx; i++) {
            const match = lines[i].match(/^(\w+):\s*(.+)$/);
            if (match) meta[match[1]] = match[2].replace(/^"|"$/g, '');
          }

          // Extract summary — text after "### สรุปข่าว" until next "###"
          let summary = '';
          const body = lines.slice(endIdx + 1).join('\n');
          const summaryMatch = body.match(/###\s*สรุปข่าว\s*\n([\s\S]*?)(?=\n###|$)/);
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          }

          if (meta.date && meta.time) {
            items.push({
              filename: file,
              title: (meta.title ?? '').replace(/\\"/g, '"'),
              source: meta.source ?? '',
              date: meta.date,
              time: meta.time,
              pubDate: meta.pubDate ?? '',
              link: meta.link ?? '',
              symbols: meta.symbols ? meta.symbols.split(',').filter(Boolean) : [],
              summary,
            });
          }
        }
      }
    }

    items.sort((a, b) => {
      const aKey = `${a.date}_${a.time}`;
      const bKey = `${b.date}_${b.time}`;
      return bKey.localeCompare(aKey);
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('News history list error:', error);
    return NextResponse.json({ error: 'Failed to list news digests' }, { status: 500 });
  }
}
