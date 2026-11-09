import Link from 'next/link';
import type { Metadata } from 'next';
import { durakHref, getReadingList } from '@/lib/public-data';
import { Masthead, ShelfHead } from '@/components/cards';
import { Chevron } from '@/components/icons';
import WatchList, { watchItems } from '@/components/watch-list';
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
    .map((d) => ({ durak: d, books: list.books.filter((b) => b.module === d.name) }))
    .filter((g) => watchItems(g.books).length > 0);

  return (
    <>
      <div className="zone zone-top band">
        <Masthead
          title="İzleme Listesi"
          lede="Okuma listesine paralel videolar."
          links={<Link href="/kitap-tahlilleri">Okuma listesi <Chevron /></Link>}
        />
      </div>
      {groups.length === 0 ? (
        <div className="zone"><p className="quiet">Henüz video yok.</p></div>
      ) : (
        groups.map((g, i) => (
          <section key={g.durak.name} className={i % 2 ? 'zone band' : 'zone'} aria-labelledby={`d${g.durak.index}`}>
            <ShelfHead
              id={`d${g.durak.index}`}
              main={`${g.durak.name}.`}
              sub={`${g.durak.index}. durak · ${watchItems(g.books).length} video`}
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
