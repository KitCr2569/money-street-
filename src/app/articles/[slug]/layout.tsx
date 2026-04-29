import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';

const VALID_SLUG = /^[a-z0-9\-]+$/;

interface FrontMatter {
  title?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  date?: string;
  author?: string;
}

function parseFrontMatter(content: string): FrontMatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: FrontMatter = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'title') fm.title = value;
    if (key === 'excerpt') fm.excerpt = value;
    if (key === 'category') fm.category = value;
    if (key === 'author') fm.author = value;
    if (key === 'date') fm.date = value;
    if (key === 'tags') {
      const tagsMatch = line.match(/\[([^\]]*)\]/);
      if (tagsMatch) {
        fm.tags = tagsMatch[1].split(',').map((t) => t.trim());
      }
    }
  }
  return fm;
}

function findArticleBySlug(slug: string): FrontMatter | null {
  try {
    const articlesDir = path.join(process.cwd(), 'data', 'articles');
    const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
      const fm = parseFrontMatter(content);
      const fileSlug = file.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.md$/, '');
      if (fileSlug === slug || fm.title) {
        // Check slug field in frontmatter
        const slugMatch = content.match(/^slug:\s*(.+)$/m);
        const fmSlug = slugMatch ? slugMatch[1].trim() : fileSlug;
        if (fmSlug === slug || fileSlug === slug) return fm;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!VALID_SLUG.test(slug)) return notFound();
  const fm = findArticleBySlug(slug);

  if (!fm || !fm.title) {
    return {
      title: 'บทความ | Money Street',
      description: 'อ่านบทความการลงทุนจาก Money Street',
    };
  }

  const description = fm.excerpt ?? `${fm.title} — บทความการลงทุนจาก Money Street`;
  const url = `https://moneystreet.co/articles/${slug}`;

  return {
    title: fm.title,
    description,
    keywords: fm.tags ?? [],
    authors: fm.author ? [{ name: fm.author }] : [{ name: 'Money Street' }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${fm.title} | Money Street`,
      description,
      url,
      type: 'article',
      publishedTime: fm.date ? new Date(fm.date).toISOString() : undefined,
      authors: fm.author ? [fm.author] : ['Money Street'],
      tags: fm.tags,
      siteName: 'Money Street',
    },
    twitter: {
      card: 'summary_large_image',
      title: fm.title,
      description,
    },
  };
}

interface LayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function ArticleSlugLayout({ params, children }: LayoutProps) {
  const { slug } = await params;
  if (!VALID_SLUG.test(slug)) return notFound();
  const fm = findArticleBySlug(slug);

  const jsonLd = fm?.title
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: fm.title,
        description: fm.excerpt ?? fm.title,
        datePublished: fm.date ? new Date(fm.date).toISOString() : undefined,
        dateModified: fm.date ? new Date(fm.date).toISOString() : undefined,
        author: {
          '@type': 'Organization',
          name: fm.author ?? 'Money Street',
          url: 'https://moneystreet.co',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Money Street',
          url: 'https://moneystreet.co',
          logo: {
            '@type': 'ImageObject',
            url: 'https://moneystreet.co/logo.png',
          },
        },
        url: `https://moneystreet.co/articles/${slug}`,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://moneystreet.co/articles/${slug}`,
        },
        keywords: fm.tags?.join(', '),
        articleSection: fm.category,
        inLanguage: 'th',
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
