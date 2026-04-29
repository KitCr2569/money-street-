'use client';

import { useState } from 'react';
import type { NewsArticle, NewsSentiment } from '@/types';
import AiSparkleIcon from './AiSparkleIcon';

const PAGE_SIZE = 15;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาที`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วัน`;

  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

const sentimentConfig: Record<NewsSentiment, { label: string; cls: string }> = {
  positive: { label: '🟢 เชิงบวก', cls: 'text-green' },
  negative: { label: '🔴 เชิงลบ', cls: 'text-red' },
  neutral:  { label: '🟡 เป็นกลาง', cls: 'text-yellow' },
};

interface NewsTableProps {
  articles: NewsArticle[];
  onAiDigest?: (article: NewsArticle) => void;
  onReadArticle?: (article: NewsArticle) => void;
}

export default function NewsTable({ articles, onAiDigest, onReadArticle }: NewsTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const paged = articles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid md:grid-cols-[72px_48px_1fr_140px_110px_90px] gap-3 px-4 py-2.5 bg-surface-2/60 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wide">
          <span>วันที่</span>
          <span></span>
          <span>ข่าว</span>
          <span>หุ้นที่เกี่ยวข้อง</span>
          <span>แหล่ง</span>
          <span>แนวโน้ม</span>
        </div>

        {/* Rows */}
        <div>
          {paged.map((article, i) => {
            const sentiment = article.sentiment ? sentimentConfig[article.sentiment] : null;
            const isOdd = i % 2 === 1;

            return (
              <div
                key={`${article.link}-${page}-${i}`}
                className={`group hover:bg-surface-2/50 transition-colors ${isOdd ? 'bg-surface-2/20' : ''}`}
              >
                {/* Desktop row */}
                <div className="hidden md:grid md:grid-cols-[72px_48px_1fr_140px_110px_90px] gap-3 px-4 py-3 items-center">
                  {/* Date */}
                  <span className="text-[10px] text-dim tabular-nums leading-tight">
                    {new Date(article.pubDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    <br />
                    <span className="text-dim/50">{new Date(article.pubDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>

                  {/* AI button — admin only */}
                  {onAiDigest ? (
                    <button
                      onClick={() => onAiDigest(article)}
                      title="AI สรุปข่าว"
                      className="hover:scale-110 active:scale-95 transition-transform"
                    >
                      <AiSparkleIcon size="md" />
                    </button>
                  ) : <div />}

                  {/* Title */}
                  <div className="min-w-0">
                    {article.link ? (
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-foreground leading-snug line-clamp-1 hover:text-blue transition-colors"
                      >
                        {article.title}
                      </a>
                    ) : (
                      <button
                        onClick={() => onReadArticle?.(article)}
                        className="text-left text-[13px] font-medium text-foreground leading-snug line-clamp-1 hover:text-green transition-colors"
                      >
                        {article.title}
                      </button>
                    )}
                    {article.description && (
                      <p className="text-[11px] text-dim line-clamp-1 mt-0.5 leading-snug">{article.description}</p>
                    )}
                  </div>

                  {/* Related symbols */}
                  <div className="flex gap-1 flex-wrap">
                    {article.relatedSymbols.length > 0 ? (
                      article.relatedSymbols.slice(0, 3).map((sym) => (
                        <span key={sym} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue/10 text-blue">
                          {sym}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-dim/50">—</span>
                    )}
                    {article.relatedSymbols.length > 3 && (
                      <span className="text-[10px] text-dim">+{article.relatedSymbols.length - 3}</span>
                    )}
                  </div>

                  {/* Source + provider */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                      article.provider === 'moneystreet' ? 'bg-green' : article.provider === 'finnhub' ? 'bg-purple' : 'bg-accent'
                    }`} />
                    <span className={`text-[11px] truncate ${article.provider === 'moneystreet' ? 'text-green font-semibold' : 'text-dim'}`}>
                      {article.source}
                    </span>
                  </div>

                  {/* Sentiment */}
                  <div>
                    {sentiment ? (
                      <span className={`text-[11px] font-medium ${sentiment.cls}`}>{sentiment.label}</span>
                    ) : (
                      <span className="text-[10px] text-dim/40">—</span>
                    )}
                  </div>
                </div>

                {/* Mobile row */}
                <div className="md:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    {onAiDigest && (
                      <button
                        onClick={() => onAiDigest(article)}
                        className="shrink-0 mt-0.5 hover:scale-110 active:scale-95 transition-transform"
                        title="AI สรุปข่าว"
                      >
                        <AiSparkleIcon size="sm" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 hover:text-blue transition-colors"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {article.relatedSymbols.slice(0, 4).map((sym) => (
                          <span key={sym} className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue/10 text-blue">
                            {sym}
                          </span>
                        ))}
                        {sentiment && (
                          <span className={`text-[10px] font-medium ${sentiment.cls}`}>{sentiment.label}</span>
                        )}
                        <span className="text-[10px] text-dim ml-auto">
                          {article.source} · {relativeTime(article.pubDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-[11px] text-dim">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, articles.length)} จาก {articles.length} ข่าว
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 text-[11px] rounded-md text-dim hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-[11px] rounded-md text-dim hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              ก่อนหน้า
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
              .reduce<(number | 'dots')[]>((acc, curr, idx, arr) => {
                if (idx > 0 && curr - (arr[idx - 1] as number) > 1) acc.push('dots');
                acc.push(curr);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'dots' ? (
                  <span key={`dots-${idx}`} className="px-1 text-[11px] text-dim">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-7 h-7 text-[11px] rounded-md transition-colors ${
                      page === item
                        ? 'bg-accent text-background font-semibold'
                        : 'text-dim hover:text-foreground hover:bg-surface-2'
                    }`}
                  >
                    {item + 1}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-2.5 py-1 text-[11px] rounded-md text-dim hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              ถัดไป
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page === totalPages - 1}
              className="px-2 py-1 text-[11px] rounded-md text-dim hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
