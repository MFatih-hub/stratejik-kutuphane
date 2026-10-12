import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { formatDate, getPostUrl } from '@/lib/helpers';

export const revalidate = 60;

function nameOf(ad: string) {
  try { return decodeURIComponent(ad); } catch { return ad; }
}

export async function generateMetadata({ params }: { params: { ad: string } }): Promise<Metadata> {
  const name = nameOf(params.ad);
  return { title: `${name} — Yazı dizisi`, description: `“${name}” yazı dizisinin bütün bölümleri, sırasıyla.` };
}

export default async function DiziPage({ params }: { params: { ad: string } }) {
  const name = nameOf(params.ad);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let q = supabase.from('posts').select('id, slug, title, subtitle, excerpt, post_type, series_order, published_at, is_published, reading_minutes').eq('series', name);
  if (!user) q = q.eq('is_published', true);
  const { data, error } = await q.order('series_order', { ascending: true, nullsFirst: false }).order('published_at', { ascending: true });
  if (error || !data || data.length === 0) notFound();
  const minutes = data.reduce((s: number, p: any) => s + (p.reading_minutes || 0), 0);

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Ana sayfa</Link><span className="breadcrumb-sep">›</span><span>{name}</span>
      </nav>
      <section className="blog-hero">
        <div className="hero-eyebrow"><span className="hero-dot"></span>YAZI DİZİSİ</div>
        <h1 className="blog-hero-title">{name}</h1>
        <p className="blog-hero-sub">{data.length} bölüm · toplam ~{minutes} dk okuma</p>
      </section>
      <ol className="series-page-list">
        {data.map((p: any, i: number) => (
          <li key={p.id}>
            <span className="series-page-no">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <Link href={getPostUrl(p)} className="series-page-title">{p.title}{!p.is_published && ' (taslak)'}</Link>
              {(p.subtitle || p.excerpt) && <p className="series-page-excerpt">{p.subtitle || p.excerpt}</p>}
              <span className="series-page-meta">{formatDate(p.published_at)}{p.reading_minutes ? ` · ${p.reading_minutes} dk` : ''}</span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
