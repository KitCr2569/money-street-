import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requirePro } from '@/lib/api-auth';
import { validateMdFilename } from '@/lib/validate';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { error } = await requirePro();
  if (error) return error;

  try {
    const { filename } = await params;

    const sanitized = validateMdFilename(path.basename(filename));
    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'analyses', sanitized);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('History read error:', error);
    return NextResponse.json({ error: 'Failed to read analysis' }, { status: 500 });
  }
}
