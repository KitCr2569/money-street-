import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/api-auth';
import { MAX_PROMPT_SIZE } from '@/lib/validate';

export type TradingStrategy = 'day' | 'week' | 'month' | 'long';

export interface NewsDigestRequest {
  title: string;
  description: string;
  source: string;
  pubDate: string;
  link: string;
  relatedSymbols: string[];
  strategy: TradingStrategy;
}

const strategyLabels: Record<TradingStrategy, string> = {
  day: 'เทรดรายวัน (Day Trade) — สนใจผลกระทบระยะ 1-2 วัน, จุดเข้า/ออกที่ชัดเจน, ความผันผวนระยะสั้น',
  week: 'เทรดรายสัปดาห์ (Swing Trade) — สนใจแนวโน้ม 1-2 สัปดาห์, แนวรับ/แนวต้าน, โมเมนตัม',
  month: 'เทรดรายเดือน (Position Trade) — สนใจผลกระทบ 1-3 เดือน, งบการเงิน, แนวโน้มอุตสาหกรรม',
  long: 'ลงทุนระยะยาว (Long-term Invest) — สนใจพื้นฐานบริษัท, การเติบโตระยะ 1 ปีขึ้นไป, ปัจจัยมหภาค',
};

function buildPrompt(news: NewsDigestRequest): string {
  const strategyCtx = strategyLabels[news.strategy];

  return `คุณเป็นนักวิเคราะห์ข่าวหุ้นที่เชี่ยวชาญ ช่วยแปลและสรุปข่าวนี้เป็นภาษาไทยให้กระชับ เข้าใจง่าย เหมาะกับมือใหม่ที่เพิ่งเริ่มลงทุน

## กลยุทธ์ของผู้อ่าน
${strategyCtx}

## ข่าวต้นฉบับ
- หัวข้อ: ${news.title}
- เนื้อหา: ${news.description}
- แหล่งที่มา: ${news.source}
- วันที่: ${news.pubDate}
${news.relatedSymbols.length > 0 ? `- หุ้นที่เกี่ยวข้อง: ${news.relatedSymbols.join(', ')}` : ''}

## รูปแบบที่ต้องการ (ตอบเป็น Markdown)

### สรุปข่าว
(สรุปข่าวเป็นภาษาไทย 2-3 ประโยค กระชับ เข้าใจง่าย)

### ผลกระทบต่อหุ้น
(วิเคราะห์ผลกระทบโดยเน้นมุมมองตามกลยุทธ์ของผู้อ่าน ใส่ป้ายกำกับ 🟢 มีโอกาสขึ้น / 🔴 มีโอกาสลง / 🟡 ไม่แน่นอน ให้แต่ละตัว พร้อมเหตุผลสั้นๆ)

### แนะนำสำหรับกลยุทธ์นี้
(ให้คำแนะนำ 1-2 ประโยค ว่าข่าวนี้ผู้อ่านควรทำอย่างไร ตามกลยุทธ์ที่เลือก เช่น ควรรอ, ควรจับตา, มีโอกาสเข้า ฯลฯ)

สำคัญ: ตอบเป็นภาษาไทยทั้งหมด ยกเว้นชื่อหุ้น/บริษัท ห้ามตอบเกิน 250 คำ`;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body: NewsDigestRequest = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'No news title provided' }, { status: 400 });
    }

    const prompt = buildPrompt(body);

    if (prompt.length > MAX_PROMPT_SIZE) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }

    // Spawn claude CLI with OAuth — same pattern as analyze route
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([k]) =>
        k !== 'CLAUDECODE' && !k.startsWith('CLAUDE_CODE_') && k !== 'ANTHROPIC_API_KEY'
      )
    );

    const resultText = await new Promise<string>((resolve, reject) => {
      const child = spawn('claude', ['--print', '--model', 'claude-sonnet-4-6', '--max-turns', '1'], {
        env: env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (code: number) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else reject(new Error(stderr.trim() || stdout.trim() || `Exit code ${code}`));
      });

      child.on('error', reject);

      child.stdin.write(prompt);
      child.stdin.end();

      setTimeout(() => { child.kill(); reject(new Error('Timeout')); }, 90000);
    });

    if (!resultText) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Save to .md file
    let savedFilename = '';
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const slug = body.title
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 50)
        .toLowerCase();

      savedFilename = `news_${dateStr}_${timeStr}_${slug}.md`;
      const dir = path.join(process.cwd(), 'data', 'news-digests');
      fs.mkdirSync(dir, { recursive: true });

      const frontmatter = [
        '---',
        `title: "${body.title.replace(/"/g, '\\"')}"`,
        `source: ${body.source}`,
        `date: ${dateStr}`,
        `time: ${timeStr}`,
        `pubDate: ${body.pubDate}`,
        `link: ${body.link}`,
        `symbols: ${body.relatedSymbols.join(',')}`,
        `strategy: ${body.strategy}`,
        '---',
        '',
      ].join('\n');

      fs.writeFileSync(path.join(dir, savedFilename), frontmatter + resultText, 'utf-8');
    } catch (saveErr) {
      console.error('[AI] Failed to save news digest:', saveErr);
    }

    return NextResponse.json({ digest: resultText, filename: savedFilename });
  } catch (error: unknown) {
    console.error('News digest error:', error);
    const msg = error instanceof Error ? error.message : 'News digest failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
