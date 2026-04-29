'use client';

import { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import type { SearchResult } from '@/types';

const inputCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-dim focus:outline-none focus:border-accent/40 font-mono transition-colors';

export default function AddHoldingForm() {
  const { addLot } = usePortfolio();
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  // Autocomplete state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (symbol.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(symbol)}`);
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
  }, [symbol]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(sym: string) {
    setSymbol(sym);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const sym = symbol.trim().toUpperCase();
    const sh = parseFloat(shares);
    const pr = parseFloat(price);
    if (!sym) return setError('กรุณาระบุชื่อหุ้น');
    if (isNaN(sh) || sh <= 0) return setError('จำนวนหุ้นต้องมากกว่า 0');
    if (isNaN(pr) || pr <= 0) return setError('ราคาต้องมากกว่า 0');
    addLot(sym, { shares: sh, price: pr, date: date || new Date().toISOString().split('T')[0] });
    setSymbol(''); setShares(''); setPrice(''); setDate('');
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-4 relative z-20">
      <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-3">เพิ่มหุ้น</div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* Symbol input with autocomplete */}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true); }}
              placeholder="ชื่อหุ้น"
              className={inputCls + ' w-full pr-7'}
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-[1.5px] border-dim border-t-accent rounded-full animate-spin" />
            )}
          </div>

          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-52 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => handleSelect(r.symbol)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-3 transition-colors text-left"
                >
                  <span className="font-mono text-xs font-semibold text-accent">{r.symbol}</span>
                  <span className="text-xs text-dim truncate">{r.shortName}</span>
                  <span className="ml-auto text-[10px] text-dim/60 shrink-0">{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="จำนวนหุ้น" step="any" className={inputCls} />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ราคาซื้อ" step="any" className={inputCls} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        <button type="submit" className="bg-accent text-background rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent/85 transition-colors">
          เพิ่ม
        </button>
      </div>
      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </form>
  );
}
