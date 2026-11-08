import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { durakHref, findDurak, getDurakSummaries, getReadingList } from '@/lib/public-data';
import BookRow from '@/components/book-row';
import { SeqNav } from '@/components/article';
import { AdminLink } from '@/components/admin-bits';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;

function nameOf(ad: string) {
  try { return decodeURIComponent(ad); } catch { return ad; }
}

export async function generateStaticParams() {
  const list = await getReadingList();
  // Adında / ? # % gibi adres karakterleri olan duraklar ilk ziyarette üretilir
  return list.duraks.filter((d) => !/[\/?#%\\]/.test(d.name)).map((d) => ({ ad: d.name }));
}

export async function generateMetadata({ params }: { params: { ad: string } }): Promise<Metadata> {
  const name = nameOf(params.ad);
  return { title: name, description: `Okuma listesinde “${name}” durağı.` };
}

export default async function DurakPage({ params }: { params: { ad: string } }) {
  const name = nameOf(params.ad);
  const found = await findDurak(name);
  if (!found) notFound();
  const { durak, books, prev, next } = found;
  const summaries = await getDurakSummaries(name);

  return (
    <>
      <header className="hero">
        <p className="eyebrow"><Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link> · Durak {durak.index}</p>
        <h1 className="hero-title hero-title-md">{name}</h1>
        <p className="hero-sub">{durak.total} eser · {durak.done} okundu</p>
      </header>

      {summaries.length > 0 && (
        <section className="section section-tight" aria-label="Durak değerlendirmesi">
          <div className="group">
            {summaries.map((s) => (
              <Link key={s.id} href={`/yazi/${s.slug}`} className="row">
                <span className="row-main">
                  <span className="row-title">{s.title}</span>
                  <span className="row-sub">Durak değerlendirmesi</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section section-tight" aria-label="Eserler">
        <div className="group">
          {books.map((b) => <BookRow key={b.id} book={b} />)}
        </div>
        {summaries.length === 0 && (
          <p className="admin-only">
            <AdminLink href={`/admin/yazi/yeni?durak=${encodeURIComponent(name)}`}>Değerlendirme yaz</AdminLink>
          </p>
        )}
      </section>

      <SeqNav
        label="Duraklar arasında gezin"
        prev={prev && { href: durakHref(prev.name), title: prev.name, note: `${prev.done}/${prev.total}` }}
        next={next && { href: durakHref(next.name), title: next.name, note: `${next.done}/${next.total}` }}
      />
    </>
  );
}
