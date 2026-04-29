'use client';

import { use, useState } from 'react';
import type { RangeOption } from '@/types';
import type { ChartType } from '@/components/chart/ChartInner';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useStockHistory } from '@/hooks/useStockHistory';
import { useHydration } from '@/hooks/useHydration';
import StockHeader from '@/components/stock/StockHeader';
import CandlestickChart from '@/components/chart/CandlestickChart';
import IndicatorPanel from '@/components/chart/IndicatorPanel';
import SupportResistancePanel from '@/components/chart/SupportResistancePanel';
import WatchlistPanel from '@/components/watchlist/WatchlistPanel';

const ranges: { label: string; value: RangeOption }[] = [
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
];

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();
  const [range, setRange] = useState<RangeOption>('3mo');
  const [chartType, setChartType] = useState<ChartType>('line');

  const hydrated = useHydration();
  const { quotes, isLoading: quoteLoading } = useStockQuote(upperSymbol);
  const { data: history, isLoading: historyLoading } = useStockHistory(upperSymbol, range);
  const quote = quotes[0];

  if (!hydrated || quoteLoading) {
    return (
      <div className="animate-pulse space-y-4 pt-4">
        <div className="h-16 bg-surface rounded-xl" />
        <div className="h-[520px] bg-surface rounded-xl" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-dim mb-2">{upperSymbol}</div>
          <div className="text-sm text-dim">Could not load data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* Header bar */}
      <StockHeader quote={quote} />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
        {/* Left — Chart area */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5">
              {ranges.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    range === r.value
                      ? 'bg-accent text-background shadow-sm shadow-accent/20'
                      : 'text-dim hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5">
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-2 py-1 rounded-md transition-all ${
                  chartType === 'candlestick' ? 'bg-surface-3 text-foreground' : 'text-dim hover:text-foreground'
                }`}
                title="Candlestick"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="2" height="12" rx="0.5" opacity="0.4" />
                  <rect x="2" y="5" width="4" height="5" rx="0.5" />
                  <rect x="11" y="1" width="2" height="12" rx="0.5" opacity="0.4" />
                  <rect x="10" y="3" width="4" height="5" rx="0.5" />
                </svg>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-2 py-1 rounded-md transition-all ${
                  chartType === 'line' ? 'bg-surface-3 text-foreground' : 'text-dim hover:text-foreground'
                }`}
                title="Line"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12l4-5 3 3 5-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chart */}
          {historyLoading ? (
            <div className="h-[520px] bg-surface rounded-xl animate-pulse" />
          ) : (
            <CandlestickChart
              candles={history?.candles ?? []}
              levels={history?.levels ?? []}
              indicators={history?.indicators}
              chartType={chartType}
            />
          )}

          {/* Indicator panel */}
          {!historyLoading && history && (
            <IndicatorPanel
              indicators={history.indicators}
              currentPrice={quote.regularMarketPrice}
            />
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-3">
          <WatchlistPanel currentSymbol={upperSymbol} />
          {!historyLoading && history && (
            <SupportResistancePanel
              levels={history.levels}
              currentPrice={quote.regularMarketPrice}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
