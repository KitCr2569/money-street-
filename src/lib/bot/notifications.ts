import type { BotSignal } from './bot-engine';
import type { ScanResult } from './scanner';

// =====================================================
// Bot Notifications — Telegram + LINE Notify
// =====================================================

// ==================== Telegram ====================

/**
 * Send Telegram message
 * Requires:
 *   TELEGRAM_BOT_TOKEN — สร้างจาก @BotFather บน Telegram
 *   TELEGRAM_CHAT_ID   — Chat ID ของคุณ (ใช้ @userinfobot หา)
 *
 * วิธีตั้งค่า:
 * 1. เปิด Telegram → ค้นหา @BotFather
 * 2. พิมพ์ /newbot → ตั้งชื่อ → ได้ Token
 * 3. ค้นหา @userinfobot → พิมพ์อะไรก็ได้ → ได้ Chat ID
 * 4. ใส่ใน .env:
 *    TELEGRAM_BOT_TOKEN=123456:ABCdefGhIjKlMnOpQrStUvWxYz
 *    TELEGRAM_CHAT_ID=123456789
 */
export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Bot Notify] No TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Bot Notify] Telegram error:', data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Bot Notify] Telegram error:', err);
    return false;
  }
}

// ==================== LINE Notify ====================

/**
 * Send LINE Notify message
 * Requires LINE_NOTIFY_TOKEN env var
 * Get token from: https://notify-bot.line.me/
 */
