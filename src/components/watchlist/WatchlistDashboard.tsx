'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useMultiHistory } from '@/hooks/useMultiHistory';
import { useWatchlist, usePinnedSymbols } from '@/hooks/useWatchlist';
import { calculateCompositeScore, type CompositeResult } from '@/lib/composite-score';
import { getStockTags } from '@/lib/stock-tags';
import { useSettings } from '@/hooks/useSettings';
// Logos served from /logos/{SYMBOL}.png (static files)
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useAlertChecker } from '@/hooks/useAlertChecker';
import AIAnalysisModal from './AIAnalysisModal';
import TradeCalcModal from './TradeCalcModal';
import FlashValue from '@/components/ui/FlashValue';
import { PromptModal } from '@/components/ui/Modal';
import type { StockAnalysisInput } from '@/app/api/ai/analyze/route';
import type { HistoryResponse, RangeOption, SRLevel } from '@/types';

type SortKey = 'change' | 'symbol' | 'score' | 'volume';

const RANGES: { value: RangeOption; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

interface Props {
  symbols: string[];
  range: RangeOption;
  onRangeChange?: (range: RangeOption) => void;
  readOnly?: boolean;
}

// ── helpers ──

function getLatestRSI(hist: HistoryResponse): number | null {
  const pts = hist.indicators.rsi14;
  if (!pts.length) return null;
  return pts[pts.length - 1].value;
}

function getLatestEMA(hist: HistoryResponse, key: 'ema20' | 'ema50' | 'ema100'): number | null {
  const pts = hist.indicators[key];
  if (!pts.length) return null;
  return pts[pts.length - 1].value;
}

function getLatestPrice(hist: HistoryResponse): number | null {
  const c = hist.candles;
  if (!c.length) return null;
  return c[c.length - 1].close;
}

function getNearestSR(price: number, levels: SRLevel[]) {
  let nearestSupport: SRLevel | null = null;
  let nearestResistance: SRLevel | null = null;

  for (const lv of levels) {
    if (lv.price < price) {
      if (!nearestSupport || lv.price > nearestSupport.price) nearestSupport = lv;
    } else {
      if (!nearestResistance || lv.price < nearestResistance.price) nearestResistance = lv;
    }
  }

  return { nearestSupport, nearestResistance };
}

function getTrendDirection(hist: HistoryResponse): 'up' | 'down' | null {
  const longLower = hist.indicators.trendlines?.long?.lower;
  if (!longLower || longLower.length < 2) return null;
  const first = longLower[0].value;
  const last = longLower[longLower.length - 1].value;
  return last > first ? 'up' : 'down';
}

function rsiLabel(rsi: number): { text: string; color: string; bg: string } {
  if (rsi <= 30) return { text: '🟢 ขายมากเกิน', color: 'text-green', bg: 'bg-green-dim' };
  if (rsi >= 70) return { text: '🔴 ซื้อมากเกิน', color: 'text-red', bg: 'bg-red-dim' };
  return { text: '🟡 ปกติ', color: 'text-yellow', bg: 'bg-yellow-dim' };
}

function pctDist(from: number, to: number) {
  return ((to - from) / from) * 100;
}

function fmtVol(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}

const DEFAULT_COL_VISIBILITY: Record<string, boolean> = {
  volume: true,
  rsi: true,
  ema: true,
  support: true,
  resistance: true,
  trend: true,
  ath: true,
  score: true,
};

function loadColVisibility(): Record<string, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_COL_VISIBILITY };
  try {
    const raw = localStorage.getItem('ms_table_cols');
    if (raw) return { ...DEFAULT_COL_VISIBILITY, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_COL_VISIBILITY };
}

// ── component ──

