'use client';

import type { StockQuote } from '@/types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtLarge(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString('en-US');
}
function fmtVol(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function getExtendedPrice(quote: StockQuote) {
  const state = quote.marketState?.toUpperCase() ?? '';
  if (state === 'REGULAR') return null;
  // Show pre-market price if available
  if (quote.preMarketPrice) {
    const change = quote.preMarketChange ?? 0;
    const pct = quote.preMarketChangePercent ?? 0;
    return { label: 'นอกเวลา', price: quote.preMarketPrice, change, pct };
  }
  // Fallback to post-market price (overnight/after-hours/closed)
  if (quote.postMarketPrice) {
    const change = quote.postMarketChange ?? 0;
    const pct = quote.postMarketChangePercent ?? 0;
    return { label: 'นอกเวลา', price: quote.postMarketPrice, change, pct };
  }
  return null;
}

export default function StockHeader({ quote }: { quote: StockQuote }) {
  const positive = quote.regularMarketChange >= 0;
  const changeColor = positive ? 'text-green' : 'text-red';
  const changeBg = positive ? 'bg-green-dim' : 'bg-red-dim';
  const ext = getExtendedPrice(quote);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
      {/* Left — Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-bold font-mono tracking-tight">{quote.symbol}</h1>
          <span className="text-xs text-dim truncate">{quote.shortName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-dim capitalize">
            {quote.marketState.toLowerCase()}
          </span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold font-mono tracking-tighter">
            {fmt(quote.regularMarketPrice)}
          </span>
          <span className="text-xs text-dim">{quote.currency}</span>
          <span className={`text-sm font-semibold font-mono px-2 py-0.5 rounded-md ${changeBg} ${changeColor}`}>
            {positive ? '+' : ''}{fmt(quote.regularMarketChange)} ({positive ? '+' : ''}{quote.regularMarketChangePercent.toFixed(2)}%)
          </span>
        </div>

        {/* Extended hours price */}
        {ext && (
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-dim">{ext.label}</span>
            <span className="text-sm font-semibold font-mono">{fmt(ext.price)}</span>
            <span className={`text-xs font-mono ${ext.change >= 0 ? 'text-green' : 'text-red'}`}>
              {ext.change >= 0 ? '+' : ''}{fmt(ext.change)} ({ext.change >= 0 ? '+' : ''}{ext.pct.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Right — Stats */}
      <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-[11px] shrink-0">
        <Stat label="เปิด" value={fmt(quote.regularMarketOpen)} />
        <Stat label="สูงสุด" value={fmt(quote.regularMarketDayHigh)} />
        <Stat label="ต่ำสุด" value={fmt(quote.regularMarketDayLow)} />
        <Stat label="ปิดก่อนหน้า" value={fmt(quote.regularMarketPreviousClose)} />
        <Stat label="ปริมาณ" value={fmtVol(quote.regularMarketVolume)} />
        <Stat label="มูลค่าตลาด" value={fmtLarge(quote.marketCap)} />
        <Stat label="52W ต่ำสุด" value={fmt(quote.fiftyTwoWeekLow)} />
        <Stat label="52W สูงสุด" value={fmt(quote.fiftyTwoWeekHigh)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-dim">{label}</span>
      <span className="font-mono text-foreground font-medium">{value}</span>
    </div>
  );
}
