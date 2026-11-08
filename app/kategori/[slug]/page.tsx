import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CATEGORIES, getCategoryByPath, formatDate } from '@/lib/helpers';
import { listYazilar } from '@/lib/public-data';
import { OG_IMAGE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;
// Yalnızca altı kategori var; başka adresler doğrudan 404.
export const dynamicParams = false;


export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.path }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const category = getCategoryByPath(params.slug);
  if (!category) return { title: 'Bulunamadı' };
  const url = `${SITE_URL}/kategori/${category.path}`;
  return {
    title: category.name,
    description: `${category.name} üzerine yazılar.`,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${category.name} — Zihin Haritası`, siteName: 'Zihin Haritası', locale: 'tr_TR', images: [OG_IMAGE] },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategoryByPath(params.slug);
  if (!category) notFound();
  const posts = (await listYazilar()).filter((p) => p.category === category.slug);

  return (
    <>
      <header className="hero">
        <p className="eyebrow"><Link href="/">Yazılar</Link></p>
        <h1 className="hero-title">{category.name}</h1>
      </header>

      {posts.length === 0 ? (
        <p className="quiet">Bu başlıkta henüz yazı yok.</p>
      ) : (
        <section className="section section-tight">
          <ul className="posts">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/yazi/${p.slug}`} className="post">
                  <span className="post-title">{p.title}</span>
                  {(p.subtitle || p.excerpt) && <span className="post-text">{p.subtitle || p.excerpt}</span>}
                  <time className="post-date" dateTime={p.published_at || undefined}>{formatDate(p.published_at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
