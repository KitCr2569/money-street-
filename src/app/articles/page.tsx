'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface ArticleMeta {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  author: string;
  image?: string;
  excerpt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'บทความ': 'bg-blue/10 text-blue border-blue/20',
  'กลยุทธ์': 'bg-green/10 text-green border-green/20',
  'มือใหม่': 'bg-yellow/10 text-yellow border-yellow/20',
  'วิเคราะห์': 'bg-purple/10 text-purple border-purple/20',
  'ข่าว': 'bg-red/10 text-red border-red/20',
  'เทคนิค': 'bg-accent/10 text-accent border-accent/20',
};

const CATEGORY_ICONS: Record<string, string> = {
  'บทความ': '📰',
  'กลยุทธ์': '🎯',
  'มือใหม่': '🌱',
  'วิเคราะห์': '📊',
  'ข่าว': '📢',
  'เทคนิค': '⚙️',
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-surface-2 text-dim border-border';
}

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const ITEMS_PER_PAGE = 12;

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);

  // Read tag from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    if (tag) setTagFilter(tag);
  }, []);

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setArticles(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) set.add(a.category);
    return [...set].sort();
  }, [articles]);

  const allTags = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) {
      for (const t of a.tags) map[t] = (map[t] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (categoryFilter) list = list.filter((a) => a.category === categoryFilter);
    if (tagFilter) list = list.filter((a) => a.tags.includes(tagFilter));
    return list;
  }, [articles, categoryFilter, tagFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [categoryFilter, tagFilter]);

  // Featured = first 3 articles (only on page 1 with no filters)
  const showFeatured = page === 1 && !categoryFilter && !tagFilter;
  const featuredArticles = showFeatured ? articles.slice(0, 3) : [];
  const displayItems = showFeatured ? paginatedItems.filter((a) => !featuredArticles.includes(a)) : paginatedItems;

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) map[a.category] = (map[a.category] || 0) + 1;
    return map;
  }, [articles]);

  if (loading) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-2 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-surface-2 rounded-xl" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">บทความ</h1>
          <p className="text-[13px] text-dim mt-1">ความรู้การลงทุน กลยุทธ์ และวิเคราะห์ตลาดหุ้น · {articles.length} บทความ</p>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategoryFilter(categoryFilter === cat ? '' : cat); setTagFilter(''); }}
            className={`rounded-xl p-3 text-center transition-all border ${
              categoryFilter === cat
                ? getCatColor(cat) + ' ring-1 ring-current'
                : 'bg-surface border-border hover:border-accent/20 hover:bg-surface-2/50'
            }`}
          >
            <div className="text-lg mb-0.5">{CATEGORY_ICONS[cat] ?? '📄'}</div>
            <div className="text-[11px] font-semibold">{cat}</div>
            <div className="text-[10px] text-dim mt-0.5">{categoryCounts[cat]} บทความ</div>
          </button>
        ))}
      </div>

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.slice(0, 20).map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => { setTagFilter(tagFilter === tag ? '' : tag); setCategoryFilter(''); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                tagFilter === tag
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'bg-surface-2/50 text-dim hover:text-foreground hover:bg-surface-2'
              }`}
            >
              #{tag} <span className="opacity-50">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active filter indicator */}
      {(categoryFilter || tagFilter) && (
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-dim">กรอง:</span>
          {categoryFilter && (
            <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${getCatColor(categoryFilter)}`}>
              {categoryFilter}
            </span>
          )}
          {tagFilter && (
            <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[11px] font-semibold">
              #{tagFilter}
            </span>
          )}
          <button
            onClick={() => { setCategoryFilter(''); setTagFilter(''); }}
            className="text-dim hover:text-red transition-colors ml-1"
          >
            ✕ ล้าง
          </button>
          <span className="text-dim ml-auto">{filtered.length} บทความ</span>
        </div>
      )}

      {/* Featured section (page 1, no filters) */}
      {showFeatured && featuredArticles.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold text-dim mb-3">แนะนำ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="group bg-surface border border-border rounded-xl p-5 hover:border-accent/40 hover:bg-surface-2/30 transition-all flex flex-col"
              >
                <span className={`self-start px-2 py-0.5 rounded text-[10px] font-bold border ${getCatColor(article.category)}`}>
                  {article.category}
                </span>
                <h3 className="text-[14px] font-semibold text-foreground mt-3 group-hover:text-accent transition-colors line-clamp-2 leading-snug flex-1">
                  {article.title}
                </h3>
                <p className="text-[12px] text-dim mt-2 line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="text-[10px] text-dim mt-3">{formatDate(article.date)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-40">📝</div>
          <p className="text-dim text-sm">ไม่พบบทความ</p>
        </div>
      ) : (
        <div>
          {showFeatured && displayItems.length > 0 && (
            <h2 className="text-[13px] font-semibold text-dim mb-3">บทความทั้งหมด</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayItems.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="group bg-surface border border-border rounded-xl p-4 hover:border-accent/30 hover:bg-surface-2/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCatColor(article.category)}`}>
                    {article.category}
                  </span>
                  <span className="text-[10px] text-dim">{formatDate(article.date)}</span>
                </div>
                <h3 className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="text-[12px] text-dim mt-1.5 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                )}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] text-dim/50 bg-surface-2/50 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
          >
            ← ก่อนหน้า
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-2"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
