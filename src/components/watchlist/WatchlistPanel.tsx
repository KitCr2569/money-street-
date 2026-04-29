'use client';

import { useWatchlist, useWatchlistItems } from '@/hooks/useWatchlist';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useHydration } from '@/hooks/useHydration';
import WatchlistCard from './WatchlistCard';

interface WatchlistPanelProps {
  currentSymbol?: string;
}

export default function WatchlistPanel({ currentSymbol }: WatchlistPanelProps) {
  const hydrated = useHydration();
  const items = useWatchlistItems();
  const addItem = useWatchlist((s) => s.addItem);
  const removeItem = useWatchlist((s) => s.removeItem);
  const hasItem = useWatchlist((s) => s.hasItem);
  const symbols = items.map((i) => i.symbol);
  const { quotes } = useStockQuote(symbols);

  const quotesMap: Record<string, (typeof quotes)[number]> = {};
  for (const q of quotes) quotesMap[q.symbol] = q;

  if (!hydrated) {
    return (
      <div className="glass rounded-xl p-3">
        <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-2 px-1">รายการจับตา</div>
        <p className="text-[11px] text-dim text-center py-3">กำลังโหลด...</p>
      </div>
    );
  }

  const showAdd = currentSymbol && !hasItem(currentSymbol);
  const showRemove = currentSymbol && hasItem(currentSymbol);

  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-2 px-1">รายการจับตา</div>

      {currentSymbol && (
        <div className="mb-2">
          {showAdd && (
            <button
              onClick={() => addItem(currentSymbol)}
              className="w-full text-[11px] font-medium py-1.5 px-3 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/10 transition-all"
            >
              + เพิ่ม {currentSymbol}
            </button>
          )}
          {showRemove && (
            <button
              onClick={() => removeItem(currentSymbol)}
              className="w-full text-[11px] font-medium py-1.5 px-3 rounded-lg bg-red-dim text-red hover:bg-red/20 border border-red/10 transition-all"
            >
              ลบ {currentSymbol}
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[11px] text-dim text-center py-3">ยังไม่มีหุ้น</p>
      ) : (
        <div className="space-y-0.5">
          {items.map((item) => (
            <WatchlistCard
              key={item.symbol}
              symbol={item.symbol}
              quote={quotesMap[item.symbol]}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
