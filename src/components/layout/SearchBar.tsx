'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { SearchResult } from '@/types';

export default function SearchBar() {
  const router = useRouter();
  const { addItem, hasItem } = useWatchlist();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchAdded, setBatchAdded] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect comma = batch mode
  const hasComma = query.includes(',');

  useEffect(() => {
    setBatchMode(hasComma);
  }, [hasComma]);

  // Single mode: search as you type
  useEffect(() => {
    if (batchMode) { setResults([]); setOpen(false); return; }
    if (query.trim().length < 1) { setResults([]); setOpen(false); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, batchMode]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(symbol: string) {
    setQuery('');
    setOpen(false);
    router.push(`/stock/${symbol}`);
  }

  // Batch add: parse comma-separated symbols, validate via search API, add to watchlist
  async function handleBatchAdd() {
    const symbols = query
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && s.length <= 6);

    if (symbols.length === 0) return;

    setLoading(true);
    setBatchAdded([]);
    setOpen(true);

    const added: string[] = [];

    // Validate each symbol via search API then add
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(sym)}`);
        const data: SearchResult[] = await res.json();
        // Find exact match or best match
        const exact = data.find((r) => r.symbol.toUpperCase() === sym);
        const match = exact ?? data[0];
        if (match) {
          addItem(match.symbol);
          added.push(match.symbol);
        }
        return match;
      })
    );

    // Collect validated results for display
    const validated: SearchResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) validated.push(r.value);
    }

    setBatchAdded(added);
    setResults(validated);
    setLoading(false);

    // Clear after 3 seconds
    setTimeout(() => {
      setQuery('');
      setOpen(false);
      setBatchAdded([]);
      setResults([]);
    }, 3000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && batchMode) {
      e.preventDefault();
      handleBatchAdd();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center bg-surface-2/80 border border-green/15 rounded-xl px-4 h-10 focus-within:border-green/40 focus-within:bg-surface-2 focus-within:shadow-[0_0_16px_rgba(52,211,153,0.08)] transition-all">
        <svg className="w-4 h-4 text-green/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ค้นหาหุ้น... (ใส่ , คั่นเพิ่มหลายตัว)"
          className="bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-dim/60 ml-2.5 w-full"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-green/20 border-t-green rounded-full animate-spin shrink-0" />
        )}
        {batchMode && !loading && (
          <button
            onClick={handleBatchAdd}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-green/15 text-green hover:bg-green/25 transition-colors font-semibold"
          >
            เพิ่มทั้งหมด
          </button>
        )}
      </div>

      {/* Batch mode hint */}
      {batchMode && !open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-2 border border-border rounded-lg shadow-2xl p-3 z-50">
          <p className="text-[11px] text-dim">
            กด <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-foreground font-mono text-[10px]">Enter</kbd> หรือปุ่ม &quot;เพิ่มทั้งหมด&quot; เพื่อเพิ่ม{' '}
            <span className="text-accent font-semibold">
              {query.split(/[,\s]+/).filter((s) => s.trim()).length} หุ้น
            </span>{' '}
            เข้า Watchlist
          </p>
        </div>
      )}

      {/* Batch result */}
      {open && batchMode && batchAdded.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-2 border border-border rounded-lg shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border/50 bg-green-dim/30">
            <span className="text-[11px] text-green font-medium">
              ✓ เพิ่ม {batchAdded.length} หุ้นเข้า Watchlist แล้ว
            </span>
          </div>
          {results.map((r) => {
            const added = batchAdded.includes(r.symbol);
            return (
              <div key={r.symbol} className="flex items-center px-3 py-1.5 gap-2">
                <span className={`text-[11px] ${added ? 'text-green' : 'text-red'}`}>
                  {added ? '✓' : '✗'}
                </span>
                <span className="font-mono text-xs font-semibold text-accent">{r.symbol}</span>
                <span className="text-xs text-dim truncate">{r.shortName}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Single mode dropdown */}
      {open && !batchMode && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-2 border border-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
          {results.map((r) => {
            const inWatchlist = hasItem(r.symbol);
            return (
              <div
                key={r.symbol}
                className="flex items-center px-3 py-2 hover:bg-surface-3 transition-colors gap-2"
              >
                <button
                  onClick={() => handleSelect(r.symbol)}
                  className="flex-1 text-left flex items-center gap-2 min-w-0"
                >
                  <span className="font-mono text-xs font-semibold text-accent">{r.symbol}</span>
                  <span className="text-xs text-dim truncate">{r.shortName}</span>
                  <span className="ml-auto text-[10px] text-dim/60">{r.exchange}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!inWatchlist) addItem(r.symbol);
                  }}
                  className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[13px] transition-all ${
                    inWatchlist
                      ? 'bg-green-dim text-green cursor-default'
                      : 'bg-surface-3 text-dim hover:bg-accent/20 hover:text-accent'
                  }`}
                  title={inWatchlist ? 'อยู่ในรายการจับตาแล้ว' : 'เพิ่มในรายการจับตา'}
                >
                  {inWatchlist ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
