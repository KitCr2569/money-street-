'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { NewsArticle, NewsProvider } from '@/types';
import NewsTable from '@/components/news/NewsTable';
import NewsDigestModal from '@/components/news/NewsDigestModal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

type ProviderOption = NewsProvider | 'all';

function SkeletonRows() {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border last:border-b-0 animate-pulse">
          <div className="h-4 bg-surface-2 rounded w-4/5 mb-1.5" />
          <div className="h-3 bg-surface-2 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default function NewsPage() {
  const isAdmin = true;
  const isLocalDev = true;

  // Get watchlist symbols
  const lists = useWatchlist((s) => s.lists);
  const watchlistSymbols = useMemo(() => {
    const seen = new Set<string>();
    for (const list of lists) {
      for (const item of list.items) seen.add(item.symbol);
    }
    return [...seen];
  }, [lists]);

  const [activeSymbol, setActiveSymbol] = useState<string>('__watchlist__');
  const [provider, setProvider] = useState<ProviderOption>('moneystreet');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [digestArticle, setDigestArticle] = useState<NewsArticle | null>(null);

  // Fetch news based on active symbol
  useEffect(() => {
    setIsLoading(true);
    setError(false);

    const providerParam = provider === 'all' ? '' : `&provider=${provider}`;

    // MoneyStreet-only mode
    if (provider === 'moneystreet') {
      const msUrl = activeSymbol !== '__watchlist__' && activeSymbol !== '__all__'
        ? `/api/news/moneystreet?symbol=${encodeURIComponent(activeSymbol)}`
        : '/api/news/moneystreet';
      fetch(msUrl)
        .then((r) => r.json())
        .then((data) => { setArticles(Array.isArray(data) ? data : []); setIsLoading(false); })
        .catch(() => { setError(true); setIsLoading(false); });
      return;
    }

    // Fetch MoneyStreet news to merge with external sources
    const msPromise = fetch('/api/news/moneystreet').then((r) => r.json()).catch(() => []);

    if (activeSymbol === '__watchlist__') {
      const syms = watchlistSymbols.slice(0, 5);
      if (syms.length === 0) {
        msPromise.then((ms: NewsArticle[]) => { setArticles(ms); setIsLoading(false); });
        return;
      }

      Promise.all([
        Promise.allSettled(
          syms.map((s) =>
            fetch(`/api/yahoo/news?symbol=${encodeURIComponent(s)}${providerParam}`)
              .then((r) => r.json())
              .then((data: NewsArticle[]) => data.map((a) => ({
                ...a,
                relatedSymbols: a.relatedSymbols?.length ? a.relatedSymbols : [s],
              })))
          )
        ),
        msPromise,
      ]).then(([results, msArticles]) => {
        const all: NewsArticle[] = [...(msArticles as NewsArticle[])];
        for (const r of results) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            all.push(...r.value);
          }
        }
        const seen = new Set<string>();
        const unique = all.filter((a) => {
          if (seen.has(a.title)) return false;
          seen.add(a.title);
          return true;
        });
        unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setArticles(unique.slice(0, 30));
        setIsLoading(false);
      }).catch(() => { setError(true); setIsLoading(false); });
    } else if (activeSymbol === '__all__') {
      Promise.all([
        fetch(`/api/yahoo/news?${providerParam.replace('&', '')}`).then((r) => r.json()),
        msPromise,
      ]).then(([yahoo, ms]) => {
        const all = [...(ms as NewsArticle[]), ...(Array.isArray(yahoo) ? yahoo : [])];
        all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setArticles(all);
        setIsLoading(false);
      }).catch(() => { setError(true); setIsLoading(false); });
    } else {
      Promise.all([
        fetch(`/api/yahoo/news?symbol=${encodeURIComponent(activeSymbol)}${providerParam}`).then((r) => r.json()),
        fetch(`/api/news/moneystreet?symbol=${encodeURIComponent(activeSymbol)}`).then((r) => r.json()),
      ]).then(([yahoo, ms]) => {
        const all = [...(ms as NewsArticle[]), ...(Array.isArray(yahoo) ? yahoo : [])];
        all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setArticles(all);
        setIsLoading(false);
      }).catch(() => { setError(true); setIsLoading(false); });
    }
  }, [activeSymbol, provider, watchlistSymbols]);

  const handleAiDigest = useCallback((article: NewsArticle) => {
    setDigestArticle(article);
  }, []);

  const [readArticle, setReadArticle] = useState<NewsArticle | null>(null);

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-foreground">ข่าวหุ้น</h1>
        <div className="flex items-center gap-3">
          {!isLoading && articles.length > 0 && (
            <span className="text-[11px] text-dim">{articles.length} ข่าว</span>
          )}
          <Link
            href="/news/history"
            className="text-[12px] text-accent hover:text-accent/80 transition-colors"
          >
            ประวัติสรุปข่าว →
          </Link>
        </div>
      </div>
      <p className="text-xs text-dim mb-4">
        {activeSymbol === '__watchlist__'
          ? 'ข่าวเกี่ยวกับหุ้นในรายการจับตาของคุณ'
          : activeSymbol === '__all__'
          ? 'ข่าวตลาดทั่วไป'
          : `ข่าวเกี่ยวกับ ${activeSymbol}`}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <button
          onClick={() => setActiveSymbol('__watchlist__')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
            activeSymbol === '__watchlist__'
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground'
          }`}
        >
          📋 Watchlist ของฉัน
        </button>
        {watchlistSymbols.slice(0, 10).map((sym) => (
          <button
            key={sym}
            onClick={() => setActiveSymbol(activeSymbol === sym ? '__watchlist__' : sym)}
            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              activeSymbol === sym
                ? 'bg-accent text-background'
                : 'bg-surface border border-border text-dim hover:text-foreground'
            }`}
          >
            {sym}
          </button>
        ))}
        <button
          onClick={() => setActiveSymbol('__all__')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
            activeSymbol === '__all__'
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground'
          }`}
        >
          ข่าวทั่วไป
        </button>

        <div className="ml-auto flex gap-1">
          {(['all', 'moneystreet', 'yahoo', 'finnhub'] as ProviderOption[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                provider === p
                  ? p === 'moneystreet' ? 'bg-green/15 text-green border border-green/30' : 'bg-surface-2 text-foreground border border-border-hover'
                  : 'text-dim hover:text-foreground'
              }`}
            >
              {p === 'all' ? 'ทั้งหมด' : p === 'moneystreet' ? '🏠 MoneyStreet' : p === 'yahoo' ? 'Yahoo' : 'Finnhub'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red">ไม่สามารถโหลดข่าวได้</p>
          <p className="text-xs text-dim mt-1">กรุณาลองใหม่อีกครั้ง</p>
        </div>
      )}

      {isLoading && <SkeletonRows />}

      {!isLoading && !error && articles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-3xl mb-3 opacity-40">📰</div>
          <p className="text-sm text-dim">
            {activeSymbol === '__watchlist__' && watchlistSymbols.length === 0
              ? 'เพิ่มหุ้นใน watchlist เพื่อดูข่าวที่เกี่ยวข้อง'
              : 'ไม่พบข่าว'}
          </p>
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <NewsTable key={`${activeSymbol}-${provider}`} articles={articles} onAiDigest={isAdmin && isLocalDev ? handleAiDigest : undefined} onReadArticle={setReadArticle} />
      )}

      {digestArticle && (
        <NewsDigestModal
          open={!!digestArticle}
          onClose={() => setDigestArticle(null)}
          article={digestArticle}
        />
      )}

      {/* Read Article Modal */}
      {readArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReadArticle(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <h2 className="text-lg font-bold text-foreground leading-snug">{readArticle.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-[12px] text-dim">
                  <span className="text-green font-semibold">{readArticle.source}</span>
                  <span>·</span>
                  <span>{new Date(readArticle.pubDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  {readArticle.relatedSymbols.length > 0 && (
                    <>
                      <span>·</span>
                      {readArticle.relatedSymbols.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-blue/10 text-blue text-[10px] font-semibold">{s}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setReadArticle(null)}
                className="shrink-0 w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-dim hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5">
              {readArticle.content ? (
                <MarkdownRenderer content={readArticle.content} />
              ) : (
                <p className="text-[14px] text-foreground leading-relaxed">{readArticle.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
