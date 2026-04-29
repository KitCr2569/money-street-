'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Article {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  author: string;
  content: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'บทความ': 'bg-blue/10 text-blue border-blue/20',
  'กลยุทธ์': 'bg-green/10 text-green border-green/20',
  'มือใหม่': 'bg-yellow/10 text-yellow border-yellow/20',
  'วิเคราะห์': 'bg-purple/10 text-purple border-purple/20',
  'ข่าว': 'bg-red/10 text-red border-red/20',
  'เทคนิค': 'bg-accent/10 text-accent border-accent/20',
};

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ArticlePage({ params }: Props) {
  const { slug } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFound] = useState(false);

  // Validate slug: allow only lowercase alphanumeric and hyphens
  const isValidSlug = /^[a-z0-9\-]+$/.test(slug);

  useEffect(() => {
    if (!isValidSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetch(`/api/articles?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(setArticle)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-2 rounded w-24" />
          <div className="h-10 bg-surface-2 rounded w-3/4" />
          <div className="h-4 bg-surface-2 rounded w-48" />
          <div className="space-y-2 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-surface-2 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFoundState || !article) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-16 max-w-3xl mx-auto text-center">
        <div className="text-4xl mb-3 opacity-40">📝</div>
        <p className="text-dim">ไม่พบบทความ</p>
        <Link href="/articles" className="text-accent text-sm mt-3 inline-block">← กลับรายการบทความ</Link>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[article.category] ?? 'bg-surface-2 text-dim border-border';

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link href="/articles" className="text-[13px] text-dim hover:text-accent transition-colors mb-6 inline-block">
        ← บทความทั้งหมด
      </Link>

      {/* Article header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${catColor}`}>
            {article.category}
          </span>
          <span className="text-[12px] text-dim">{formatDate(article.date)}</span>
          <span className="text-[12px] text-dim">· {article.author}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
          {article.title}
        </h1>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/articles?tag=${tag}`}
                className="text-[11px] text-dim/70 bg-surface-2/50 px-2 py-0.5 rounded hover:text-accent transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Article body */}
      <div className="prose-custom">
        <MarkdownRenderer content={article.content} />
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
        <Link href="/articles" className="text-[13px] text-accent hover:text-accent/80 transition-colors">
          ← บทความทั้งหมด
        </Link>
        <span className="text-[11px] text-dim">Money Street © 2026</span>
      </div>
    </div>
  );
}
