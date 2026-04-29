'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface DigestItem {
  filename: string;
  title: string;
  source: string;
  date: string;
  time: string;
  pubDate: string;
  link: string;
  symbols: string[];
  summary: string;
}

const ITEMS_PER_PAGE = 10;

function formatTime(raw: string): string {
  const time = raw.replace(/^"|"$/g, '');
  if (time.length === 6) {
    return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
  }
  return time;
}

function formatDateThai(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function groupByDate(items: DigestItem[]): Record<string, DigestItem[]> {
  const groups: Record<string, DigestItem[]> = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

export default function NewsHistoryPage() {
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/ai/news-history')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadContent = useCallback(async (filename: string) => {
    if (selectedFile === filename) {
      setSelectedFile(null);
      setContent('');
      return;
    }
    setSelectedFile(filename);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/ai/news-history/${encodeURIComponent(filename)}`);
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
      setContent('ไม่สามารถโหลดผลสรุปได้');
    } finally {
      setContentLoading(false);
    }
  }, [selectedFile]);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, page]);

  const grouped = groupByDate(paginatedItems);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">ประวัติสรุปข่าว</h1>
          <p className="text-[12px] text-dim mt-0.5">
            ข่าวที่ AI สรุปไว้แล้ว {items.length} ข่าว · ดูย้อนหลังได้
          </p>
        </div>
        <Link
          href="/news"
          className="text-[12px] text-accent hover:text-accent/80 transition-colors"
        >
          ← กลับหน้าข่าว
        </Link>
      </div>

      {loading ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-dim text-[13px]">กำลังโหลด...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-[32px] mb-3 opacity-40">📰</div>
          <h2 className="text-[15px] font-semibold text-foreground mb-2">ยังไม่มีข่าวที่สรุป</h2>
          <p className="text-[12px] text-dim max-w-[360px] mx-auto">
            กดปุ่ม &quot;AI สรุป&quot; ที่การ์ดข่าวเพื่อให้ AI แปลและสรุปข่าวให้
          </p>
        </div>
      ) : (
        <>
          {dates.map((date) => (
            <div key={date} className="space-y-3">
              <h2 className="text-[13px] font-semibold text-dim px-1">
                {formatDateThai(date)}
              </h2>
              <div className="space-y-3">
                {grouped[date].map((item) => (
                  <div key={item.filename} className="glass rounded-xl border border-border overflow-hidden">
                    {/* Header — always visible */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start gap-3">
                        {/* Symbol badges on left */}
                        <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                          {item.symbols.length > 0 ? (
                            item.symbols.slice(0, 2).map((sym) => (
                              <Link
                                key={sym}
                                href={`/stock/${sym}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-12 text-center px-1.5 py-1 text-[10px] font-bold rounded-md bg-blue/10 text-blue hover:bg-blue/20 transition-colors"
                              >
                                {sym}
                              </Link>
                            ))
                          ) : (
                            <div className="w-12 h-8 rounded-md bg-purple/10 text-purple flex items-center justify-center text-[11px] font-bold">
                              AI
                            </div>
                          )}
                        </div>

                        {/* Title + meta */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[14px] font-semibold text-foreground leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-dim">
                            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] font-medium">
                              {item.source}
                            </span>
                            <span>{item.date} {formatTime(item.time)}</span>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent/80 transition-colors ml-auto"
                            >
                              ต้นฉบับ ↗
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Summary — always shown */}
                      {item.summary && (
                        <p className="mt-3 text-[13px] text-foreground/75 leading-relaxed pl-[60px]">
                          {item.summary}
                        </p>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => loadContent(item.filename)}
                      className={`w-full px-4 py-2 text-[11px] font-medium border-t transition-colors flex items-center justify-center gap-1.5 ${
                        selectedFile === item.filename
                          ? 'border-accent/30 bg-accent/5 text-accent'
                          : 'border-border text-dim hover:text-foreground hover:bg-surface-2'
                      }`}
                    >
                      {selectedFile === item.filename ? 'ซ่อนบทวิเคราะห์' : 'ดูบทวิเคราะห์เต็ม'}
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${
                          selectedFile === item.filename ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Full content — expandable */}
                    {selectedFile === item.filename && (
                      <div className="px-5 py-4 border-t border-border bg-surface-2/30 animate-in slide-in-from-top-2">
                        {contentLoading ? (
                          <div className="text-dim text-[13px]">กำลังโหลดผลสรุป...</div>
                        ) : (
                          <MarkdownRenderer content={content} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedFile(null); }}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
              >
                ← ก่อนหน้า
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setSelectedFile(null); }}
                    className={`w-8 h-8 rounded-lg text-[12px] font-medium transition-colors ${
                      p === page
                        ? 'bg-accent text-background'
                        : 'text-dim hover:text-foreground hover:bg-surface-2'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelectedFile(null); }}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
