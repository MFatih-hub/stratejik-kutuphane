import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, stripHtml } from '@/lib/helpers';
import PostContent from '@/components/post-content';
import ViewTracker from '@/components/view-tracker';
import ShareButtons from '@/components/share-buttons';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';
const AUTHOR_NAME = 'Muhammet Fatih Işık';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .eq('post_type', 'okuma_bulteni')
    .single();

  if (!post) {
    return { title: 'Paylaşım bulunamadı', robots: { index: false, follow: false } };
  }

  const url = `${SITE_URL}/okuma-bulteni/${post.slug}`;
  const description = post.excerpt || post.source_summary || post.title;

  return {
    title: post.title,
    description,
    keywords: [...(post.tags || []), post.category, 'okuma bülteni'],
    authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
    alternates: { canonical: url },
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
      section: 'Okuma Bülteni',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  };
}

export default async function OkumaBulteniDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  let query = supabase.from('posts').select('*').eq('slug', params.slug).eq('post_type', 'okuma_bulteni');
  if (!isAdmin) query = query.eq('is_published', true);
  const { data: post } = await query.single();

  if (!post) notFound();

  const hasComment = !!post.content && stripHtml(post.content).length > 0;

  let relatedItems: any[] = [];
  if (post.is_published) {
    const { data: sameCategory } = await supabase
      .from('posts')
      .select('id, slug, title, source_name, category, published_at')
      .eq('is_published', true)
      .eq('post_type', 'okuma_bulteni')
      .eq('category', post.category)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(4);
    relatedItems = sameCategory || [];
  }

  const category = CATEGORIES.find((c) => c.slug === post.category);
  const url = `${SITE_URL}/okuma-bulteni/${post.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.source_summary,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    publisher: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    inLanguage: 'tr-TR',
    articleSection: 'Okuma Bülteni',
    ...(post.source_url ? { citation: post.source_url } : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Okuma Bülteni', item: `${SITE_URL}/okuma-bulteni` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <article className="post-detail reading-item-detail">
      {post.is_published && !isAdmin && <ViewTracker slug={post.slug} />}

      <Script id="schema-article" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Script id="schema-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Ana sayfa</Link>
        <span className="breadcrumb-sep">›</span>
        <Link href="/okuma-bulteni">Okuma Bülteni</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{post.title}</span>
      </nav>

      {isAdmin && (
        <div className="admin-bar">
          <span>
            {post.is_published ? '✓ Yayında' : '⚠ Taslak'} · {post.view_count || 0} görüntülenme
            {!hasComment && ' · henüz yorum eklenmedi'}
          </span>
          <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm">
            {hasComment ? 'Düzenle' : 'Yorum ekle'}
          </Link>
        </div>
      )}

      <header className="post-header">
        {category && (
          <Link href={`/okuma-bulteni?kategori=${category.slug}`} className="post-category-large"
            style={{ background: `${category.color}15`, color: category.color }}>
            {category.name}
          </Link>
        )}
        <div className="post-byline" style={{ marginTop: 14 }}>
          <div className="author-info">
            <span className="post-byline-meta">
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              {' · '}{AUTHOR_NAME} paylaştı
            </span>
          </div>
        </div>
      </header>

      {/* Alıntı bloğu: paylaşılan kaynak — retweet edilen içerik gibi düşün */}
      <div className="source-quote">
        <div className="source-quote-badge">
          <span className="source-quote-icon">🔗</span>
          <span>{post.source_name || 'Kaynak'}</span>
        </div>
        <h1 className="source-quote-title">
          {post.source_url ? (
            <a href={post.source_url} target="_blank" rel="noopener noreferrer">{post.title}</a>
          ) : post.title}
        </h1>
        {post.source_summary && <p className="source-quote-summary">{post.source_summary}</p>}
        {post.source_url && (
          <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="source-quote-link">
            Orijinal kaynağı aç ↗
          </a>
        )}
      </div>

      {/* Yorum bloğu: retweet + alıntı gibi — kullanıcının bu paylaşıma dair kendi notu */}
      {hasComment && (
        <div className="comment-section">
          <h2 className="comment-label">
            <span className="author-avatar" style={{ width: 28, height: 28, fontSize: 13 }}>M</span>
            Yorumum
          </h2>
          <div id="post-article-body">
            <PostContent content={post.content} format={post.content_format} />
          </div>
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag: string) => (
            <span key={tag} className="post-tag">#{tag}</span>
          ))}
        </div>
      )}

      <footer className="post-footer">
        <h3 className="post-footer-title">Bu paylaşımı paylaş</h3>
        <ShareButtons url={url} title={post.title} />
      </footer>

      {relatedItems.length > 0 && (
        <section className="related-posts">
          <h2 className="post-footer-title">Aynı kategoriden diğer paylaşımlar</h2>
          <ul className="reading-related-list">
            {relatedItems.map((item) => (
              <li key={item.id}>
                <Link href={`/okuma-bulteni/${item.slug}`}>{item.title}</Link>
                <span className="post-meta-sep">·</span>
                <span className="reading-item-source">{item.source_name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
