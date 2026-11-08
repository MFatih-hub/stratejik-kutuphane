import Link from 'next/link';
import type { Metadata } from 'next';
import { CATEGORIES, getCategoryName } from '@/lib/helpers';
import { listYazilar } from '@/lib/public-data';
import { CardGrid, Masthead, categoryTone } from '@/components/cards';
import { Chevron } from '@/components/icons';
import { OG_IMAGE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Yazılar',
  description: 'Muhammet Fatih Işık\'ın mühendislik, politika, sosyoloji, finans, felsefe ve tarih üzerine denemeleri.',
  alternates: { canonical: `${SITE_URL}/yazilar` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/yazilar`,
    title: 'Yazılar — Zihin Haritası',
    siteName: 'Zihin Haritası',
    locale: 'tr_TR',
    images: [OG_IMAGE],
  },
};

export default async function YazilarPage() {
  const posts = await listYazilar();
  const used = CATEGORIES.filter((c) => posts.some((p) => p.category === c.slug));

  return (
    <>
      <Masthead
        title="Yazılar"
        lede={posts.length > 0 ? 'Denemeler ve incelemeler.' : null}
        links={
          used.length > 1
            ? used.map((c) => <Link key={c.slug} href={`/kategori/${c.path}`}>{c.name} <Chevron /></Link>)
            : null
        }
      />
      {posts.length === 0 ? (
        <p className="quiet">Henüz yazı yok.</p>
      ) : (
        <CardGrid
          items={posts.map((p) => ({
            key: p.id,
            href: `/yazi/${p.slug}`,
            eyebrow: getCategoryName(p.category),
            title: p.title,
            desc: p.subtitle || p.excerpt,
            date: p.published_at,
            tone: categoryTone(p.category),
          }))}
        />
      )}
    </>
  );
}
