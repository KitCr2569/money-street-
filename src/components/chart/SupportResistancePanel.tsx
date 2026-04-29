'use client';

import type { SRLevel } from '@/types';
import { formatPrice } from '@/lib/format';

const ZONE_PCT = 0.0075;

interface Props {
  levels: SRLevel[];
  currentPrice: number;
}

export default function SupportResistancePanel({ levels, currentPrice }: Props) {
  if (levels.length === 0) return null;

  const resistances = levels.filter((l) => l.type === 'resistance').sort((a, b) => a.price - b.price);
  const supports = levels.filter((l) => l.type === 'support').sort((a, b) => b.price - a.price);
  const maxStrength = Math.max(...levels.map((l) => l.strength));

  const activeZone = levels.find((l) => {
    const u = l.price * (1 + ZONE_PCT), lo = l.price * (1 - ZONE_PCT);
    return currentPrice >= lo && currentPrice <= u;
  });

  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-2 px-1">โซนแนวรับ/แนวต้าน</div>

      {activeZone && (
        <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
          activeZone.type === 'support' ? 'bg-green-dim text-green' : 'bg-red-dim text-red'
        }`}>
          อยู่ในโซน{activeZone.type === 'support' ? 'แนวรับ' : 'แนวต้าน'} {formatPrice(activeZone.price)}
        </div>
      )}

      {/* Resistance */}
      {resistances.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <div className="w-1 h-1 rounded-full bg-red" />
            <span className="text-[9px] font-semibold text-red uppercase tracking-wider">แนวต้าน</span>
          </div>
          <div className="space-y-1">
            {resistances.map((l, i) => (
              <ZoneRow key={i} level={l} currentPrice={currentPrice} maxStrength={maxStrength} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Support */}
      {supports.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <div className="w-1 h-1 rounded-full bg-green" />
            <span className="text-[9px] font-semibold text-green uppercase tracking-wider">แนวรับ</span>
          </div>
          <div className="space-y-1">
            {supports.map((l, i) => (
              <ZoneRow key={i} level={l} currentPrice={currentPrice} maxStrength={maxStrength} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneRow({ level, currentPrice, maxStrength, index }: { level: SRLevel; currentPrice: number; maxStrength: number; index: number }) {
  const isSupport = level.type === 'support';
  const distance = ((level.price - currentPrice) / currentPrice) * 100;
  const barWidth = (level.strength / maxStrength) * 100;
  const upper = level.price * (1 + ZONE_PCT);
  const lower = level.price * (1 - ZONE_PCT);
  const isInZone = currentPrice >= lower && currentPrice <= upper;
  const color = isSupport ? 'text-green' : 'text-red';
  const bg = isSupport ? 'bg-green' : 'bg-red';

  return (
    <div className={`relative rounded-lg overflow-hidden px-2.5 py-1.5 ${isInZone ? (isSupport ? 'bg-green-dim ring-1 ring-green/20' : 'bg-red-dim ring-1 ring-red/20') : 'hover:bg-surface-2'} transition-all`}>
      <div className={`absolute inset-y-0 left-0 ${bg} opacity-[0.04]`} style={{ width: `${barWidth}%` }} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold ${color} opacity-60 w-3`}>{isSupport ? 'S' : 'R'}{index}</span>
          <div className={`w-0.5 h-4 rounded-full ${bg} opacity-60`} />
          <span className={`text-xs font-bold font-mono ${color}`}>{formatPrice(level.price)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-px">
            {Array.from({ length: Math.min(level.strength, 6) }).map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full ${bg} ${i < Math.ceil(level.strength / 2) ? 'opacity-70' : 'opacity-25'}`} />
            ))}
          </div>
          <span className="text-[9px] text-dim font-mono">{distance >= 0 ? '+' : ''}{distance.toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-[9px] text-dim font-mono pl-2 mt-0.5">
        {formatPrice(lower)} — {formatPrice(upper)}
      </div>
    </div>
  );
}
