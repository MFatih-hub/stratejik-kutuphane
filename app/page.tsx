import Link from 'next/link';
import type { Metadata } from 'next';
import { bookHref, getReadingList, listYazilar } from '@/lib/public-data';
import PostList from '@/components/post-list';
import { Chevron } from '@/components/icons';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: 'Zihin Haritası — Muhammet Fatih Işık' },
  description: 'Muhammet Fatih Işık\'ın mühendislik, politika, sosyoloji, finans, felsefe ve tarih üzerine denemeleri ve kitap tahlilleri.',
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const [posts, list] = await Promise.all([listYazilar(), getReadingList()]);

  return (
    <>
      <header className="hero">
        <h1 className="hero-title">Zihin Haritası</h1>
        <p className="hero-sub">Muhammet Fatih Işık</p>
      </header>

      {posts.length > 0 && (
        <section className="section" aria-labelledby="yazilar">
          <h2 className="section-title" id="yazilar">Yazılar</h2>
          <PostList
            items={posts.map((p) => ({ key: p.id, href: `/yazi/${p.slug}`, title: p.title, text: p.subtitle || p.excerpt, date: p.published_at }))}
          />
        </section>
      )}

      {list.total > 0 && (
        <section className="section" aria-labelledby="tahliller">
          <div className="section-head">
            <h2 className="section-title" id="tahliller">Kitap Tahlilleri</h2>
            <Link href="/kitap-tahlilleri" className="more">Okuma listesi <Chevron /></Link>
          </div>
          {list.written.length > 0 && (
            <PostList
              items={list.written.slice(0, 5).map((b) => ({ key: b.id, href: bookHref(b.slug), title: b.title, text: b.author, date: b.writtenAt }))}
            />
          )}
        </section>
      )}
    </>
  );
}
