import Link from 'next/link';
import type { Metadata } from 'next';
import { bookHref, getFeature, getReadingList, listYazilar } from '@/lib/public-data';
import { getCategoryName } from '@/lib/helpers';
import { newsletterEnabled } from '@/lib/server-env';
import { CardButton, FeatureTile, Masthead, Shelf, categoryTone, durakTone } from '@/components/cards';
import { Chevron } from '@/components/icons';
import { AUTHOR_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: 'Zihin Haritası — Muhammet Fatih Işık' },
  description: 'Muhammet Fatih Işık\'ın mühendislik, politika, sosyoloji, finans, felsefe ve tarih üzerine denemeleri ve kitap tahlilleri.',
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const [posts, list, feature] = await Promise.all([listYazilar(), getReadingList(), getFeature()]);
  const duraks = new Map(list.duraks.map((d) => [d.name, d.index]));
  const current = list.current[0] || null;
  const reading = list.current.some((b) => b.status === 'okunuyor');

  return (
    <>
      {/* Beyaz bant: başlık ve öne çıkan yazı */}
      <div className="zone zone-top band">
        <Masthead
          title="Zihin Haritası"
          lede={AUTHOR_NAME}
          links={newsletterEnabled() ? <Link href="/abone">Abone ol <Chevron /></Link> : null}
        />
        {feature && <FeatureTile feature={feature} />}
      </div>

      {posts.length > 0 && (
        <div className="zone">
          <Shelf
            id="yazilar"
            main="Yazılar."
            sub="Denemeler ve incelemeler."
            cta={{ href: '/yazilar', label: 'Tüm yazılar' }}
            items={posts.slice(0, 12).map((p) => ({
              key: p.id,
              href: `/yazi/${p.slug}`,
              eyebrow: getCategoryName(p.category),
              title: p.title,
              desc: p.subtitle || p.excerpt,
              date: p.published_at,
              tone: categoryTone(p.category),
            }))}
          />
        </div>
      )}

      {list.total > 0 && (
        <div className={posts.length > 0 ? 'zone band' : 'zone'}>
          <Shelf
            id="tahliller"
            main="Kitap Tahlilleri."
            sub="Okuduğum eserler üzerine."
            cta={{ href: '/kitap-tahlilleri', label: 'Okuma listesi' }}
            items={list.written.slice(0, 12).map((b) => ({
              key: b.id,
              href: bookHref(b.slug),
              eyebrow: b.module,
              title: b.title,
              desc: b.author,
              date: b.writtenAt,
              tone: durakTone(b.module ? duraks.get(b.module) : null),
            }))}
            after={
              <Link href="/kitap-tahlilleri" className="card">
                <span className="card-eyebrow">Okuma listesi</span>
                <span className="card-title">
                  {current ? `${reading ? 'Şu an' : 'Sıradaki'}: ${current.title}` : `${new Intl.NumberFormat('tr-TR').format(list.total)} eser`}
                </span>
                {current?.author && <span className="card-desc">{current.author}</span>}
                <span className="card-foot" />
                <CardButton />
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}
