'use client';

import { useState, useRef, useEffect } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useHydration } from '@/hooks/useHydration';
import { STOCK_CATEGORIES } from '@/lib/stock-categories';
import type { StockCategory } from '@/lib/stock-categories';
import Link from 'next/link';

export default function DiscoverPage() {
  const hydrated = useHydration();
  const lists = useWatchlist((s) => s.lists);
  const addItem = useWatchlist((s) => s.addItem);
  const setActiveList = useWatchlist((s) => s.setActiveList);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedMap, setAddedMap] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerFor(null);
      }
    }
    if (pickerFor) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [pickerFor]);

  function handleAddToList(symbol: string, listId: string) {
    const prev = useWatchlist.getState().activeListId;
    setActiveList(listId);
    addItem(symbol);
    setActiveList(prev);
    const listName = lists.find((l) => l.id === listId)?.name ?? '';
    setAddedMap((m) => ({ ...m, [symbol]: listName }));
    setPickerFor(null);
    setTimeout(() => {
      setAddedMap((m) => {
        const next = { ...m };
        delete next[symbol];
        return next;
      });
    }, 2000);
  }

  function handleAddAllToList(cat: StockCategory, listId: string) {
    const prev = useWatchlist.getState().activeListId;
    setActiveList(listId);
    for (const stock of cat.stocks) {
      addItem(stock.symbol);
    }
    setActiveList(prev);
    const listName = lists.find((l) => l.id === listId)?.name ?? '';
    for (const stock of cat.stocks) {
      setAddedMap((m) => ({ ...m, [stock.symbol]: listName }));
    }
    setPickerFor(null);
    setTimeout(() => {
      setAddedMap((m) => {
        const next = { ...m };
        for (const stock of cat.stocks) delete next[stock.symbol];
        return next;
      });
    }, 2000);
  }

  if (!hydrated) {
    return (
      <div className="px-4 lg:px-6 py-8">
        <div className="text-dim text-[13px]">กำลังโหลด...</div>
      </div>
    );
  }

  const filtered = activeCategory
    ? STOCK_CATEGORIES.filter((c) => c.id === activeCategory)
    : STOCK_CATEGORIES;

  return (
    <div className="px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">หมวดหุ้นแนะนำ</h1>
        <p className="text-[14px] text-dim mt-0.5">
          สำรวจหุ้นตามหมวดหมู่ แล้วเพิ่มเข้า watchlist ได้ทันที
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
            activeCategory === null
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2'
          }`}
        >
          ทั้งหมด
        </button>
        {STOCK_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? 'bg-accent text-background'
                : 'bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            <span className={`text-[11px] ${activeCategory === cat.id ? 'text-background/60' : 'text-dim/50'}`}>
              {cat.stocks.length}
            </span>
          </button>
        ))}
      </div>

      {/* Category Cards */}
      <div className="space-y-6">
        {filtered.map((cat) => (
          <div key={cat.id} className="glass rounded-xl overflow-hidden">
            {/* Category Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center text-lg`}>
                  {cat.icon}
                </div>
                <div>
                  <h2 className={`text-[15px] font-semibold ${cat.color}`}>{cat.name}</h2>
                  <p className="text-[12px] text-dim">{cat.stocks.length} หุ้น</p>
                </div>
              </div>
              {/* Add all button */}
              <div className="relative">
                <button
                  onClick={() => setPickerFor(pickerFor === `all-${cat.id}` ? null : `all-${cat.id}`)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-surface-2 border border-border text-dim hover:text-accent hover:border-accent/30 transition-all"
                >
                  + เพิ่มทั้งหมวด
                </button>
                {pickerFor === `all-${cat.id}` && (
                  <WatchlistPicker
                    ref={pickerRef}
                    lists={lists}
                    onSelect={(listId) => handleAddAllToList(cat, listId)}
                  />
                )}
              </div>
            </div>

            {/* Stock Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {cat.stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="group relative px-5 py-3.5 border-b border-r border-border/30 hover:bg-surface-2/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Link href={`/stock/${stock.symbol}/profile`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-foreground">{stock.symbol}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${cat.bg} ${cat.color} font-medium`}>
                          {cat.name.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[12px] text-dim mt-0.5 truncate">{stock.name}</p>
                      <p className="text-[11px] text-dim/60 mt-0.5 truncate">{stock.desc}</p>
                    </Link>

                    {/* Add button */}
                    <div className="relative ml-2 shrink-0">
                      {addedMap[stock.symbol] ? (
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center text-green-400 text-[14px]">
                          ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => setPickerFor(pickerFor === stock.symbol ? null : stock.symbol)}
                          className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-dim hover:text-accent hover:border-accent/30 flex items-center justify-center text-[16px] font-light transition-all"
                          title="เพิ่มเข้า watchlist"
                        >
                          +
                        </button>
                      )}
                      {pickerFor === stock.symbol && (
                        <WatchlistPicker
                          ref={pickerRef}
                          lists={lists}
                          onSelect={(listId) => handleAddToList(stock.symbol, listId)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Added toast */}
                  {addedMap[stock.symbol] && (
                    <div className="absolute bottom-1 right-2 text-[10px] text-green-400 font-medium animate-in fade-in slide-in-from-bottom-1 duration-200">
                      เพิ่มใน {addedMap[stock.symbol]} แล้ว
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Watchlist Picker Dropdown ──

import { forwardRef } from 'react';
import type { WatchlistList } from '@/types';

interface WatchlistPickerProps {
  lists: WatchlistList[];
  onSelect: (listId: string) => void;
}

const WatchlistPicker = forwardRef<HTMLDivElement, WatchlistPickerProps>(
  function WatchlistPicker({ lists, onSelect }, ref) {
    return (
      <div
        ref={ref}
        className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-3 py-2 border-b border-border/50">
          <p className="text-[11px] font-semibold text-dim uppercase tracking-wider">เพิ่มเข้า watchlist</p>
        </div>
        <div className="py-1 max-h-48 overflow-y-auto">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelect(list.id)}
              className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-surface-2 transition-colors flex items-center justify-between"
            >
              <span className="truncate">{list.name}</span>
              <span className="text-[11px] text-dim ml-2">{list.items.length}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);
