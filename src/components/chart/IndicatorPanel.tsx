'use client';

import type { Indicators } from '@/types';
import { formatPrice } from '@/lib/format';

interface Props {
  indicators: Indicators;
  currentPrice: number;
}

export default function IndicatorPanel({ indicators, currentPrice }: Props) {
  const latestRSI = indicators.rsi14.at(-1)?.value;
  const latestEma20 = indicators.ema20.at(-1)?.value;
  const latestEma50 = indicators.ema50.at(-1)?.value;
  const latestEma100 = indicators.ema100.at(-1)?.value;
  const latestEma200 = indicators.ema200.at(-1)?.value;

  const rsiZone = !latestRSI
    ? null
    : latestRSI >= 70
      ? { label: 'ซื้อมากเกิน', color: 'text-red', bg: 'bg-red-dim' }
      : latestRSI <= 30
        ? { label: 'ขายมากเกิน', color: 'text-green', bg: 'bg-green-dim' }
        : { label: 'ปกติ', color: 'text-yellow', bg: 'bg-yellow-dim' };

  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-3 px-1">อินดิเคเตอร์</div>

      <div className="grid grid-cols-2 gap-3">
        {/* RSI */}
        <div>
          <div className="text-[9px] font-semibold text-yellow uppercase tracking-wider mb-1.5 px-1">RSI (14)</div>
          {latestRSI != null && rsiZone && (
            <div className={`rounded-lg ${rsiZone.bg} p-2.5`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xl font-bold font-mono ${rsiZone.color}`}>{latestRSI.toFixed(1)}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${rsiZone.bg} ${rsiZone.color}`}>
                  {rsiZone.label}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[30%] bg-green/15 rounded-l-full" />
                <div className="absolute inset-y-0 right-0 w-[30%] bg-red/15 rounded-r-full" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow shadow-lg shadow-yellow/30"
                  style={{ left: `clamp(0%, calc(${latestRSI}% - 4px), calc(100% - 8px))` }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-green/60">30</span>
                <span className="text-[8px] text-dim/40">50</span>
                <span className="text-[8px] text-red/60">70</span>
              </div>
            </div>
          )}
        </div>

        {/* EMA */}
        <div>
          <div className="text-[9px] font-semibold text-blue uppercase tracking-wider mb-1.5 px-1">EMA</div>
          <div className="space-y-1">
            {[
              { label: '20', value: latestEma20, dot: 'bg-[#f59e0b]' },
              { label: '50', value: latestEma50, dot: 'bg-blue' },
              { label: '100', value: latestEma100, dot: 'bg-[#ec4899]' },
              { label: '200', value: latestEma200, dot: 'bg-purple' },
            ].map(({ label, value, dot }) => {
              if (value == null) return null;
              const diff = ((currentPrice - value) / value) * 100;
              const above = currentPrice > value;
              return (
                <div key={label} className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[10px] text-dim">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium">{formatPrice(value)}</span>
                    <span className={`text-[9px] font-mono ${above ? 'text-green' : 'text-red'}`}>
                      {above ? '↑' : '↓'}{Math.abs(diff).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
