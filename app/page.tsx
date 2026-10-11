import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, getCategoryName, getCategoryColor } from '@/lib/helpers';
import { InlineSiteSearch } from '@/components/site-search';
import { fetchJourneySummary } from '@/lib/reading-journey';
import { SeaHorizon, Glint, Horizon } from '@/components/calm';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export const metadata: Metadata = {
  title: 'Zihin Haritası — Muhammet Fatih Işık',
  description: 'Muhammet Fatih Işık\'ın mühendislik, politika, sosyoloji, finans, felsefe ve tarih üzerine denemeleri, okuma bülteni ve kitap tahlilleri.',
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: posts }, { data: bulletin }, journey] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .eq('post_type', 'yazi')
      .order('published_at', { ascending: false }),
    supabase
      .from('posts')
      .select('id, slug, title, source_name, category, published_at')
      .eq('is_published', true)
      .eq('post_type', 'okuma_bulteni')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(6),
    fetchJourneySummary(supabase),
  ]);

  const postList = posts || [];
  const bulletinList = bulletin || [];
  const journeyPct = journey.total ? Math.round((journey.written / journey.total) * 1000) / 10 : 0;
  const hasShowcase = bulletinList.length > 0 || journey.total > 0;
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

      <section className="blog-hero blog-hero-sea">
        <SeaHorizon />
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          MUHAMMET FATİH IŞIK · DENEMELER VE ANALİZLER
        </div>
        <h1 className="blog-hero-title">Zihin Haritası</h1>
        <p className="blog-hero-sub">
          Mühendislik, politika, sosyoloji, finans, felsefe ve tarih üzerine denemeler, okuma notları ve kitap tahlilleri.
        </p>
        <div className="hero-search">
          <InlineSiteSearch />
        </div>
      </section>

      <section className="category-bar" aria-label="Kategoriler">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/kategori/${c.path}`} className="category-pill">
            {c.name}
          </Link>
        ))}
      </section>

      {postList.length === 0 && !hasShowcase && (
        <div className="empty-state">
          <Horizon />
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


      {hasShowcase && (
        <section className="showcase" aria-label="Bölümler">
          {bulletinList.length > 0 && (
            <div className="showcase-panel">
              <div className="showcase-head">
                <span className="showcase-kicker">Okuma Bülteni</span>
                <Link href="/okuma-bulteni" className="showcase-more">Tümü →</Link>
              </div>
              <h2 className="showcase-title">Son paylaşımlar</h2>
              <ul className="showcase-list">
                {bulletinList.map((b: any) => (
                  <li key={b.id}>
                    <Link href={`/okuma-bulteni/${b.slug}`} className="showcase-item">
                      <span className="showcase-item-title">{b.title}</span>
                      <span className="showcase-item-meta">
                        <span style={{ color: getCategoryColor(b.category) }}>{getCategoryName(b.category)}</span>
                        {b.source_name && <> · {b.source_name}</>}
                        {' · '}{formatDate(b.published_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {journey.total > 0 && (
            <div className="showcase-panel showcase-panel-journey">
              <div className="showcase-head">
                <span className="showcase-kicker">Kitap Tahlilleri</span>
                <Link href="/kitap-tahlilleri" className="showcase-more">Okuma yolculuğu →</Link>
              </div>
              <h2 className="showcase-title">
                {journey.written} <span className="showcase-title-of">/ {journey.total} eser</span>
              </h2>
              <div className="journey-bar" style={{ margin: '6px 0 4px' }}>
                <div className="journey-bar-fill" style={{ width: `${journeyPct}%` }} />
              </div>
              <p className="showcase-note">%{journeyPct} tamamlandı</p>

              {journey.next && (
                <Link href={`/kitap-tahlilleri/${journey.next.slug}`} className="journey-here showcase-here">
                  <Glint still className="journey-here-pin" />
                  <span className="journey-here-text">
                    <span className="journey-here-label">Şu an buradayım</span>
                    <span className="journey-here-title">
                      {journey.next.reading_order != null && <span className="journey-here-no">#{journey.next.reading_order}</span>} {journey.next.title}
                    </span>
                    {journey.next.book_author && <span className="journey-here-author">{journey.next.book_author}</span>}
                  </span>
                </Link>
              )}

              {journey.recent.length > 0 && (
                <>
                  <p className="showcase-sub">Son tahliller</p>
                  <ul className="showcase-list">
                    {journey.recent.map((r: any) => (
                      <li key={r.slug}>
                        <Link href={`/kitap-tahlilleri/${r.slug}`} className="showcase-item">
                          <span className="showcase-item-title">{r.title}</span>
                          <span className="showcase-item-meta">{r.book_author || ''}{r.book_author ? ' · ' : ''}{formatDate(r.updated_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
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
