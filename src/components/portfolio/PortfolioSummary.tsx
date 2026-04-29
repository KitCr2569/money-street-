'use client';

import { useMemo } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useHydration } from '@/hooks/useHydration';
import { getStockTags } from '@/lib/stock-tags';

// Categorize stock by primary tag
function getCategory(symbol: string, quote?: Parameters<typeof getStockTags>[1]): string {
  const tags = getStockTags(symbol, quote);
  if (tags.some((t) => t.label === 'ETF')) return 'ETF';
  if (tags.some((t) => t.label.startsWith('ปันผล'))) return 'ปันผล';
  if (tags.some((t) => t.label === 'Mag 7')) return 'Mag 7';
  if (tags.some((t) => t.label === 'NAS 100')) return 'Growth';
  if (tags.some((t) => t.label === 'S&P 500')) return 'Large Cap';
  return 'อื่นๆ';
}

const CATEGORY_COLORS: Record<string, string> = {
  'Mag 7': 'bg-amber-400',
  'Growth': 'bg-purple',
  'Large Cap': 'bg-blue',
  'ETF': 'bg-yellow',
  'ปันผล': 'bg-green',
  'อื่นๆ': 'bg-dim',
};

const CATEGORY_TEXT: Record<string, string> = {
  'Mag 7': 'text-amber-400',
  'Growth': 'text-purple',
  'Large Cap': 'text-blue',
  'ETF': 'text-yellow',
  'ปันผล': 'text-green',
  'อื่นๆ': 'text-dim',
};

export default function PortfolioSummary() {
  const hydrated = useHydration();
  const { holdings } = usePortfolio();
  const symbols = holdings.map((h) => h.symbol);
  const { quotes } = useStockQuote(symbols);

  const quotesMap = useMemo(() => {
    const map: Record<string, (typeof quotes)[number]> = {};
    for (const q of quotes) map[q.symbol] = q;
    return map;
  }, [quotes]);

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let totalShares = 0;
    const categoryValues: Record<string, number> = {};

    for (const h of holdings) {
      const q = quotesMap[h.symbol];
      const price = q?.regularMarketPrice ?? 0;
      const shares = h.lots.reduce((s, l) => s + l.shares, 0);
      const cost = h.lots.reduce((s, l) => s + l.shares * l.price, 0);
      const value = price * shares;

      totalValue += value;
      totalCost += cost;
      totalShares += shares;

      const category = getCategory(h.symbol, q);
      categoryValues[category] = (categoryValues[category] ?? 0) + value;
    }

    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    // Sort categories by value desc
    const categories = Object.entries(categoryValues)
      .map(([name, value]) => ({
        name,
        value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return { totalValue, totalCost, pnl, pnlPct, totalShares, holdingsCount: holdings.length, categories };
  }, [holdings, quotesMap]);

  if (!hydrated || holdings.length === 0) return null;

  const positive = summary.pnl >= 0;

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-[11px] text-dim uppercase">มูลค่าพอร์ต</div>
          <div className="text-lg font-bold font-mono">${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[11px] text-dim uppercase">ต้นทุน</div>
          <div className="text-lg font-bold font-mono text-dim">${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[11px] text-dim uppercase">กำไร/ขาดทุน</div>
          <div className={`text-lg font-bold font-mono ${positive ? 'text-green' : 'text-red'}`}>
            {positive ? '+' : ''}{summary.pnl.toFixed(2)} ({positive ? '+' : ''}{summary.pnlPct.toFixed(2)}%)
          </div>
        </div>
        <div>
          <div className="text-[11px] text-dim uppercase">หุ้น / จำนวน</div>
          <div className="text-lg font-bold">{summary.holdingsCount} <span className="text-sm text-dim font-normal">ตัว</span></div>
        </div>
      </div>

      {/* Category breakdown */}
      {summary.categories.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] text-dim uppercase">สัดส่วนหมวดหมู่</div>

          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden">
            {summary.categories.map((cat) => (
              <div
                key={cat.name}
                className={`${CATEGORY_COLORS[cat.name] ?? 'bg-dim'} transition-all`}
                style={{ width: `${cat.pct}%` }}
                title={`${cat.name} ${cat.pct.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {summary.categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-[12px]">
                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat.name] ?? 'bg-dim'}`} />
                <span className={`font-semibold ${CATEGORY_TEXT[cat.name] ?? 'text-dim'}`}>{cat.name}</span>
                <span className="text-dim">{cat.pct.toFixed(1)}%</span>
                <span className="text-dim text-[10px]">(${cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
