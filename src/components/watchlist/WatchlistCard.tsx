'use client';

import Link from 'next/link';
import type { StockQuote } from '@/types';

interface WatchlistCardProps {
  symbol: string;
  quote?: StockQuote;
  onRemove: (symbol: string) => void;
}

export default function WatchlistCard({ symbol, quote, onRemove }: WatchlistCardProps) {
  const positive = (quote?.regularMarketChange ?? 0) >= 0;
  const changeColor = positive ? 'text-green' : 'text-red';

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-2 transition-colors group">
      <Link href={`/stock/${symbol}/profile`} className="flex-1 min-w-0 flex items-center justify-between">
        <span className="font-mono text-xs font-semibold">{symbol}</span>
        {quote ? (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono text-dim">{quote.regularMarketPrice.toFixed(2)}</span>
            <span className={`font-mono font-medium ${changeColor}`}>
              {positive ? '+' : ''}{quote.regularMarketChangePercent.toFixed(2)}%
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-dim">···</span>
        )}
      </Link>
      <Link href={`/stock/${symbol}`} className="text-dim hover:text-accent transition-colors shrink-0" title="ดูกราฟ">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
        </svg>
      </Link>
      <button
        onClick={() => onRemove(symbol)}
        className="text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="ลบ"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
