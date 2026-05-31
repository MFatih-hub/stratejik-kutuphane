import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, getCategoryName, getCategoryColor } from '@/lib/helpers';

export const revalidate = 60;

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

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          MUHAMMET FATİH IŞIK · DENEMELER VE ANALİZLER
        </div>
        <h1 className="blog-hero-title">Zihin Haritası</h1>
        <p className="blog-hero-sub">
          Zihnimden geçenler.
        </p>
      </section>

      <section className="category-bar">
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
                <img src={featured.cover_image_url} alt={featured.title} />
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
                <time className="post-date">{formatDate(featured.published_at)}</time>
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
                    <time className="post-date">{formatDate(post.published_at)}</time>
                    <span className="post-meta-sep">·</span>
                    <span className="post-reading">{post.reading_minutes} dk</span>
                  </div>
                  <h3 className="post-card-title">{post.title}</h3>
                  {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
                </div>
                {post.cover_image_url && (
                  <div className="post-card-image">
                    <img src={post.cover_image_url} alt={post.title} />
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
