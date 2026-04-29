'use client';

import type { NewsArticle, NewsSentiment } from '@/types';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;

  return new Date(dateStr).toLocaleDateString('th-TH');
}

const sentimentConfig: Record<NewsSentiment, { label: string; color: string; bg: string }> = {
  positive: { label: '🟢 เชิงบวก', color: 'text-green', bg: 'bg-green/10 border-green/20' },
  negative: { label: '🔴 เชิงลบ', color: 'text-red', bg: 'bg-red/10 border-red/20' },
  neutral:  { label: '🟡 กลางๆ', color: 'text-yellow', bg: 'bg-yellow/10 border-yellow/20' },
};

interface NewsCardProps {
  article: NewsArticle;
  onAiDigest?: (article: NewsArticle) => void;
}

export default function NewsCard({ article, onAiDigest }: NewsCardProps) {
  const sentiment = article.sentiment ? sentimentConfig[article.sentiment] : null;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 hover:bg-card/80 hover:border-border/80 transition-all group">
      {article.imageUrl && (
        <a href={article.link} target="_blank" rel="noopener noreferrer">
          <div className="mb-3 rounded-lg overflow-hidden bg-surface-2 aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        </a>
      )}

      {/* Sentiment + Provider badges */}
      <div className="flex items-center gap-1.5 mb-2">
        {sentiment && (
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${sentiment.bg} ${sentiment.color}`}>
            {sentiment.label}
          </span>
        )}
        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
          article.provider === 'finnhub'
            ? 'bg-purple/10 text-purple'
            : 'bg-surface-2 text-dim'
        }`}>
          {article.provider === 'finnhub' ? 'Finnhub' : 'Yahoo'}
        </span>
      </div>

      <a href={article.link} target="_blank" rel="noopener noreferrer">
        <h3 className="text-sm font-medium text-foreground leading-snug mb-1.5 line-clamp-2 hover:text-blue transition-colors">
          {article.title}
        </h3>
      </a>

      {article.description && (
        <p className="text-xs text-dim leading-relaxed mb-2 line-clamp-2">
          {article.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{article.source}</span>
          <span>·</span>
          <span>{relativeTime(article.pubDate)}</span>
        </div>

        {onAiDigest && (
          <button
            onClick={() => onAiDigest(article)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 hover:border-purple/30 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V11h3a3 3 0 0 1 3 3v1.5a2.5 2.5 0 0 1-2.5 2.5H17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2H6.5A2.5 2.5 0 0 1 4 15.5V14a3 3 0 0 1 3-3h3V9.4A4 4 0 0 1 8 6a4 4 0 0 1 4-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            AI สรุป
          </button>
        )}
      </div>

      {article.relatedSymbols.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {article.relatedSymbols.map((sym) => (
            <span
              key={sym}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue/10 text-blue"
            >
              {sym}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