export async function sendLineNotify(message: string): Promise<boolean> {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`,
    });
    return res.ok;
  } catch (err) {
    console.error('[Bot Notify] LINE error:', err);
    return false;
  }
}

// ==================== Unified Send ====================

/** Send to all configured channels (Telegram + LINE) */
async function sendAll(message: string, telegramHtml?: string): Promise<void> {
  const promises: Promise<boolean>[] = [];

  // Telegram (use HTML version if provided)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    promises.push(sendTelegram(telegramHtml ?? message));
  }

  // LINE Notify
  if (process.env.LINE_NOTIFY_TOKEN) {
    promises.push(sendLineNotify(message));
  }

  await Promise.allSettled(promises);
}

// ==================== Formatters ====================

/** Format signal for plain text */
function formatSignal(signal: BotSignal): string {
  const emoji = signal.signal === 'strong_buy' ? '🔥' : signal.signal === 'buy' ? '🟢' :
    signal.signal === 'strong_sell' ? '🔴' : signal.signal === 'sell' ? '🟡' : '⚪';

  const label = signal.signal === 'strong_buy' ? 'ซื้อเลย!' : signal.signal === 'buy' ? 'น่าซื้อ' :
    signal.signal === 'strong_sell' ? 'ขายเลย!' : signal.signal === 'sell' ? 'ขาย' : 'รอ';

  return [
    `${emoji} ${signal.symbol} — ${label}`,
    `💰 ราคา: $${signal.price.toFixed(2)}`,
    `📊 Score: ${signal.totalScore.toFixed(1)}/10 (${signal.normalizedScore}%)`,
    `🎯 กลยุทธ์: ${signal.strategy}`,
    `🛑 SL: $${signal.stopLoss.toFixed(2)}`,
    `✅ TP: $${signal.takeProfit1.toFixed(2)}`,
    `📈 R:R = 1:${signal.riskRewardRatio.toFixed(1)}`,
  ].join('\n');
}

/** Format signal for Telegram HTML */
function formatSignalHtml(signal: BotSignal): string {
  const emoji = signal.signal === 'strong_buy' ? '🔥' : signal.signal === 'buy' ? '🟢' :
    signal.signal === 'strong_sell' ? '🔴' : signal.signal === 'sell' ? '🟡' : '⚪';

  const label = signal.signal === 'strong_buy' ? 'ซื้อเลย!' : signal.signal === 'buy' ? 'น่าซื้อ' :
    signal.signal === 'strong_sell' ? 'ขายเลย!' : signal.signal === 'sell' ? 'ขาย' : 'รอ';

  return [
    `${emoji} <b>${signal.symbol}</b> — ${label}`,
    `💰 ราคา: <code>$${signal.price.toFixed(2)}</code>`,
    `📊 Score: <b>${signal.totalScore.toFixed(1)}</b>/10 (${signal.normalizedScore}%)`,
    `🎯 กลยุทธ์: ${signal.strategy}`,
    `🛑 SL: <code>$${signal.stopLoss.toFixed(2)}</code>  ✅ TP: <code>$${signal.takeProfit1.toFixed(2)}</code>`,
    `📈 R:R = 1:${signal.riskRewardRatio.toFixed(1)}`,
  ].join('\n');
}

// ==================== Public API ====================

/** Notify scan results */
export async function notifyScanResults(result: ScanResult): Promise<void> {
  const strongSignals = result.signals.filter(
    s => s.signal === 'strong_buy' || s.signal === 'strong_sell'
  );
  const buySignals = result.signals.filter(s => s.signal === 'buy');

  if (strongSignals.length === 0 && buySignals.length === 0) return;

  // Plain text (LINE)
  const lines: string[] = [
    '\n🤖 Trading Bot — สแกนเสร็จ!',
    `⏱ สแกน ${result.scannedCount} ตัว (${(result.scanDuration / 1000).toFixed(1)}s)`,
    `🟢 ซื้อ: ${result.buySignals} | 🔴 ขาย: ${result.sellSignals}`,
    '',
  ];
  for (const s of strongSignals.slice(0, 5)) { lines.push(formatSignal(s)); lines.push(''); }
  for (const s of buySignals.slice(0, 3)) { lines.push(formatSignal(s)); lines.push(''); }

  // Telegram HTML
  const htmlLines: string[] = [
    '🤖 <b>Trading Bot — สแกนเสร็จ!</b>',
    `⏱ สแกน ${result.scannedCount} ตัว (${(result.scanDuration / 1000).toFixed(1)}s)`,
    `🟢 ซื้อ: <b>${result.buySignals}</b> | 🔴 ขาย: <b>${result.sellSignals}</b>`,
    '',
  ];
  for (const s of strongSignals.slice(0, 5)) { htmlLines.push(formatSignalHtml(s)); htmlLines.push(''); }
  for (const s of buySignals.slice(0, 3)) { htmlLines.push(formatSignalHtml(s)); htmlLines.push(''); }

  await sendAll(lines.join('\n'), htmlLines.join('\n'));
}

/** Notify when a trade is executed */
export async function notifyTradeExecution(
  type: 'buy' | 'sell',
  symbol: string,
  shares: number,
  price: number,
  reason?: string,
): Promise<void> {
  const emoji = type === 'buy' ? '🟢' : '🔴';
  const action = type === 'buy' ? 'ซื้อ' : 'ขาย';

  const plain = [
    `\n${emoji} Bot ${action} ${symbol}`,
    `📊 ${shares} shares @ $${price.toFixed(2)}`,
    `💵 มูลค่า: $${(shares * price).toFixed(2)}`,
    reason ? `📝 เหตุผล: ${reason}` : '',
  ].filter(Boolean).join('\n');

  const html = [
    `${emoji} Bot ${action} <b>${symbol}</b>`,
    `📊 ${shares} shares @ <code>$${price.toFixed(2)}</code>`,
    `💵 มูลค่า: <code>$${(shares * price).toFixed(2)}</code>`,
    reason ? `📝 เหตุผล: ${reason}` : '',
  ].filter(Boolean).join('\n');

  await sendAll(plain, html);
}

/** Notify P&L when a trade closes */
export async function notifyTradeClosed(
  symbol: string,
  pnl: number,
  pnlPct: number,
  exitReason: string,
): Promise<void> {
  const emoji = pnl > 0 ? '✅' : '❌';
  const pnlStr = `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`;

  const plain = [
    `\n${emoji} ปิดตำแหน่ง ${symbol}`,
    `💰 P&L: ${pnlStr}`,
    `📝 เหตุผล: ${exitReason}`,
  ].join('\n');

  const html = [
    `${emoji} ปิดตำแหน่ง <b>${symbol}</b>`,
    `💰 P&L: <b>${pnlStr}</b>`,
    `📝 เหตุผล: ${exitReason}`,
  ].join('\n');

  await sendAll(plain, html);
}
