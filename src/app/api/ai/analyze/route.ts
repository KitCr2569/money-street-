import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/api-auth';
import { MAX_PROMPT_SIZE } from '@/lib/validate';

export interface StockAnalysisInput {
  symbol: string;
  shortName?: string;
  price: number;
  changePct: number;
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  ema100?: number | null;
  support: number | null;
  resistance: number | null;
  trend: 'up' | 'down' | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  compositeScore: number;
  scoreBreakdown: { rsi: number; ema: number; sr: number; trend: number; ath: number };
}

export type TradingStrategy = 'day' | 'week' | 'month' | 'long';

export interface AnalysisRequest {
  mode: 'single' | 'dashboard';
  stocks: StockAnalysisInput[];
  range: string;
  strategy?: TradingStrategy;
}

function formatStockData(s: StockAnalysisInput): string {
  return [
    `${s.symbol} (${s.shortName ?? ''})`,
    `ราคา: $${s.price.toFixed(2)} (${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%)`,
    `RSI(14): ${s.rsi?.toFixed(1) ?? 'N/A'}`,
    `EMA20: ${s.ema20?.toFixed(2) ?? 'N/A'} | EMA50: ${s.ema50?.toFixed(2) ?? 'N/A'}`,
    `แนวรับ: ${s.support?.toFixed(2) ?? 'N/A'} | แนวต้าน: ${s.resistance?.toFixed(2) ?? 'N/A'}`,
    `เทรนด์: ${s.trend ?? 'N/A'}`,
    `52W High: ${s.fiftyTwoWeekHigh?.toFixed(2) ?? 'N/A'} | 52W Low: ${s.fiftyTwoWeekLow?.toFixed(2) ?? 'N/A'}`,
    `Score: ${s.compositeScore} (RSI:${s.scoreBreakdown.rsi} EMA:${s.scoreBreakdown.ema} S/R:${s.scoreBreakdown.sr} Trend:${s.scoreBreakdown.trend} ATH:${s.scoreBreakdown.ath})`,
  ].join(' | ');
}

const strategyDescriptions: Record<TradingStrategy, string> = {
  day: 'เทรดรายวัน (Day Trade) — เน้นผลกระทบ 1-2 วัน, จุดเข้า/ออกระยะสั้น, ความผันผวนระยะสั้น, ใช้ RSI/EMA สั้นเป็นหลัก',
  week: 'เทรดรายสัปดาห์ (Swing Trade) — เน้นแนวโน้ม 1-2 สัปดาห์, แนวรับ/แนวต้าน, โมเมนตัม, ดู EMA20/50',
  month: 'เทรดรายเดือน (Position Trade) — เน้นผลกระทบ 1-3 เดือน, งบการเงิน, แนวโน้มอุตสาหกรรม, ดู EMA50/100',
  long: 'ลงทุนระยะยาว (Long-term Invest) — เน้นพื้นฐานบริษัท, การเติบโตระยะ 1 ปี+, ปัจจัยมหภาค, DCA, ดู EMA100/200',
};

function buildPrompt(req: AnalysisRequest): string {
  // Read prompt template
  const templatePath = path.join(process.cwd(), 'src', 'lib', 'prompts', 'trading-analysis.md');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Build stock data
  let stockData: string;
  if (req.mode === 'single') {
    stockData = formatStockData(req.stocks[0]);
  } else {
    stockData = req.stocks.map(formatStockData).join('\n');
  }

  const strategy = req.strategy ?? 'day';
  const strategyCtx = strategyDescriptions[strategy];

  const mode = req.mode === 'single'
    ? `single — วิเคราะห์หุ้นเดี่ยว (Timeframe: ${req.range})`
    : `dashboard — วิเคราะห์ Watchlist ทั้งหมด ${req.stocks.length} ตัว (Timeframe: ${req.range})`;

  return template
    .replace('{{STOCK_DATA}}', stockData)
    .replace('{{MODE}}', mode)
    .replace('{{STRATEGY}}', strategyCtx);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body: AnalysisRequest = await request.json();

    if (!body.stocks || body.stocks.length === 0) {
      return NextResponse.json({ error: 'No stocks provided' }, { status: 400 });
    }

    const prompt = buildPrompt(body);

    if (prompt.length > MAX_PROMPT_SIZE) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }

    // Spawn claude CLI with OAuth auth — strip session vars and API key to force OAuth
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

    // Save analysis to .md file
    let savedFilename = '';
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const range = body.range || 'unknown';
      const mode = body.mode;
      const symbol = mode === 'dashboard' ? 'watchlist' : body.stocks[0].symbol.toUpperCase();

      savedFilename = `${symbol}_${dateStr}_${timeStr}_${range}.md`;
      const dir = path.join(process.cwd(), 'data', 'analyses');
      fs.mkdirSync(dir, { recursive: true });

      const frontmatter = [
        '---',
        `symbol: ${symbol}`,
        `date: ${dateStr}`,
        `time: ${timeStr}`,
        `range: ${range}`,
        `mode: ${mode}`,
        `strategy: ${body.strategy ?? 'day'}`,
        '---',
        '',
      ].join('\n');

      fs.writeFileSync(path.join(dir, savedFilename), frontmatter + resultText, 'utf-8');
    } catch (saveErr) {
      console.error('[AI] Failed to save analysis:', saveErr);
    }

    return NextResponse.json({ analysis: resultText, filename: savedFilename });
  } catch (error: unknown) {
    console.error('AI analysis error:', error);
    const msg = error instanceof Error ? error.message : 'AI analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
