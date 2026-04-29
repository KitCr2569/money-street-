'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FearGreedData {
  score: number;
  rating: string;
  previous_close: number;
  previous_1_week: number;
  previous_1_month: number;
  previous_1_year: number;
  timestamp: string;
}

const ZONES = [
  { max: 24, label: 'กลัวสุดขีด', short: 'Extreme Fear', color: '#ef4444' },
  { max: 44, label: 'กลัว', short: 'Fear', color: '#f97316' },
  { max: 55, label: 'ปกติ', short: 'Neutral', color: '#eab308' },
  { max: 74, label: 'โลภ', short: 'Greed', color: '#22c55e' },
  { max: 100, label: 'โลภสุดขีด', short: 'Extreme Greed', color: '#10b981' },
];

function getZone(score: number) {
  return ZONES.find((z) => score <= z.max) ?? ZONES[ZONES.length - 1];
}

function getScoreStyle(score: number) {
  if (score <= 24) return { text: 'text-red', bg: 'bg-red/8', border: 'border-red/25' };
  if (score <= 44) return { text: 'text-orange-400', bg: 'bg-orange-400/8', border: 'border-orange-400/25' };
  if (score <= 55) return { text: 'text-yellow', bg: 'bg-yellow/8', border: 'border-yellow/25' };
  if (score <= 74) return { text: 'text-green', bg: 'bg-green/8', border: 'border-green/25' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/25' };
}

export default function FearGreedIndex() {
  const { data, error, isLoading } = useSWR<FearGreedData>(
    '/api/fear-greed',
    fetcher,
    { refreshInterval: 5 * 60 * 1000, revalidateOnFocus: false }
  );

  if (error) return null;

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-1.5 px-4 py-2 rounded-lg bg-surface-2 border border-border animate-pulse w-[320px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded bg-dim/20" />
          <div className="w-20 h-3 rounded bg-dim/20" />
        </div>
        <div className="w-full h-2.5 rounded-full bg-dim/20" />
      </div>
    );
  }

  const style = getScoreStyle(data.score);
  const zone = getZone(data.score);
  const diff = data.score - data.previous_close;
  const diffStr = diff >= 0 ? `+${Math.abs(diff).toFixed(0)}` : `${diff.toFixed(0)}`;
  const diffColor = diff >= 0 ? 'text-green' : 'text-red';
  const diffArrow = diff >= 0 ? '▲' : '▼';
  const pct = Math.max(0, Math.min(100, data.score));

  return (
    <div className={`flex flex-col gap-1 px-4 py-2 rounded-lg ${style.bg} border ${style.border} w-[320px]`}>
      {/* Row 1: Score + Label + Change */}
      <div className="flex items-center gap-2.5">
        <span className={`text-[20px] font-extrabold leading-none tabular-nums ${style.text}`}>
          {data.score}
        </span>
        <span className={`text-[13px] font-bold ${style.text} whitespace-nowrap`}>
          {zone.label}
        </span>
        <span className="text-[10px] text-dim">Fear & Greed</span>
        <span className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${diffColor} ml-auto`}>
          {diffArrow} {diffStr}
        </span>
      </div>

      {/* Row 2: Gauge bar */}
      <div className="relative w-full h-2.5 rounded-full overflow-hidden">
        {/* Zone segments */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {ZONES.map((z, i) => {
            const prevMax = i === 0 ? 0 : ZONES[i - 1].max;
            const width = z.max - prevMax;
            return (
              <div
                key={z.label}
                style={{ width: `${width}%`, backgroundColor: z.color, opacity: z === zone ? 1 : 0.25 }}
              />
            );
          })}
        </div>
        {/* Dot indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white"
          style={{
            left: `calc(${pct}% - 7px)`,
            boxShadow: `0 0 8px ${zone.color}, 0 0 3px ${zone.color}`,
          }}
        />
      </div>

      {/* Row 3: Zone labels */}
      <div className="flex text-[9px] font-semibold leading-none">
        {ZONES.map((z, i) => {
          const prevMax = i === 0 ? 0 : ZONES[i - 1].max;
          const width = z.max - prevMax;
          return (
            <span
              key={z.label}
              className="text-center"
              style={{
                width: `${width}%`,
                color: z === zone ? zone.color : 'var(--color-dim)',
                opacity: z === zone ? 1 : 0.45,
              }}
            >
              {z.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
