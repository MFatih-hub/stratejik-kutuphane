import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostUrl } from '@/lib/helpers';
import { getSeries, listSeriesNames } from '@/lib/public-data';
import { Masthead } from '@/components/cards';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

function nameOf(ad: string) {
  try { return decodeURIComponent(ad); } catch { return ad; }
}

export async function generateStaticParams() {
  return (await listSeriesNames()).filter((ad) => !/[\/?#%\\]/.test(ad)).map((ad) => ({ ad }));
}

export async function generateMetadata({ params }: { params: { ad: string } }): Promise<Metadata> {
  const name = nameOf(params.ad);
  return { title: name, description: `“${name}” yazı dizisinin bölümleri.` };
}

export default async function DiziPage({ params }: { params: { ad: string } }) {
  const name = nameOf(params.ad);
  const items = await getSeries(name);
  if (items.length === 0) notFound();

  return (
    <>
      <Masthead small eyebrow="Yazı dizisi" title={name} lede={`${items.length} bölüm`} />
      <section className="section section-tight">
        <div className="group">
          {items.map((p, i) => (
            <Link key={p.id} href={getPostUrl(p)} className="row row-num-start">
              <span className="row-num">{i + 1}</span>
              <span className="row-main">
                <span className="row-title">{p.title}</span>
                {(p.subtitle || p.excerpt) && <span className="row-sub row-sub-clamp">{p.subtitle || p.excerpt}</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
