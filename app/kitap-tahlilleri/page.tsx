import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { formatDate, getCategoryColor, getCategoryName } from '@/lib/helpers';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org';

export const metadata: Metadata = {
  title: 'Kitap Tahlilleri',
  description: 'Muhammet Fatih Işık\'ın okuduğu kitaplar üzerine tahlilleri.',
  alternates: { canonical: `${SITE_URL}/kitap-tahlilleri` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/kitap-tahlilleri`,
    title: 'Kitap Tahlilleri — Zihin Haritası',
    description: 'Okunan kitaplar üzerine tahliller.',
    siteName: 'Zihin Haritası',
    locale: 'tr_TR',
  },
};

export default async function KitapTahlilleriPage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .eq('post_type', 'kitap_tahlili')
    .order('published_at', { ascending: false });

  const postList = posts || [];

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          KİTAP TAHLİLLERİ
        </div>
        <h1 className="blog-hero-title">Kitap Tahlilleri</h1>
        <p className="blog-hero-sub">
          Okunan kitaplar üzerine notlar ve tahliller.
        </p>
      </section>

      {postList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">Henüz kitap tahlili yok. Yakında ilki gelecek.</p>
        </div>
      ) : (
        <section className="posts-list">
          <h2 className="section-title">{postList.length} tahlil</h2>
          {postList.map((post) => (
            <article key={post.id} className="post-card">
              <Link href={`/kitap-tahlilleri/${post.slug}`} className="post-card-link">
                <div className="post-card-body">
                  <div className="post-meta">
                    <span
                      className="post-category"
                      style={{ background: `${getCategoryColor(post.category)}15`, color: getCategoryColor(post.category) }}
                    >
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
