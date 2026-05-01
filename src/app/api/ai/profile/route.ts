import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/api-auth';
import { validateSymbol, MAX_PROMPT_SIZE } from '@/lib/validate';

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const { symbol: rawSymbol, profileData } = await request.json();
    const symbol = validateSymbol(rawSymbol);
    if (!symbol || !profileData) {
      return NextResponse.json({ error: 'Invalid or missing data' }, { status: 400 });
    }

    const prompt = `คุณเป็นนักวิเคราะห์หุ้นมืออาชีพ ช่วยสรุปข้อมูลบริษัท ${symbol} ให้เข้าใจง่าย เป็นภาษาไทย

ข้อมูลดิบจาก Yahoo Finance:
- ชื่อ: ${profileData.shortName}
- ธุรกิจ (อังกฤษ): ${profileData.longBusinessSummary ?? 'ไม่มีข้อมูล'}
- Sector: ${profileData.sector ?? '-'} | Industry: ${profileData.industry ?? '-'}
- ประเทศ: ${profileData.country ?? '-'}
- พนักงาน: ${profileData.fullTimeEmployees?.toLocaleString() ?? '-'}
- Market Cap: $${profileData.marketCap ? (profileData.marketCap / 1e9).toFixed(2) + 'B' : '-'}
- Revenue: $${profileData.totalRevenue ? (profileData.totalRevenue / 1e9).toFixed(2) + 'B' : '-'}
- Revenue Growth: ${profileData.revenueGrowth ? (profileData.revenueGrowth * 100).toFixed(1) + '%' : '-'}
- Profit Margin: ${profileData.profitMargins ? (profileData.profitMargins * 100).toFixed(1) + '%' : '-'}
- Operating Margin: ${profileData.operatingMargins ? (profileData.operatingMargins * 100).toFixed(1) + '%' : '-'}
- P/E (TTM): ${profileData.trailingPE?.toFixed(1) ?? '-'} | Forward P/E: ${profileData.forwardPE?.toFixed(1) ?? '-'}
- P/B: ${profileData.priceToBook?.toFixed(2) ?? '-'}
- ROE: ${profileData.returnOnEquity ? (profileData.returnOnEquity * 100).toFixed(1) + '%' : '-'}
- Free Cash Flow: $${profileData.freeCashflow ? (profileData.freeCashflow / 1e9).toFixed(2) + 'B' : '-'}
- Total Cash: $${profileData.totalCash ? (profileData.totalCash / 1e9).toFixed(2) + 'B' : '-'}
- Total Debt: $${profileData.totalDebt ? (profileData.totalDebt / 1e9).toFixed(2) + 'B' : '-'}
- Beta: ${profileData.beta?.toFixed(2) ?? '-'}
- Dividend Yield: ${profileData.dividendYield ? (profileData.dividendYield * 100).toFixed(2) + '%' : '-'}
- Analyst Target: $${profileData.targetLowPrice ?? '-'} - $${profileData.targetHighPrice ?? '-'} (เฉลี่ย $${profileData.targetMeanPrice ?? '-'})
- Recommendation: ${profileData.recommendationKey ?? '-'} (${profileData.numberOfAnalystOpinions ?? 0} analysts)

กรุณาเขียนในรูปแบบนี้ (ใช้ markdown):

## 🏢 ${symbol} คืออะไร?
[สรุป 2-3 ประโยคว่าบริษัททำอะไร ทำเงินจากอะไร ในภาษาไทยที่เข้าใจง่าย]

## 💡 จุดเด่น
[3-5 bullet points จุดเด่นของบริษัท]

## ⚠️ ความเสี่ยง
[2-3 bullet points ความเสี่ยงหลัก]

## 🎯 มุมมองนักวิเคราะห์
[สรุปความเห็นจาก analyst target price และ recommendation]

## 📊 สรุป
[สรุปสั้นๆ 1-2 ประโยค ว่าหุ้นนี้เหมาะกับนักลงทุนแบบไหน]`;

    if (prompt.length > MAX_PROMPT_SIZE) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }

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

    // Save to .md
    let savedFilename = '';
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      savedFilename = `${symbol.toUpperCase()}_profile_${dateStr}.md`;
      const dir = path.join(process.cwd(), 'data', 'profiles');
      fs.mkdirSync(dir, { recursive: true });

      const frontmatter = [
        '---',
        `symbol: ${symbol}`,
        `date: ${dateStr}`,
        `type: profile`,
        '---',
        '',
      ].join('\n');

      fs.writeFileSync(path.join(dir, savedFilename), frontmatter + resultText, 'utf-8');
    } catch (e) {
      console.error('[AI] Failed to save profile:', e);
    }

    return NextResponse.json({ summary: resultText, filename: savedFilename });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'AI profile failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
