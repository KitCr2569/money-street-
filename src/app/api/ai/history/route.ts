import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requirePro } from '@/lib/api-auth';

export interface AnalysisHistoryItem {
  filename: string;
  symbol: string;
  date: string;
  time: string;
  range: string;
  mode: 'single' | 'dashboard';
  strategy: string;
}

function parseFilename(filename: string): AnalysisHistoryItem | null {
  const base = filename.replace(/\.md$/, '');
  const parts = base.split('_');
  if (parts.length < 4) return null;

  const range = parts[parts.length - 1];
  const time = parts[parts.length - 2];
  const date = parts[parts.length - 3];
  const symbolParts = parts.slice(0, parts.length - 3);
  const symbol = symbolParts.join('_');

  if (!symbol || !date || !time || !range) return null;

  const mode = symbol.toLowerCase() === 'watchlist' ? 'dashboard' : 'single';
  return { filename, symbol, date, time, range, mode, strategy: '' };
}

export async function GET(request: Request) {
  const { error } = await requirePro();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filterSymbol = searchParams.get('symbol')?.toUpperCase() ?? null;

  try {
    const dir = path.join(process.cwd(), 'data', 'analyses');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.md'));
    const items: AnalysisHistoryItem[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 10);

      let item: AnalysisHistoryItem | null = null;

      if (lines[0] === '---') {
        const endIdx = lines.indexOf('---', 1);
        if (endIdx > 0) {
          const meta: Record<string, string> = {};
          for (let i = 1; i < endIdx; i++) {
            const match = lines[i].match(/^(\w+):\s*(.+)$/);
            if (match) meta[match[1]] = match[2];
          }
          if (meta.symbol && meta.date) {
            item = {
              filename: file,
              symbol: meta.symbol,
              date: meta.date,
              time: meta.time ?? '000000',
              range: meta.range ?? meta.type ?? '',
              mode: (meta.mode as 'single' | 'dashboard') ?? 'single',
              strategy: meta.strategy ?? meta.type ?? '',
            };
          }
        }
      }

      if (!item) {
        item = parseFilename(file);
      }

      if (item) items.push(item);
    }

    const filtered = filterSymbol ? items.filter((i: any) => i.symbol.toUpperCase() === filterSymbol) : items;

    filtered.sort((a, b) => {
      const aKey = `${a.date}_${a.time}`;
      const bKey = `${b.date}_${b.time}`;
      return bKey.localeCompare(aKey);
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('History list error:', error);
    return NextResponse.json({ error: 'Failed to list analyses' }, { status: 500 });
  }
}
