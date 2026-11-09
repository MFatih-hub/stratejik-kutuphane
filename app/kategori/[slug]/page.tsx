import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CATEGORIES, getCategoryByPath } from '@/lib/helpers';
import { listYazilar } from '@/lib/public-data';
import { CardGrid, Masthead, categoryTone } from '@/components/cards';
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
      <div className="zone zone-top band">
        <Masthead small eyebrow={<Link href="/yazilar">Yazılar</Link>} title={category.name} />
      </div>
      <div className="zone">
        {posts.length === 0 ? (
          <p className="quiet">Bu başlıkta henüz yazı yok.</p>
        ) : (
          <CardGrid
            items={posts.map((p) => ({
              key: p.id,
              href: `/yazi/${p.slug}`,
              title: p.title,
              desc: p.subtitle || p.excerpt,
              date: p.published_at,
              tone: categoryTone(category.slug),
            }))}
          />
        )}
      </div>
    </>
  );
}
