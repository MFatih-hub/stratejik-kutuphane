import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, getCategoryName, getCategoryColor } from '@/lib/helpers';
import { InlineSiteSearch } from '@/components/site-search';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export const metadata: Metadata = {
  title: 'Zihin Haritası — Muhammet Fatih Işık',
  description: 'Not defteri',
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  const postList = posts || [];
  const featured = postList[0];
  const rest = postList.slice(1);

  // Blog schema (Google için)
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Zihin Haritası',
    description: 'denemeler ve analizler.',
    url: SITE_URL,
    inLanguage: 'tr-TR',
    author: {
      '@type': 'Person',
      name: 'Muhammet Fatih Işık',
      url: SITE_URL,
    },
    blogPost: postList.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/yazi/${p.slug}`,
      datePublished: p.published_at,
      author: { '@type': 'Person', name: 'Muhammet Fatih Işık' },
    })),
  };

  return (
    <>
      <Script
        id="schema-blog"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          MUHAMMET FATİH IŞIK · DENEMELER VE ANALİZLER
        </div>
        <h1 className="blog-hero-title">Zihin Haritası</h1>
        <p className="blog-hero-sub">
          Kağıt fiyatları çok arttı.
        </p>
        <div className="hero-search">
          <InlineSiteSearch />
        </div>
      </section>

      <section className="category-bar" aria-label="Kategoriler">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/kategori/${c.slug}`} className="category-pill">
            {c.name}
          </Link>
        ))}
      </section>

      {postList.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✍️</div>
          <p className="empty-state-text">
            Henüz yazı yok. Yakında ilki gelecek.
          </p>
        </div>
      )}

      {featured && (
        <article className="featured-post">
          <Link href={`/yazi/${featured.slug}`} className="featured-link">
            {featured.cover_image_url && (
              <div className="featured-image">
                <Image
                  src={featured.cover_image_url}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 1150px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </div>
            )}
            <div className="featured-body">
              <div className="post-meta">
                <span className="post-category" style={{
                  background: `${getCategoryColor(featured.category)}15`,
                  color: getCategoryColor(featured.category)
                }}>
                  {getCategoryName(featured.category)}
                </span>
                <span className="post-meta-sep">·</span>
                <time className="post-date" dateTime={featured.published_at}>
                  {formatDate(featured.published_at)}
                </time>
                <span className="post-meta-sep">·</span>
                <span className="post-reading">{featured.reading_minutes} dk okuma</span>
              </div>
              <h2 className="featured-title">{featured.title}</h2>
              {featured.subtitle && <p className="featured-subtitle">{featured.subtitle}</p>}
              {featured.excerpt && <p className="featured-excerpt">{featured.excerpt}</p>}
              <span className="featured-read-more">Okumaya devam et →</span>
            </div>
          </Link>
        </article>
      )}

      {rest.length > 0 && (
        <section className="posts-list">
          <h2 className="section-title">Tüm Yazılar</h2>
          {rest.map((post) => (
            <article key={post.id} className="post-card">
              <Link href={`/yazi/${post.slug}`} className="post-card-link">
                <div className="post-card-body">
                  <div className="post-meta">
                    <span className="post-category" style={{
                      background: `${getCategoryColor(post.category)}15`,
                      color: getCategoryColor(post.category)
                    }}>
                      {getCategoryName(post.category)}
                    </span>
                    <span className="post-meta-sep">·</span>
                    <time className="post-date" dateTime={post.published_at}>
                      {formatDate(post.published_at)}
                    </time>
                    <span className="post-meta-sep">·</span>
                    <span className="post-reading">{post.reading_minutes} dk</span>
                  </div>
                  <h3 className="post-card-title">{post.title}</h3>
                  {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
                </div>
                {post.cover_image_url && (
                  <div className="post-card-image">
                    <Image src={post.cover_image_url} alt={post.title} fill sizes="160px" style={{ objectFit: 'cover' }} />
                  </div>
                )}
              </Link>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
