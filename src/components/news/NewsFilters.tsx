'use client';

import { useState, useEffect, useRef } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useHydration } from '@/hooks/useHydration';
import type { NewsProvider } from '@/types';

type ProviderOption = NewsProvider | 'all';

const providerTabs: { value: ProviderOption; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'yahoo', label: 'Yahoo' },
  { value: 'finnhub', label: 'Finnhub' },
];

interface NewsFiltersProps {
  onSymbolChange: (symbol: string) => void;
  onProviderChange: (provider: ProviderOption) => void;
  activeSymbol: string;
  activeProvider: ProviderOption;
}

export default function NewsFilters({ onSymbolChange, onProviderChange, activeSymbol, activeProvider }: NewsFiltersProps) {
  const [input, setInput] = useState(activeSymbol);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hydrated = useHydration();
  const lists = useWatchlist((s) => s.lists);
  const activeListId = useWatchlist((s) => s.activeListId);

  const watchlistItems = lists.find((l) => l.id === activeListId)?.items ?? [];

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      onSymbolChange(input.trim().toUpperCase());
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, onSymbolChange]);

  return (
    <div className="flex flex-col gap-3">
      {/* Provider tabs */}
      <div className="flex items-center gap-1">
        {providerTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onProviderChange(tab.value)}
            className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-colors ${
              activeProvider === tab.value
                ? 'bg-accent text-background'
                : 'text-dim hover:text-foreground hover:bg-surface-2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Symbol search */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ symbol เช่น AAPL, TSLA..."
          className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-blue"
        />
        {activeSymbol && (
          <button
            onClick={() => { setInput(''); onSymbolChange(''); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            ล้าง
          </button>
        )}
      </div>

      {/* Quick-filter pills */}
      {hydrated && watchlistItems.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted mr-1">เลือกเร็ว:</span>
          {watchlistItems.slice(0, 10).map((item) => (
            <button
              key={item.symbol}
              onClick={() => { setInput(item.symbol); onSymbolChange(item.symbol); }}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors ${
                activeSymbol === item.symbol
                  ? 'border-blue bg-blue/15 text-blue'
                  : 'border-border text-dim hover:text-foreground hover:bg-surface-2'
              }`}
            >
              {item.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
