import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate } from '@/lib/helpers';
import { extractHeadings } from '@/lib/content';
import PostContent from '@/components/post-content';
import ReadingProgress from '@/components/reading-progress';
import TableOfContents from '@/components/table-of-contents';
import RelatedPosts from '@/components/related-posts';
import ViewTracker from '@/components/view-tracker';
import ShareButtons from '@/components/share-buttons';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';
const AUTHOR_NAME = 'Muhammet Fatih Işık';

// Her yazıya özel meta üretir
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (!post) {
    return {
      title: 'Yazı bulunamadı',
      robots: { index: false, follow: false },
    };
  }

  const url = `${SITE_URL}/yazi/${post.slug}`;
  const imageUrl = post.cover_image_url || `${SITE_URL}/yazi/${post.slug}/opengraph-image`;
  const description = post.excerpt || post.subtitle || `${post.title} — ${AUTHOR_NAME}`;

  return {
    title: post.title,
    description,
    keywords: [...(post.tags || []), post.category, 'türkçe blog'],
    authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description,
      siteName: 'Zihin Haritası',
      locale: 'tr_TR',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [AUTHOR_NAME],
      section: post.category,
      tags: post.tags,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: post.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  let query = supabase.from('posts').select('*').eq('slug', params.slug);
  if (!isAdmin) query = query.eq('is_published', true);
  const { data: post } = await query.single();

  if (!post) notFound();

  let relatedPosts: any[] = [];
  if (post.is_published) {
    const { data: sameCategory } = await supabase
      .from('posts')
      .select('id, slug, title, cover_image_url, category, published_at')
      .eq('is_published', true)
      .eq('category', post.category)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3);

    relatedPosts = sameCategory || [];
    if (relatedPosts.length < 3) {
      const { data: recent } = await supabase
        .from('posts')
        .select('id, slug, title, cover_image_url, category, published_at')
        .eq('is_published', true)
        .neq('id', post.id)
        .order('published_at', { ascending: false })
        .limit(3 + relatedPosts.length);
      const usedIds = new Set(relatedPosts.map((p) => p.id));
      for (const p of recent || []) {
        if (relatedPosts.length >= 3) break;
        if (usedIds.has(p.id)) continue;
        relatedPosts.push(p);
        usedIds.add(p.id);
      }
    }
  }

  const category = CATEGORIES.find((c) => c.slug === post.category);
  const url = `${SITE_URL}/yazi/${post.slug}`;
  const imageUrl = post.cover_image_url || `${SITE_URL}/yazi/${post.slug}/opengraph-image`;
  const headings = extractHeadings(post.content, post.content_format);

  // JSON-LD Article schema (Google için)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.subtitle,
    image: imageUrl,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    inLanguage: 'tr-TR',
    wordCount: (post.content || '').split(/\s+/).length,
    keywords: (post.tags || []).join(', '),
    articleSection: category?.name || post.category,
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana sayfa',
        item: SITE_URL,
      },
      ...(category ? [{
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${SITE_URL}/kategori/${category.slug}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: category ? 3 : 2,
        name: post.title,
        item: url,
      },
    ],
  };

  return (
    <article className="post-detail">
      {post.is_published && !isAdmin && <ViewTracker slug={post.slug} />}
      {post.is_published && <ReadingProgress targetId="post-article-body" />}

      <Script
        id="schema-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="schema-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Ana sayfa</Link>
        <span className="breadcrumb-sep">›</span>
        {category && (
          <>
            <Link href={`/kategori/${category.slug}`}>{category.name}</Link>
            <span className="breadcrumb-sep">›</span>
          </>
        )}
        <span>{post.title}</span>
      </nav>

      {isAdmin && (
        <div className="admin-bar">
          <span>
            {post.is_published ? '✓ Yayında' : '⚠ Taslak'} ·{' '}
            {post.view_count || 0} görüntülenme
          </span>
          <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm">
            Düzenle
          </Link>
        </div>
      )}

      <header className="post-header">
        {category && (
          <Link href={`/kategori/${category.slug}`} className="post-category-large"
            style={{ background: `${category.color}15`, color: category.color }}>
            {category.name}
          </Link>
        )}
        <h1 className="post-title">{post.title}</h1>
        {post.subtitle && <p className="post-subtitle">{post.subtitle}</p>}
        <div className="post-byline">
          <div className="author-avatar">M</div>
          <div className="author-info">
            <span className="author-name">{AUTHOR_NAME}</span>
            <span className="post-byline-meta">
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              {' · '}{post.reading_minutes} dk okuma
            </span>
          </div>
        </div>
      </header>

      {post.cover_image_url && (
        <div className="post-cover">
          <Image src={post.cover_image_url} alt={post.title} fill sizes="(max-width: 768px) 100vw, 720px" style={{ objectFit: 'cover' }} priority />
        </div>
      )}

      {headings.length >= 3 && <TableOfContents headings={headings} />}

      <div id="post-article-body">
        <PostContent content={post.content} format={post.content_format} />
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag: string) => (
            <span key={tag} className="post-tag">#{tag}</span>
          ))}
        </div>
      )}

      <footer className="post-footer">
        <h3 className="post-footer-title">Bu yazıyı paylaş</h3>
        <ShareButtons url={url} title={post.title} />
      </footer>

      <RelatedPosts posts={relatedPosts} />
    </article>
  );
}
