'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWatchlist, useWatchlistItems } from '@/hooks/useWatchlist';
import { useSettings } from '@/hooks/useSettings';
import { useHydration } from '@/hooks/useHydration';
import WatchlistDashboard from '@/components/watchlist/WatchlistDashboard';
import { PromptModal } from '@/components/ui/Modal';
import ManageWatchlistModal from '@/components/watchlist/ManageWatchlistModal';
import MarketStatus from '@/components/ui/MarketStatus';
import FearGreedIndex from '@/components/ui/FearGreedIndex';
import type { RangeOption } from '@/types';

const MAG7_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];

export default function WatchlistPage() {
  return (
    <Suspense>
      <WatchlistPageInner />
    </Suspense>
  );
}

function WatchlistPageInner() {
  const isFreeUser = false;

  const hydrated = useHydration();
  const items = useWatchlistItems();
  const addItem = useWatchlist((s) => s.addItem);
  const lists = useWatchlist((s) => s.lists);
  const activeListId = useWatchlist((s) => s.activeListId);
  const setActiveList = useWatchlist((s) => s.setActiveList);
  const createListFn = useWatchlist((s) => s.createList);

  const showAll = useSettings((s) => s.watchlistShowAll);
  const setShowAll = useSettings((s) => s.setWatchlistShowAll);

  const searchParams = useSearchParams();
  const range = useSettings((s) => s.watchlistRange);
  const setRange = useSettings((s) => s.setWatchlistRange);

  // All unique symbols across every list
  const allSymbols = useMemo(() => {
    const seen = new Set<string>();
    for (const list of lists) {
      for (const item of list.items) seen.add(item.symbol);
    }
    return [...seen];
  }, [lists]);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [manageModal, setManageModal] = useState(false);

  useEffect(() => {
    if (isFreeUser) return; // Free users cannot import
    const importParam = searchParams.get('import');
    if (importParam && hydrated) {
      const listName = searchParams.get('list');
      if (listName) {
        createListFn(listName);
      }
      const syms = importParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      for (const sym of syms) addItem(sym);
      window.history.replaceState(null, '', '/');
    }
  }, [searchParams, hydrated, addItem, createListFn, isFreeUser]);

  if (!hydrated) {
    return (
      <div className="px-4 lg:px-6 py-8">
        <div className="text-dim text-[13px]">กำลังโหลด...</div>
      </div>
    );
  }

  // Free users: only Mag 7, read-only
  const symbols = isFreeUser
    ? MAG7_SYMBOLS
    : showAll ? allSymbols : items.map((i) => i.symbol);

  return (
    <div className="px-4 lg:px-6 py-6 space-y-4">
      {/* Header row 1: Title + MarketStatus */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">แดชบอร์ดรายการจับตา</h1>
        <MarketStatus />
      </div>

      {/* Header row 2: Watchlist tabs (left) + Upgrade Banner / Fear & Greed (right) */}
      <div className="flex items-center justify-between gap-3">
        {isFreeUser ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-accent text-background">
              Magnificent 7
            </span>
          </div>
        ) : (
          /* Pro user: full tabs */
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <button
              onClick={() => setShowAll(true)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                showAll
                  ? 'bg-accent text-background'
                  : 'bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className={`text-[11px] ${showAll ? 'text-background/60' : 'text-dim/50'}`}>
                {allSymbols.length}
              </span>
            </button>
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => { setShowAll(false); setActiveList(list.id); }}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                  !showAll && activeListId === list.id
                    ? 'bg-accent text-background'
                    : 'bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2'
                }`}
              >
                <span>{list.name}</span>
                <span className={`text-[11px] ${!showAll && activeListId === list.id ? 'text-background/60' : 'text-dim/50'}`}>
                  {list.items.length}
                </span>
              </button>
            ))}
            <button
              onClick={() => setCreateModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-[13px] font-semibold bg-surface border border-dashed border-border text-dim hover:text-accent hover:border-accent/40 transition-all"
              title="สร้างรายการใหม่"
            >
              + สร้าง
            </button>
            <button
              onClick={() => setManageModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-[13px] font-semibold bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2 transition-all"
              title="จัดการรายการ"
            >
              ⚙ จัดการ
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {isFreeUser && (
            <a href="/pricing" className="group flex items-center gap-2.5 px-4 py-2 rounded-lg border border-green/30 bg-green/8 hover:bg-green/15 hover:border-green/50 transition-all">
              <span className="text-[15px]">⭐</span>
              <div className="hidden sm:block">
                <div className="text-[12px] font-bold text-green leading-tight">อัปเกรด Pro</div>
                <div className="text-[10px] text-dim"><span className="line-through">฿199</span> <span className="text-green font-bold">฿89/ด.</span></div>
              </div>
              <span className="px-3 py-1 rounded-md bg-green text-black text-[11px] font-bold group-hover:bg-green/90 transition-colors">
                ซื้อเลย
              </span>
            </a>
          )}
          <FearGreedIndex />
        </div>
      </div>

      {/* Content */}
      {symbols.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-[32px] mb-3 opacity-40">📋</div>
          <h2 className="text-[15px] font-semibold text-foreground mb-2">รายการจับตาว่างเปล่า</h2>
          <p className="text-[12px] text-dim mb-4 max-w-[360px] mx-auto">
            เพิ่มหุ้นเข้ารายการจับตาจากหน้ารายละเอียดหุ้น เพื่อติดตามสัญญาณและหาจังหวะซื้อ-ขาย
          </p>
          <button
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('header input[placeholder*="ค้นหา"]');
              if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-2 text-[12px] font-medium text-accent hover:bg-surface-3 transition-colors"
          >
            ค้นหาหุ้น
          </button>
        </div>
      ) : (
        <WatchlistDashboard symbols={symbols} range={range} onRangeChange={setRange} readOnly={isFreeUser} />
      )}

      {/* Modals — Pro only */}
      {!isFreeUser && (
        <>
          <PromptModal
            open={createModal}
            onClose={() => setCreateModal(false)}
            onConfirm={(name) => createListFn(name)}
            title="สร้างรายการใหม่"
            placeholder="ชื่อรายการ เช่น เทค, ปันผล, ETF"
            confirmLabel="สร้าง"
          />
          <ManageWatchlistModal
            open={manageModal}
            onClose={() => setManageModal(false)}
          />
        </>
      )}
    </div>
  );
}
