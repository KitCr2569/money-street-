'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockQuote } from '@/hooks/useStockQuote';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface AnalysisItem {
  filename: string;
  symbol: string;
  date: string;
  time: string;
  range: string;
  mode: 'single' | 'dashboard';
}

const ITEMS_PER_PAGE = 20;

const RANGE_LABELS: Record<string, string> = {
  '6mo': 'วิเคราะห์เทคนิค',
  '1mo': 'รายเดือน',
  '1w': 'รายสัปดาห์',
  '1y': 'ระยะยาว',
  'financial-analysis': 'วิเคราะห์งบการเงิน',
  'financial': 'วิเคราะห์งบการเงิน',
};

function formatTime(time: string): string {
  if (time.length === 6) {
    return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
  }
  return time;
}

function formatDate(date: string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
}

function groupByDate(items: AnalysisItem[]): Record<string, AnalysisItem[]> {
  const groups: Record<string, AnalysisItem[]> = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

function StockLogo({ symbol }: { symbol: string }) {
  return (
    <img
      src={`/logos/${symbol}.png`}
      alt={symbol}
      className="w-10 h-10 rounded-lg object-contain bg-white/5"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
}

function StockFallback({ symbol }: { symbol: string }) {
  return (
    <div className="hidden w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center text-[12px] font-bold text-dim">
      {symbol.slice(0, 3)}
    </div>
  );
}

export default function AnalysisHistoryPage() {
  const isPro = true;

  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Get unique symbols for quote lookup
  const allSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.mode !== 'dashboard') set.add(item.symbol);
    }
    return [...set];
  }, [items]);

  const { quotes } = useStockQuote(allSymbols);
  const quoteMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of quotes) map[q.symbol] = q.shortName;
    return map;
  }, [quotes]);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    fetch('/api/ai/history')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isPro]);

  const loadContent = useCallback(async (filename: string) => {
    if (selectedFile === filename) {
      setSelectedFile(null);
      setContent('');
      return;
    }
    setSelectedFile(filename);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(filename)}`);
      const data = await res.json();
      let text = data.content ?? '';
      if (text.startsWith('---')) {
        const endIdx = text.indexOf('---', 3);
        if (endIdx > 0) {
          text = text.slice(endIdx + 3).trim();
        }
      }
      setContent(text);
    } catch {
      setContent('ไม่สามารถโหลดผลวิเคราะห์ได้');
    } finally {
      setContentLoading(false);
    }
  }, [selectedFile]);

  // Pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const grouped = groupByDate(paginatedItems);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (!isPro) {
    return (
      <div className="py-6 space-y-6 max-w-4xl mx-auto px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">บทวิเคราะห์ล่าสุด</h1>
          <p className="text-[12px] text-dim mt-0.5">บทวิเคราะห์หุ้นจากทีมงาน AI — อัปเดตทุกวัน</p>
        </div>
        <div>
          <div className="glass rounded-xl p-12 space-y-3">
            <div className="h-12 bg-surface-3 rounded-lg w-2/3" />
            <div className="h-12 bg-surface-3 rounded-lg w-1/2" />
            <div className="h-12 bg-surface-3 rounded-lg w-3/4" />
            <div className="h-12 bg-surface-3 rounded-lg w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">บทวิเคราะห์ล่าสุด</h1>
          <p className="text-[12px] text-dim mt-0.5">บทวิเคราะห์หุ้นจากทีมงาน AI — อัปเดตทุกวัน</p>
        </div>
        {!loading && items.length > 0 && (
          <span className="text-[12px] text-dim">{items.length} บทวิเคราะห์</span>
        )}
      </div>

      {loading ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-dim text-[13px]">กำลังโหลด...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-[32px] mb-3 opacity-40">📊</div>
          <h2 className="text-[15px] font-semibold text-foreground mb-2">ยังไม่มีบทวิเคราะห์</h2>
          <p className="text-[12px] text-dim max-w-[360px] mx-auto">
            บทวิเคราะห์จากทีมงานจะแสดงที่นี่ ติดตามอัปเดตใหม่ทุกวัน
          </p>
        </div>
      ) : (
        <>
          {dates.map((date) => (
            <div key={date} className="space-y-2">
              <h2 className="text-[13px] font-semibold text-dim px-1">{formatDate(date)}</h2>
              <div className="space-y-2">
                {grouped[date].map((item) => {
                  const companyName = quoteMap[item.symbol] || '';
                  const rangeLabel = RANGE_LABELS[item.range?.toLowerCase()] || item.range;
                  const isFinancial = item.range?.toLowerCase().includes('financial');

                  return (
                    <div key={item.filename}>
                      <button
                        onClick={() => loadContent(item.filename)}
                        className={`w-full text-left glass rounded-xl p-4 hover:bg-surface-2 transition-all border ${
                          selectedFile === item.filename
                            ? 'border-accent/50 bg-surface-2'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.mode === 'dashboard' ? (
                              <div className="w-10 h-10 rounded-lg bg-purple/15 flex items-center justify-center text-[16px]">
                                📊
                              </div>
                            ) : (
                              <div className="relative">
                                <StockLogo symbol={item.symbol} />
                                <StockFallback symbol={item.symbol} />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-semibold text-foreground">
                                  {item.mode === 'dashboard' ? 'วิเคราะห์รายการจับตา' : item.symbol}
                                </span>
                                {companyName && (
                                  <span className="text-[12px] text-dim truncate max-w-[200px]">
                                    {companyName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-dim mt-0.5">
                                {formatDate(item.date)} · วิเคราะห์โดย MoneyStreet AI Systems
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              isFinancial
                                ? 'bg-green/10 text-green'
                                : 'bg-surface-2 text-dim'
                            } uppercase`}>
                              {rangeLabel}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              item.mode === 'dashboard'
                                ? 'bg-purple/10 text-purple'
                                : 'bg-blue/10 text-blue'
                            }`}>
                              {item.mode === 'dashboard' ? 'แดชบอร์ด' : 'เดี่ยว'}
                            </span>
                            <svg
                              className={`w-4 h-4 text-dim transition-transform ${
                                selectedFile === item.filename ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {selectedFile === item.filename && (
                        <div className="mt-1 glass rounded-xl p-5 border border-border animate-in slide-in-from-top-2">
                          {contentLoading ? (
                            <div className="text-dim text-[13px]">กำลังโหลดผลวิเคราะห์...</div>
                          ) : (
                            <div className="max-w-none">
                              <MarkdownRenderer content={content} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedFile(null); }}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-surface border border-border text-dim hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-dim px-1">...</span>
                    )}
                    <button
                      onClick={() => { setPage(p); setSelectedFile(null); }}
                      className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-all ${
                        page === p
                          ? 'bg-accent text-background'
                          : 'bg-surface border border-border text-dim hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelectedFile(null); }}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-surface border border-border text-dim hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ถัดไป
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
