'use client';

import { useState } from 'react';
import type { RangeOption } from '@/types';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useStockHistory } from '@/hooks/useStockHistory';
import StockHeader from './StockHeader';
import CandlestickChart from '@/components/chart/CandlestickChart';
import IndicatorPanel from '@/components/chart/IndicatorPanel';

const ranges: { label: string; value: RangeOption }[] = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
];

interface StockQuoteViewProps {
  symbol: string;
}

export default function StockQuoteView({ symbol }: StockQuoteViewProps) {
  const [range, setRange] = useState<RangeOption>('6mo');
  const { quotes, isLoading: quoteLoading } = useStockQuote(symbol);
  const { data: history, isLoading: historyLoading } = useStockHistory(symbol, range);
  const quote = quotes[0];

  if (quoteLoading) {
    return <LoadingSkeleton />;
  }

  if (!quote) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center text-muted">
        ไม่สามารถโหลดข้อมูลสำหรับ {symbol}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StockHeader quote={quote} />

      {/* Range selector */}
      <div className="flex gap-1">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              range === r.value
                ? 'bg-blue text-white'
                : 'bg-card text-muted hover:bg-card-hover border border-border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {historyLoading ? (
        <div className="h-[500px] bg-card rounded-lg border border-border animate-pulse" />
      ) : (
        <CandlestickChart
          candles={history?.candles ?? []}
          levels={history?.levels ?? []}
          indicators={history?.indicators}
        />
      )}

      {/* Indicator Panel */}
      {!historyLoading && history && (
        <IndicatorPanel
          indicators={history.indicators}
          currentPrice={quote.regularMarketPrice}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-5 animate-pulse">
        <div className="h-8 w-32 bg-card-hover rounded mb-3" />
        <div className="h-12 w-48 bg-card-hover rounded mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 bg-card-hover rounded" />
          ))}
        </div>
      </div>
      <div className="h-[500px] bg-card rounded-lg border border-border animate-pulse" />
    </div>
  );
}
