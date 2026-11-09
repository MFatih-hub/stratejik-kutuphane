import Link from 'next/link';
import type { Metadata } from 'next';
import { durakHref, getReadingList } from '@/lib/public-data';
import { Masthead, ShelfHead } from '@/components/cards';
import { Chevron } from '@/components/icons';
import WatchList, { watchItems, watchSummary } from '@/components/watch-list';
import { totalLabel } from '@/lib/watch';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'İzleme Listesi',
  description: 'Okuma listesine paralel, durak durak seçilmiş Türkçe ve İngilizce videolar.',
  alternates: { canonical: `${SITE_URL}/izleme-listesi` },
};

export default async function IzlemeListesiPage() {
  const list = await getReadingList();
  const groups = list.duraks
    .map((d) => {
      const books = list.books.filter((b) => b.module === d.name);
      return { durak: d, books, items: watchItems(books) };
    })
    .filter((g) => g.items.length > 0);
  const count = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <>
      <div className="zone zone-top band">
        <Masthead
          title="İzleme Listesi"
          lede={count > 0 ? `Okuma listesine paralel ${count} video.` : 'Okuma listesine paralel videolar.'}
          links={<Link href="/kitap-tahlilleri">Okuma listesi <Chevron /></Link>}
        />
        {groups.length > 1 && (
          <nav className="directory watch-dir" aria-label="Duraklar">
            <ol className="dir-list">
              {groups.map((g) => (
                <li key={g.durak.name}>
                  <a href={`#d${g.durak.index}`} className="dir-item">
                    <span className="dir-num">{g.durak.index}</span>
                    <span className="dir-name">{g.durak.name}</span>
                    <span className="dir-count">{totalLabel(g.items.map((i) => i.video.dur))}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      {groups.length === 0 ? (
        <div className="zone"><p className="quiet">Henüz video yok.</p></div>
      ) : (
        groups.map((g, i) => (
          <section key={g.durak.name} className={i % 2 ? 'zone band' : 'zone'} aria-labelledby={`d${g.durak.index}`}>
            <ShelfHead
              id={`d${g.durak.index}`}
              main={`${g.durak.name}.`}
              sub={`${g.durak.index}. durak · ${watchSummary(g.books)}`}
              cta={{ href: durakHref(g.durak.name), label: 'Durağa git' }}
            />
            <div className="watch">
              <WatchList books={g.books} />
            </div>
          </section>
        ))
      )}
    </>
  );
}
