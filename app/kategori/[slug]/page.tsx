import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, getCategoryBySlug, formatDate } from '@/lib/helpers';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = getCategoryBySlug(params.slug);
  if (!category) return { title: 'Kategori bulunamadı' };

  const url = `${SITE_URL}/kategori/${category.slug}`;
  return {
    title: category.name,
    description: `${category.name} kategorisindeki tüm yazılar. ${category.description}`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${category.name} — Zihin Haritası`,
      description: category.description,
      siteName: 'Zihin Haritası',
      locale: 'tr_TR',
    },
  };
}

// Tüm kategori sayfalarını önceden build et (SEO için)
export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategoryBySlug(params.slug);
  if (!category) notFound();

  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .eq('post_type', 'yazi')
    .eq('category', params.slug)
    .order('published_at', { ascending: false });

  const postList = posts || [];

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot" style={{ background: category.color }}></span>
          KATEGORİ
        </div>
        <h1 className="blog-hero-title" style={{ color: category.color }}>
          {category.name}
        </h1>
        <p className="blog-hero-sub">{category.description}</p>
      </section>

      <section className="category-bar">
        <Link href="/" className="category-pill">← Tüm yazılar</Link>
        {CATEGORIES.filter((c) => c.slug !== params.slug).map((c) => (
          <Link key={c.slug} href={`/kategori/${c.slug}`} className="category-pill">
            {c.name}
          </Link>
        ))}
      </section>

      {postList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p className="empty-state-text">
            Bu kategoride henüz yazı yok.
          </p>
        </div>
      ) : (
        <section className="posts-list">
          <h2 className="section-title">{postList.length} yazı</h2>
          {postList.map((post) => (
            <article key={post.id} className="post-card">
              <Link href={`/yazi/${post.slug}`} className="post-card-link">
                <div className="post-card-body">
                  <div className="post-meta">
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
