import Link from 'next/link';
import type { Metadata } from 'next';
import { bookHref, durakHref, getReadingList } from '@/lib/public-data';
import BookRow from '@/components/book-row';
import PostList from '@/components/post-list';
import { Chevron } from '@/components/icons';
import { OG_IMAGE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;


export const metadata: Metadata = {
  title: 'Kitap Tahlilleri',
  description: 'Muhammet Fatih Işık\'ın okuma listesi ve okuduğu eserler üzerine tahlilleri.',
  alternates: { canonical: `${SITE_URL}/kitap-tahlilleri` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/kitap-tahlilleri`,
    title: 'Kitap Tahlilleri — Zihin Haritası',
    description: 'Okuma listesi ve okunan eserler üzerine tahliller.',
    siteName: 'Zihin Haritası',
    locale: 'tr_TR',
    images: [OG_IMAGE],
  },
};

export default async function KitapTahlilleriPage() {
  const list = await getReadingList();
  const nf = new Intl.NumberFormat('tr-TR');

  return (
    <>
      <header className="hero">
        <h1 className="hero-title">Kitap Tahlilleri</h1>
        {list.total > 0 && (
          <p className="hero-sub">{nf.format(list.total)} eserlik okuma listesi · {nf.format(list.done)} okundu</p>
        )}
      </header>

      {list.written.length > 0 && (
        <section className="section" aria-labelledby="tahliller">
          <h2 className="section-title" id="tahliller">Tahliller</h2>
          <PostList items={list.written.map((b) => ({ key: b.id, href: bookHref(b.slug), title: b.title, text: b.author, date: b.writtenAt }))} />
        </section>
      )}

      {list.current.length > 0 && (
        <section className="section" aria-labelledby="simdi">
          <div className="section-head">
            <h2 className="section-title" id="simdi">{list.current.some((b) => b.status === 'okunuyor') ? 'Şu an' : 'Sıradaki'}</h2>
            {list.current[0].module && (
              <Link href={durakHref(list.current[0].module)} className="more">{list.current[0].module} <Chevron /></Link>
            )}
          </div>
          <div className="group">
            {list.current.map((b) => <BookRow key={b.id} book={b} />)}
          </div>
        </section>
      )}

      {list.duraks.length > 0 && (
        <section className="section" aria-labelledby="duraklar">
          <h2 className="section-title" id="duraklar">Duraklar</h2>
          <div className="group">
            {list.duraks.map((d) => (
              <Link key={d.name} href={durakHref(d.name)} className="row row-num-start">
                <span className="row-num">{d.index}</span>
                <span className="row-main">
                  <span className="row-title">{d.name}</span>
                </span>
                <span className="row-end row-count">{`${d.done}/${d.total}`}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {list.total > 0 && list.duraks.length === 0 && (
        <section className="section">
          <div className="group">
            {list.books.map((b) => <BookRow key={b.id} book={b} />)}
          </div>
        </section>
      )}
    </>
  );
}
