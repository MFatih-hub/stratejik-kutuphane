import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, getCategoryColor, getCategoryName, stripHtml } from '@/lib/helpers';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org';

export const metadata: Metadata = {
  title: 'Okuma Bülteni',
  description: 'Zihin Haritası Okuma Bülteni\'nden seçilen makaleler, kısa özetleri ve üzerlerine düşülen notlar.',
  alternates: { canonical: `${SITE_URL}/okuma-bulteni` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/okuma-bulteni`,
    title: 'Okuma Bülteni — Zihin Haritası',
    description: 'Seçilen makaleler, özetleri ve notlar.',
    siteName: 'Zihin Haritası',
    locale: 'tr_TR',
  },
};

export default async function OkumaBulteniPage({ searchParams }: { searchParams: { kategori?: string } }) {
  const supabase = createClient();
  const activeCategory = searchParams?.kategori && CATEGORIES.some((c) => c.slug === searchParams.kategori)
    ? searchParams.kategori
    : null;

  let query = supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .eq('post_type', 'okuma_bulteni')
    .order('published_at', { ascending: false });

  if (activeCategory) query = query.eq('category', activeCategory);

  const { data: posts } = await query;
  const postList = posts || [];

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          OKUMA BÜLTENİ
        </div>
        <h1 className="blog-hero-title">Okuma Bülteni</h1>
        <p className="blog-hero-sub">
          Okuduğum makaleler, kaynakları ve kısa özetleri. Bazılarının altında kendi notum da var —
          orijinal kaynağa gitmeden önce ya da sonra buradan takip edebilirsin.
        </p>
      </section>

      <section className="category-bar" aria-label="Kategoriler">
        <Link href="/okuma-bulteni" className={`category-pill${!activeCategory ? ' category-pill-active' : ''}`}>
          Tümü
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/okuma-bulteni?kategori=${c.slug}`}
            className={`category-pill${activeCategory === c.slug ? ' category-pill-active' : ''}`}
          >
            {c.name}
          </Link>
        ))}
      </section>

      {postList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔗</div>
          <p className="empty-state-text">
            {activeCategory ? 'Bu kategoride henüz paylaşım yok.' : 'Henüz paylaşım yok. Yakında ilk linkler gelecek.'}
          </p>
        </div>
      ) : (
        <section className="posts-list reading-list">
          <h2 className="section-title">{postList.length} paylaşım</h2>
          {postList.map((post) => {
            const hasComment = !!post.content && stripHtml(post.content).length > 0;
            return (
              <article key={post.id} className="reading-item-card">
                <div className="post-meta">
                  <span
                    className="post-category"
                    style={{ background: `${getCategoryColor(post.category)}15`, color: getCategoryColor(post.category) }}
                  >
                    {getCategoryName(post.category)}
                  </span>
                  <span className="post-meta-sep">·</span>
                  <span className="reading-item-source">{post.source_name || 'Kaynak'}</span>
                  <span className="post-meta-sep">·</span>
                  <time className="post-date" dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                  {hasComment && (
                    <>
                      <span className="post-meta-sep">·</span>
                      <span className="comment-indicator">💬 Yorumum var</span>
                    </>
                  )}
                </div>
                <Link href={`/okuma-bulteni/${post.slug}`} className="reading-item-title-link">
                  <h3 className="reading-item-title">{post.title}</h3>
                </Link>
                {post.source_summary && <p className="reading-item-summary">{post.source_summary}</p>}
                <div className="reading-item-actions">
                  <Link href={`/okuma-bulteni/${post.slug}`} className="reading-item-permalink">
                    Sayfasına git →
                  </Link>
                  {post.source_url && (
                    <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="reading-item-external">
                      Kaynağı aç ↗
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
