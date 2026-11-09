import Link from 'next/link';
import type { Metadata } from 'next';
import { bookHref, durakHref, getReadingList } from '@/lib/public-data';
import BookRow from '@/components/book-row';
import { CardGrid, Masthead, ShelfHead, durakTone } from '@/components/cards';
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
  const duraks = new Map(list.duraks.map((d) => [d.name, d.index]));
  const current = list.current[0] || null;
  const reading = list.current.some((b) => b.status === 'okunuyor');
  const currentHref = current
    ? current.module
      ? `${durakHref(current.module)}${current.order != null ? `#eser-${current.order}` : ''}`
      : bookHref(current.slug)
    : null;

  return (
    <>
      <div className="zone zone-top band">
        <Masthead
          title="Kitap Tahlilleri"
          lede={list.total > 0 ? `${nf.format(list.total)} eserlik bir okuma listesi.` : null}
          links={
            current && currentHref ? (
              <Link href={currentHref}>{reading ? 'Şu an' : 'Sıradaki'}: {current.title} <Chevron /></Link>
            ) : null
          }
        />
      </div>

      {list.written.length > 0 && (
        <section className="zone shelf" aria-labelledby="tahliller">
          <ShelfHead id="tahliller" main="Tahliller." sub="Okuduğum eserler üzerine." />
          <CardGrid
            items={list.written.map((b) => ({
              key: b.id,
              href: bookHref(b.slug),
              eyebrow: b.module,
              title: b.title,
              desc: b.author,
              date: b.writtenAt,
              tone: durakTone(b.module ? duraks.get(b.module) : null),
            }))}
          />
        </section>
      )}

      {list.duraks.length > 0 && (
        <section className={list.written.length > 0 ? 'zone band shelf' : 'zone shelf'} aria-labelledby="duraklar">
          <ShelfHead
            id="duraklar"
            main="Duraklar."
            sub={`${nf.format(list.duraks.length)} durak, ${nf.format(list.done)} eser okundu.`}
          />
          <div className="directory">
            <ol className="dir-list">
              {list.duraks.map((d) => (
                <li key={d.name}>
                  <Link href={durakHref(d.name)} className={d.done > 0 ? 'dir-item is-started' : 'dir-item'}>
                    <span className="dir-num">{d.index}</span>
                    <span className="dir-name">{d.name}</span>
                    <span className="dir-count">{`${d.done}/${d.total}`}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {list.total > 0 && list.duraks.length === 0 && (
        <section className="zone shelf">
          <div className="group">
            {list.books.map((b) => <BookRow key={b.id} book={b} />)}
          </div>
        </section>
      )}
    </>
  );
}
