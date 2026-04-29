'use client';

import dynamic from 'next/dynamic';
import type { Candle, SRLevel, Indicators } from '@/types';
import type { ChartType } from './ChartInner';

interface CandlestickChartProps {
  candles: Candle[];
  levels: SRLevel[];
  indicators?: Indicators;
  chartType?: ChartType;
}

const ChartInner = dynamic(() => import('./ChartInner'), { ssr: false });

export default function CandlestickChart({ candles, levels, indicators, chartType }: CandlestickChartProps) {
  if (candles.length === 0) {
    return (
      <div className="h-[480px] bg-surface rounded-xl border border-glass-border flex items-center justify-center text-dim">
        ไม่มีข้อมูลกราฟ
      </div>
    );
  }

  return <ChartInner candles={candles} levels={levels} indicators={indicators} chartType={chartType} />;
}
