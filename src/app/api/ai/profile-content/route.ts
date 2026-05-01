import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requirePro } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { error } = await requirePro();
  if (error) return error;

  const filename = request.nextUrl.searchParams.get('filename');
  const symbol = request.nextUrl.searchParams.get('symbol');
  const profilesDir = path.join(process.cwd(), 'data', 'profiles');

  // If symbol provided, find latest profile for that symbol
  if (symbol && !filename) {
    const sym = symbol.toUpperCase();
    if (!fs.existsSync(profilesDir)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const files = fs.readdirSync(profilesDir)
      .filter((f: string) => f.startsWith(`${sym}_profile_`) && f.endsWith('.md'))

      .sort()
      .reverse();
    if (files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const content = fs.readFileSync(path.join(profilesDir, files[0]), 'utf-8');
    return NextResponse.json({ content });
  }

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename or symbol' }, { status: 400 });
  }

  const sanitized = path.basename(filename);
  if (!sanitized.endsWith('.md')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const filePath = path.join(profilesDir, sanitized);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return NextResponse.json({ content });
}