export default function WatchlistDashboard({ symbols, range, onRangeChange, readOnly = false }: Props) {
  const isAdmin = true;
  const isPro = true;
  const isProduction = false;
  const { quotes, isLoading: quotesLoading } = useStockQuote(symbols);
  const { data: histMap, isLoading: histLoading } = useMultiHistory(symbols, range);
  // logoMap no longer needed — using static /logos/{sym}.png
  const removeItem = useWatchlist((s) => s.removeItem);
  const togglePin = useWatchlist((s) => s.togglePin);
  const pinnedArr = usePinnedSymbols();
  const pinnedSet = useMemo(() => new Set(pinnedArr), [pinnedArr]);
  const allAlerts = usePriceAlerts((s) => s.alerts);
  const addAlert = usePriceAlerts((s) => s.addAlert);
  const dismissAllForSymbol = usePriceAlerts((s) => s.dismissAllForSymbol);
  const removeAlert = usePriceAlerts((s) => s.removeAlert);
  useAlertChecker(quotes);
  const sortKey = useSettings((s) => s.watchlistSortKey) as SortKey;
  const sortAsc = useSettings((s) => s.watchlistSortAsc);
  const filter = useSettings((s) => s.watchlistFilter) as 'all' | 'oversold' | 'overbought' | 'buy';
  const setWatchlistSort = useSettings((s) => s.setWatchlistSort);
  const setFilter = useSettings((s) => s.setWatchlistFilter);
  const showTags = useSettings((s) => s.showTags);
  const toggleTags = useSettings((s) => s.toggleTags);
  const [aiModal, setAiModal] = useState<{ open: boolean; mode: 'single' | 'dashboard'; stocks: StockAnalysisInput[] }>({ open: false, mode: 'dashboard', stocks: [] });
  const [alertModal, setAlertModal] = useState<{ open: boolean; symbol: string; defaultPrice: string; direction: 'above' | 'below'; source: 'support' | 'resistance' }>({ open: false, symbol: '', defaultPrice: '', direction: 'below', source: 'support' });
  const [calcModal, setCalcModal] = useState<{ open: boolean; symbol: string; price: number | null }>({ open: false, symbol: '', price: null });
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(loadColVisibility);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const toggleColVisibility = useCallback((key: string) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('ms_table_cols', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!colMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [colMenuOpen]);

  // visibleColCount moved after effectiveCol definition

  const isLoading = quotesLoading || histLoading;

  // Build quote lookup
  const quoteMap: Record<string, (typeof quotes)[0]> = {};
  for (const q of quotes) quoteMap[q.symbol] = q;

  // Pre-compute scores for sorting & display
  const scoreMap: Record<string, CompositeResult> = {};
  for (const sym of symbols) {
    const quote = quoteMap[sym];
    const hist = histMap[sym];
    const rsi = hist ? getLatestRSI(hist) : null;
    const histPrice = hist ? getLatestPrice(hist) : null;
    const price = quote?.regularMarketPrice ?? histPrice;
    const ema20 = hist ? getLatestEMA(hist, 'ema20') : null;
    const ema50 = hist ? getLatestEMA(hist, 'ema50') : null;
    const ema100 = hist ? getLatestEMA(hist, 'ema100') : null;
    const sr = hist && price ? getNearestSR(price, hist.levels) : { nearestSupport: null, nearestResistance: null };
    const trend = hist ? getTrendDirection(hist) : null;
    scoreMap[sym] = calculateCompositeScore(
      rsi, price ?? null, ema20, ema50,
      sr.nearestSupport, sr.nearestResistance,
      trend, quote?.fiftyTwoWeekHigh ?? null,
      quote?.regularMarketChangePercent ?? null,
    );
  }

  // Build AI input data
  function buildAIInput(sym: string): StockAnalysisInput {
    const quote = quoteMap[sym];
    const hist = histMap[sym];
    const rsi = hist ? getLatestRSI(hist) : null;
    const histPrice = hist ? getLatestPrice(hist) : null;
    const price = quote?.regularMarketPrice ?? histPrice ?? 0;
    const ema20 = hist ? getLatestEMA(hist, 'ema20') : null;
    const ema50 = hist ? getLatestEMA(hist, 'ema50') : null;
    const ema100 = hist ? getLatestEMA(hist, 'ema100') : null;
    const sr = hist && price ? getNearestSR(price, hist.levels) : { nearestSupport: null, nearestResistance: null };
    const trend = hist ? getTrendDirection(hist) : null;
    const sc = scoreMap[sym];
    return {
      symbol: sym,
      shortName: quote?.shortName,
      price,
      changePct: quote?.regularMarketChangePercent ?? 0,
      rsi, ema20, ema50, ema100,
      support: sr.nearestSupport?.price ?? null,
      resistance: sr.nearestResistance?.price ?? null,
      trend,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
      compositeScore: sc?.score ?? 0,
      scoreBreakdown: sc?.breakdown ?? { rsi: 0, ema: 0, sr: 0, trend: 0, ath: 0 },
    };
  }

  function openAISingle(sym: string) {
    setAiModal({ open: true, mode: 'single', stocks: [buildAIInput(sym)] });
  }

  function openAIDashboard() {
    setAiModal({ open: true, mode: 'dashboard', stocks: filteredSymbols.map(buildAIInput) });
  }

  // Sort symbols (pinned always on top)
  const sortedSymbols = [...symbols].sort((a, b) => {
    const aPinned = pinnedSet.has(a);
    const bPinned = pinnedSet.has(b);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    if (sortKey === 'symbol') {
      return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
    }
    if (sortKey === 'score') {
      return sortAsc
        ? scoreMap[a].score - scoreMap[b].score
        : scoreMap[b].score - scoreMap[a].score;
    }
    if (sortKey === 'volume') {
      const va = quoteMap[a]?.regularMarketVolume ?? 0;
      const vb = quoteMap[b]?.regularMarketVolume ?? 0;
      return sortAsc ? va - vb : vb - va;
    }
    // sort by change %
    const ca = quoteMap[a]?.regularMarketChangePercent ?? 0;
    const cb = quoteMap[b]?.regularMarketChangePercent ?? 0;
    return sortAsc ? ca - cb : cb - ca;
  });

  // Filter symbols
  const filteredSymbols = sortedSymbols.filter((sym) => {
    if (filter === 'all') return true;
    const hist = histMap[sym];
    const rsi = hist ? getLatestRSI(hist) : null;
    if (filter === 'oversold') return rsi !== null && rsi <= 30;
    if (filter === 'overbought') return rsi !== null && rsi >= 70;
    if (filter === 'buy') return scoreMap[sym]?.score >= 2;
    return true;
  });

  function toggleFilter(key: typeof filter) {
    setFilter(filter === key ? 'all' : key);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setWatchlistSort(key, !sortAsc);
    } else {
      setWatchlistSort(key, key === 'symbol');
    }
  }

  // Compute summary stats + detect which columns have data
  let oversoldCount = 0;
  let overboughtCount = 0;
  let buySignalCount = 0;
  let hasRSI = false;
  let hasEMA = false;
  let hasTrend = false;
  let hasSupport = false;
  let hasResistance = false;

  for (const sym of symbols) {
    const hist = histMap[sym];
    if (!hist) continue;
    const rsi = getLatestRSI(hist);
    if (rsi !== null) {
      hasRSI = true;
      if (rsi <= 30) oversoldCount++;
      if (rsi >= 70) overboughtCount++;
    }
    if (getLatestEMA(hist, 'ema20') !== null) hasEMA = true;
    if (getTrendDirection(hist) !== null) hasTrend = true;
    const price = quoteMap[sym]?.regularMarketPrice ?? getLatestPrice(hist);
    if (price) {
      const sr = getNearestSR(price, hist.levels);
      if (sr.nearestSupport) hasSupport = true;
      if (sr.nearestResistance) hasResistance = true;
    }
    if (scoreMap[sym]?.score >= 2) buySignalCount++;
  }

  // Auto-hide columns that have no data for current range or are pro-only
  const effectiveCol = (key: string) => {
    if (!columnVisibility[key]) return false;
    // Free users: columns shown but values are censored (handled in render)
    if (key === 'rsi' && !hasRSI) return false;
    if (key === 'ema' && !hasEMA) return false;
    if (key === 'trend' && !hasTrend) return false;
    if (key === 'support' && !hasSupport) return false;
    if (key === 'resistance' && !hasResistance) return false;
    return true;
  };

  const visibleColCount = 4 + ['volume', 'rsi', 'ema', 'support', 'resistance', 'trend', 'ath', 'score'].filter((k) => effectiveCol(k)).length;

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + sort + columns + TF — single row */}
      <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
        {/* Filters */}
        {([
          { label: `ทั้งหมด ${symbols.length}`, key: 'all' as const, emoji: '📊', active: filter === 'all', onClick: () => setFilter('all') },
          { label: `Oversold ${oversoldCount}`, key: 'oversold' as const, emoji: '🟢', active: filter === 'oversold', onClick: () => toggleFilter('oversold') },
          { label: `Overbought ${overboughtCount}`, key: 'overbought' as const, emoji: '🔴', active: filter === 'overbought', onClick: () => toggleFilter('overbought') },
          { label: `สัญญาณซื้อ ${buySignalCount}`, key: 'buy' as const, emoji: '🔥', active: filter === 'buy', onClick: () => toggleFilter('buy') },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={f.onClick}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              f.active
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface border border-border text-dim hover:text-foreground'
            }`}
          >
            {f.emoji} {f.label}
          </button>
        ))}

        {/* Separator */}
        <span className="text-border">|</span>

        {/* Sort */}
        <span className="text-dim">เรียง:</span>
        {([
          { key: 'change' as SortKey, label: 'เปลี่ยนแปลง' },
          { key: 'volume' as SortKey, label: 'โวลุ่ม' },
          { key: 'symbol' as SortKey, label: 'ชื่อหุ้น' },
          { key: 'score' as SortKey, label: 'สัญญาณ' },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => handleSort(s.key)}
            className={`px-2 py-1 rounded-md font-semibold transition-all ${
              sortKey === s.key
                ? 'bg-accent/15 text-accent'
                : 'text-dim hover:text-foreground hover:bg-surface-2'
            }`}
          >
            {s.label} {sortKey === s.key ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        ))}

        {/* Right side: Tag + AI + Column + TF */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggleTags}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              showTags
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface border border-border text-dim hover:text-foreground'
            }`}
          >
            🏷️ Tag
          </button>
          {!readOnly && !isProduction && isAdmin && (
            <button
              onClick={openAIDashboard}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg font-semibold bg-surface border border-border text-dim hover:text-accent hover:border-accent/30 transition-all"
            >
              🤖 AI
            </button>
          )}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen((v) => !v)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                colMenuOpen ? 'bg-accent/15 text-accent' : 'text-dim hover:text-foreground hover:bg-surface-2'
              }`}
              title="ตั้งค่าคอลัมน์"
            >
              ⚙ คอลัมน์
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
                {([
                  { key: 'volume', label: 'โวลุ่ม' },
                  { key: 'rsi', label: 'RSI' },
                  { key: 'ema', label: 'สัญญาณ EMA' },
                  { key: 'support', label: 'แนวรับ' },
                  { key: 'resistance', label: 'แนวต้าน' },
                  { key: 'trend', label: 'เทรนด์' },
                  { key: 'ath', label: 'ATH' },
                  { key: 'score', label: 'สัญญาณ' },
                ]).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColVisibility(col.key)}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-2 transition-colors flex items-center gap-2 text-[13px]"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-[11px] ${
                      columnVisibility[col.key]
                        ? 'bg-accent/20 border-accent/50 text-accent'
                        : 'border-border text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className={columnVisibility[col.key] ? 'text-foreground' : 'text-dim'}>{col.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {onRangeChange && (
            <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => onRangeChange(r.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    range === r.value
                      ? 'bg-accent text-background'
                      : 'text-dim hover:text-foreground hover:bg-surface-2'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border text-[12px] font-semibold text-dim uppercase tracking-widest">
                <th className="text-left py-2.5 px-3">
                  <button onClick={() => handleSort('symbol')} className={`hover:text-foreground transition-colors ${sortKey === 'symbol' ? 'text-accent' : ''}`}>
                    ชื่อหุ้น {sortKey === 'symbol' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="text-right py-2.5 px-3">ราคา</th>
                <th className="text-right py-2.5 px-3">
                  <button onClick={() => handleSort('change')} className={`hover:text-foreground transition-colors ${sortKey === 'change' ? 'text-accent' : ''}`}>
                    เปลี่ยนแปลง {sortKey === 'change' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                {effectiveCol('support') && <th className="text-right py-2.5 px-3">แนวรับ</th>}
                {effectiveCol('resistance') && <th className="text-right py-2.5 px-3">แนวต้าน</th>}
                {columnVisibility.volume && <th className="text-right py-2.5 px-3">โวลุ่ม</th>}
                {effectiveCol('rsi') && <th className="text-center py-2.5 px-3">RSI(14)</th>}
                {effectiveCol('ema') && <th className="text-center py-2.5 px-3">สัญญาณ EMA</th>}
                {effectiveCol('trend') && <th className="text-center py-2.5 px-3">เทรนด์</th>}
                {columnVisibility.ath && <th className="text-center py-2.5 px-3">ATH</th>}
                {columnVisibility.score && (
                  <th className="text-center py-2.5 px-3">
                    <button onClick={() => handleSort('score')} className={`hover:text-foreground transition-colors ${sortKey === 'score' ? 'text-accent' : ''}`}>
                      สัญญาณ {sortKey === 'score' ? (sortAsc ? '↑' : '↓') : ''}
                    </button>
                  </th>
                )}
                {!readOnly && <th className="text-center py-2.5 px-3"></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && symbols.length > 0 && (
                <tr>
                  <td colSpan={visibleColCount} className="text-center py-8 text-dim text-[15px]">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredSymbols.map((sym, idx) => {
                  const quote = quoteMap[sym];
                  const hist = histMap[sym];
                  const rsi = hist ? getLatestRSI(hist) : null;
                  const histPrice = hist ? getLatestPrice(hist) : null;
                  const price = quote?.regularMarketPrice ?? histPrice;
                  const ema20 = hist ? getLatestEMA(hist, 'ema20') : null;
                  const ema50 = hist ? getLatestEMA(hist, 'ema50') : null;
                  const ema100 = hist ? getLatestEMA(hist, 'ema100') : null;
                  const sr = hist && price ? getNearestSR(price, hist.levels) : { nearestSupport: null, nearestResistance: null };
                  const trend = hist ? getTrendDirection(hist) : null;
                  const changePct = quote?.regularMarketChangePercent ?? 0;
                  const changePositive = changePct >= 0;
                  const isPinned = pinnedSet.has(sym);
                  // Show dashed separator between pinned and unpinned groups
                  const showSeparator = pinnedSet.size > 0 && isPinned === false && idx > 0 && pinnedSet.has(filteredSymbols[idx - 1]);
                  // Alert state for this row
                  const symAlerts = allAlerts.filter((a) => a.symbol === sym);
                  const hasTriggeredAlert = symAlerts.some((a) => a.triggered && !a.dismissed);
                  const supportAlert = symAlerts.find((a) => !a.triggered && a.source === 'support');
                  const resistanceAlert = symAlerts.find((a) => !a.triggered && a.source === 'resistance');

                  return (
                    <tr
                      key={sym}
                      className={`border-b border-border hover:bg-surface-2 transition-colors ${isPinned ? 'bg-accent/[0.03]' : ''} ${showSeparator ? 'border-t border-t-accent/20 border-dashed' : ''} ${hasTriggeredAlert ? 'alert-row ring-1 ring-yellow/20' : ''}`}
                      onClick={hasTriggeredAlert ? () => dismissAllForSymbol(sym) : undefined}
                    >
                      {/* Symbol + Pin + AI */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {!readOnly && (
                            <button
                              onClick={() => togglePin(sym)}
                              className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[16px] transition-all hover:scale-110 ${
                                isPinned ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-dim hover:bg-accent/10'
                              }`}
                              title={isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
                            >
                              📌
                            </button>
                          )}
                          {!readOnly && (isProduction ? isPro : isAdmin) && (
                            <button
                              onClick={() => openAISingle(sym)}
                              className="shrink-0 w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center text-[16px] hover:bg-accent/25 transition-all hover:scale-110"
                              title={isProduction ? 'ผลวิเคราะห์' : 'AI วิเคราะห์'}
                            >
                              {isProduction ? '📊' : '🤖'}
                            </button>
                          )}
                          <img
                            src={`/logos/${sym}.png`}
                            alt={sym}
                            className="shrink-0 w-8 h-8 rounded-md object-contain bg-white/5"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden shrink-0 w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center text-[11px] font-bold text-dim">
                            {sym.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {readOnly ? (
                                <span className="font-semibold text-[15px] text-foreground">{sym}</span>
                              ) : (
                                <>
                                  <Link href={`/stock/${sym}/profile`} className="font-semibold text-[15px] text-accent hover:underline">
                                    {sym}
                                  </Link>
                                  <Link href={`/stock/${sym}`} className="text-dim hover:text-accent transition-colors" title="ดูกราฟ">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
                                    </svg>
                                  </Link>
                                  <button
                                    onClick={() => setCalcModal({ open: true, symbol: sym, price: price ?? null })}
                                    className="text-dim hover:text-yellow transition-colors"
                                    title="คำนวณกำไร"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <rect x="4" y="2" width="16" height="20" rx="2" />
                                      <rect x="7" y="5" width="10" height="4" rx="1" />
                                      <line x1="7" y1="12" x2="9" y2="12" />
                                      <line x1="11" y1="12" x2="13" y2="12" />
                                      <line x1="15" y1="12" x2="17" y2="12" />
                                      <line x1="7" y1="15" x2="9" y2="15" />
                                      <line x1="11" y1="15" x2="13" y2="15" />
                                      <line x1="15" y1="15" x2="17" y2="15" />
                                      <line x1="7" y1="18" x2="9" y2="18" />
                                      <line x1="11" y1="18" x2="13" y2="18" />
                                      <line x1="15" y1="18" x2="17" y2="18" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            {quote?.shortName && (
                              <div className="text-[12px] text-dim truncate max-w-[160px]">{quote.shortName}</div>
                            )}
                            {showTags && (() => {
                              const tags = getStockTags(sym, quote);
                              if (!tags.length) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {tags.map((tag) => (
                                    <span key={tag.label} className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${tag.bg} ${tag.color}`}>
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="text-right py-2.5 px-3 font-mono text-[15px] text-foreground">
                        <FlashValue value={price}>
                          {price != null ? price.toFixed(2) : '—'}
                        </FlashValue>
                        {(() => {
                          const state = quote?.marketState?.toUpperCase() ?? '';
                          if (state === 'REGULAR') return null;
                          // Show extended hours price (pre-market first, fallback post-market)
                          const extPrice = quote?.preMarketPrice ?? quote?.postMarketPrice;
                          const extPct = quote?.preMarketPrice
                            ? (quote.preMarketChangePercent ?? 0)
                            : (quote?.postMarketChangePercent ?? 0);
                          if (!extPrice) return null;
                          return (
                            <div className={`text-[11px] mt-0.5 ${extPct >= 0 ? 'text-green' : 'text-red'}`}>
                              <span className="text-purple-400 mr-1">นอกเวลา</span>
                              {extPrice.toFixed(2)} ({extPct >= 0 ? '+' : ''}{extPct.toFixed(2)}%)
                            </div>
                          );
                        })()}
                      </td>

                      {/* Change % */}
                      <td className={`text-right py-2.5 px-3 font-mono text-[14px] ${changePositive ? 'text-green' : 'text-red'}`}>
                        <FlashValue value={changePct}>
                          {quote ? `${changePositive ? '▲' : '▼'} ${changePositive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                        </FlashValue>
                      </td>

                      {/* Support */}
                      {effectiveCol('support') && (
                        <td className="text-right py-2.5 px-3">
                          {readOnly ? (
                            <span className="font-mono text-[13px] text-green/40 blur-[3px] select-none">🛡️ ***.**</span>
                          ) : sr.nearestSupport && price ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-[13px] text-green">🛡️ {sr.nearestSupport.price.toFixed(2)}</span>
                              {supportAlert ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeAlert(supportAlert.id); }}
                                  className="font-mono text-[11px] text-yellow hover:text-red transition-colors flex items-center gap-0.5"
                                  title={`แจ้งเตือนที่ ${supportAlert.targetPrice.toFixed(2)} — กดเพื่อยกเลิก`}
                                >
                                  🔔 {supportAlert.targetPrice.toFixed(2)}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAlertModal({ open: true, symbol: sym, defaultPrice: sr.nearestSupport!.price.toFixed(2), direction: 'below', source: 'support' }); }}
                                  className="font-mono text-[11px] text-dim hover:text-yellow transition-colors flex items-center gap-0.5"
                                  title="ตั้งแจ้งเตือนแนวรับ"
                                >
                                  🔕 {pctDist(price, sr.nearestSupport.price).toFixed(1)}%
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      )}

                      {/* Resistance */}
                      {effectiveCol('resistance') && (
                        <td className="text-right py-2.5 px-3">
                          {readOnly ? (
                            <span className="font-mono text-[13px] text-red/40 blur-[3px] select-none">🚧 ***.**</span>
                          ) : sr.nearestResistance && price ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-[13px] text-red">🚧 {sr.nearestResistance.price.toFixed(2)}</span>
                              {resistanceAlert ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeAlert(resistanceAlert.id); }}
                                  className="font-mono text-[11px] text-yellow hover:text-red transition-colors flex items-center gap-0.5"
                                  title={`แจ้งเตือนที่ ${resistanceAlert.targetPrice.toFixed(2)} — กดเพื่อยกเลิก`}
                                >
                                  🔔 {resistanceAlert.targetPrice.toFixed(2)}
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAlertModal({ open: true, symbol: sym, defaultPrice: sr.nearestResistance!.price.toFixed(2), direction: 'above', source: 'resistance' }); }}
                                  className="font-mono text-[11px] text-dim hover:text-yellow transition-colors flex items-center gap-0.5"
                                  title="ตั้งแจ้งเตือนแนวต้าน"
                                >
                                  🔕 +{pctDist(price, sr.nearestResistance.price).toFixed(1)}%
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      )}

                      {/* Volume */}
                      {columnVisibility.volume && (
                        <td className="text-right py-2.5 px-3 font-mono text-[13px] text-dim">
                          {fmtVol(quote?.regularMarketVolume)}
                        </td>
                      )}

                      {/* RSI */}
                      {effectiveCol('rsi') && (
                        <td className="text-center py-2.5 px-3">
                          {rsi !== null ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-mono text-[14px] text-foreground">{rsi.toFixed(1)}</span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${rsiLabel(rsi).bg} ${rsiLabel(rsi).color}`}>
                                {rsiLabel(rsi).text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      )}

                      {/* EMA Signal */}
                      {effectiveCol('ema') && (
                        <td className="text-center py-2.5 px-3">
                          {price != null && (ema20 !== null || ema50 !== null || ema100 !== null) ? (
                            <div className="flex items-center justify-center gap-2">
                              {ema20 !== null && (
                                <span className={`text-[13px] font-mono ${price > ema20 ? 'text-green' : 'text-red'}`}>
                                  {price > ema20 ? '🟢' : '🔻'} 20
                                </span>
                              )}
                              {ema50 !== null && (
                                <span className={`text-[13px] font-mono ${price > ema50 ? 'text-green' : 'text-red'}`}>
                                  {price > ema50 ? '🟢' : '🔻'} 50
                                </span>
                              )}
                              {ema100 !== null && (
                                <span className={`text-[13px] font-mono ${price > ema100 ? 'text-green' : 'text-red'}`}>
                                  {price > ema100 ? '🟢' : '🔻'} 100
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      )}

                      {/* Trend */}
                      {effectiveCol('trend') && (
                        <td className="text-center py-2.5 px-3">
                          {trend ? (
                            <span className={`text-[14px] ${trend === 'up' ? 'text-green' : 'text-red'}`}>
                              {trend === 'up' ? '🚀 ขึ้น' : '📉 ลง'}
                            </span>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      )}

                      {/* ATH */}
                      {columnVisibility.ath && (
                        <td className="text-center py-2.5 px-3">
                          {(() => {
                            const high52 = quote?.fiftyTwoWeekHigh;
                            if (!high52 || !price) return <span className="text-dim">—</span>;
                            const diff = ((price - high52) / high52) * 100;
                            const isATH = diff >= -0.5;
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono text-[13px] text-dim">{high52.toFixed(2)}</span>
                                <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${
                                  isATH
                                    ? 'bg-green-dim text-green'
                                    : diff >= -10
                                    ? 'bg-yellow-dim text-yellow'
                                    : 'bg-red-dim text-red'
                                }`}>
                                  {isATH ? '🔥 ATH' : `${diff.toFixed(1)}%`}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      {/* Signal */}
                      {effectiveCol('score') && (
                        <td className="text-center py-2.5 px-3">
                          {readOnly ? (
                            <div className="flex flex-col items-center gap-0.5 blur-[3px] select-none">
                              <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg bg-surface-2 text-dim">🔒 ???</span>
                            </div>
                          ) : (() => {
                            const result = scoreMap[sym];
                            if (!result) return <span className="text-dim">—</span>;
                            const { score, emoji, label, color, bg, breakdown } = result;
                            const b = breakdown;
                            const tip = `RSI: ${b.rsi > 0 ? '+' : ''}${b.rsi} | EMA: ${b.ema > 0 ? '+' : ''}${b.ema} | S/R: ${b.sr > 0 ? '+' : ''}${b.sr} | Trend: ${b.trend > 0 ? '+' : ''}${b.trend} | ATH: ${b.ath > 0 ? '+' : ''}${b.ath}`;
                            return (
                              <div className="flex flex-col items-center gap-0.5" title={tip}>
                                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg ${bg} ${color}`}>
                                  {emoji} {label}
                                </span>
                                <span className={`font-mono text-[12px] ${color}`}>
                                  {score > 0 ? '+' : ''}{score}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      {/* Remove */}
                      {!readOnly && (
                        <td className="text-center py-2.5 px-3">
                          <button
                            onClick={() => removeItem(sym)}
                            className="text-dim hover:text-red transition-colors text-[16px] hover:scale-110"
                            title="ลบออกจากรายการจับตา"
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-yellow/8 border border-yellow/20 text-center">
        <span className="text-[18px] shrink-0">⚠️</span>
        <p className="text-[12px] text-yellow font-medium leading-relaxed">
          Signal เป็นเพียงเครื่องมือช่วยวิเคราะห์จาก Technical Analysis <span className="font-bold text-yellow">ไม่ใช่คำแนะนำทางการเงิน</span> — ควรศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจลงทุน
        </p>
      </div>

      {/* AI Modal */}
      <AIAnalysisModal
        open={aiModal.open}
        onClose={() => setAiModal((prev) => ({ ...prev, open: false }))}
        mode={aiModal.mode}
        stocks={aiModal.stocks}
        range={range}
      />

      {/* Trade Calculator Modal */}
      <TradeCalcModal
        open={calcModal.open}
        onClose={() => setCalcModal((prev) => ({ ...prev, open: false }))}
        symbol={calcModal.symbol}
        currentPrice={calcModal.price}
      />

      {/* Price Alert Modal */}
      <PromptModal
        open={alertModal.open}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
        onConfirm={(val) => {
          const price = parseFloat(val);
          if (!isNaN(price) && price > 0) {
            addAlert(alertModal.symbol, price, alertModal.direction, alertModal.source);
          }
        }}
        title={`🔔 ตั้งแจ้งเตือน ${alertModal.symbol} — ${alertModal.source === 'support' ? 'แนวรับ' : 'แนวต้าน'}`}
        placeholder="กรอกราคาที่ต้องการแจ้งเตือน"
        defaultValue={alertModal.defaultPrice}
        confirmLabel="ตั้งแจ้งเตือน"
      />
    </div>
  );
}

function SummaryCard({ label, value, color, bg, emoji, active, onClick }: {
  label: string; value: number; color: string; bg: string; emoji: string;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass rounded-xl p-3 text-left transition-all ${
        active
          ? 'ring-1 ring-accent/50 bg-accent/5'
          : 'hover:bg-surface-2 opacity-70 hover:opacity-100'
      }`}
    >
      <div className="text-[12px] font-semibold text-dim uppercase tracking-widest mb-1">{emoji} {label}</div>
      <div className={`flex items-center gap-2`}>
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <span className={`font-mono font-bold text-[18px] ${color}`}>{value}</span>
        </div>
      </div>
    </button>
  );
}
