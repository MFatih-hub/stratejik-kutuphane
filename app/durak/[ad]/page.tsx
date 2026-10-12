import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchJourney } from '@/lib/reading-journey';
import { formatDate } from '@/lib/helpers';
import { Glint } from '@/components/calm';

export const revalidate = 60;

function nameOf(ad: string) {
  try { return decodeURIComponent(ad); } catch { return ad; }
}

export async function generateMetadata({ params }: { params: { ad: string } }): Promise<Metadata> {
  const name = nameOf(params.ad);
  return { title: `${name} — Durak`, description: `Okuma yolculuğunda “${name}” durağı: eserler, tahliller ve durak değerlendirmesi.` };
}

const STATUS: Record<string, string> = { okunuyor: 'Okunuyor', okundu: 'Okundu' };

export default async function DurakPage({ params }: { params: { ad: string } }) {
  const name = nameOf(params.ad);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;
  const journey = await fetchJourney(supabase);
  const idx = journey.modules.findIndex((m) => m.name === name);
  if (idx < 0) notFound();
  const mod = journey.modules[idx];
  const items = journey.items.filter((i) => i.module === name);
  const prev = idx > 0 ? journey.modules[idx - 1] : null;
  const next = idx < journey.modules.length - 1 ? journey.modules[idx + 1] : null;
  const done = mod.total > 0 && mod.written === mod.total;
  const pct = mod.total ? Math.round((mod.written / mod.total) * 100) : 0;

  let summaries: any[] = [];
  {
    let q = supabase.from('posts').select('id, slug, title, subtitle, excerpt, published_at, is_published').eq('durak_summary', name);
    if (!isAdmin) q = q.eq('is_published', true);
    const { data, error } = await q.order('published_at', { ascending: false });
    if (!error) summaries = data || [];
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Ana sayfa</Link><span className="breadcrumb-sep">›</span>
        <Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link><span className="breadcrumb-sep">›</span>
        <span>{name}</span>
      </nav>

      <section className="blog-hero durak-hero" style={{ ['--glint-boost' as any]: (pct / 100).toFixed(2) }}>
        <div className="hero-eyebrow"><span className="hero-dot"></span>DURAK {String(idx + 1).padStart(2, '0')} / {journey.modules.length}</div>
        <h1 className="blog-hero-title">{name}</h1>
        <p className="blog-hero-sub">
          {mod.firstOrder != null && <>Okuma listesinde #{mod.firstOrder}–{mod.lastOrder} · </>}
          {mod.total} eser · {mod.written} tahlil yazıldı{done && ' · durak tamamlandı'}
        </p>
        <div className="book-progress" aria-label="Durak ilerlemesi">
          <div className="book-progress-track"><div className="book-progress-fill" style={{ width: `${pct}%` }} /></div>
          <span className="book-progress-label">%{pct}{done && <Glint still className="durak-done-glint" />}</span>
        </div>
      </section>

      {summaries.length > 0 ? (
        <section className="durak-summary">
          <p className="section-title">Durak değerlendirmesi</p>
          {summaries.map((s) => (
            <Link key={s.id} href={`/yazi/${s.slug}`} className="durak-summary-card">
              <span className="durak-summary-title">{s.title}{!s.is_published && ' (taslak)'}</span>
              {(s.subtitle || s.excerpt) && <span className="durak-summary-excerpt">{s.subtitle || s.excerpt}</span>}
              <span className="durak-summary-meta">{formatDate(s.published_at)} · Oku →</span>
            </Link>
          ))}
        </section>
      ) : isAdmin ? (
        <section className="durak-summary">
          <p className="section-title">Durak değerlendirmesi</p>
          <p className="form-hint" style={{ marginBottom: 10 }}>
            {done ? 'Bu durağın bütün eserleri tamamlandı.' : `Durak bittiğinde (${mod.total - mod.written} eser kaldı)`} Eserleri bir arada düşünen bir değerlendirme yazabilirsin; burada görünür.
          </p>
          <Link href={`/admin/yazi/yeni?durak=${encodeURIComponent(name)}`} className="btn btn-sm btn-primary">Değerlendirmeyi yaz</Link>
        </section>
      ) : null}

      <section className="book-list" aria-label="Bu duraktaki eserler">
        <p className="section-title">Eserler</p>
        <ol className="book-items">
          {items.map((it) => {
            const inner = (
              <>
                <span className="book-no">{it.order ?? '—'}</span>
                <span className="book-main">
                  <span className="book-title">{it.title}</span>
                  {it.author && <span className="book-author">{it.author}</span>}
                </span>
                <span className="book-side">
                  {it.written
                    ? <span className="book-badge book-badge-done">Tahlil →</span>
                    : it.status && STATUS[it.status]
                      ? <span className={`book-badge${it.status === 'okunuyor' ? ' book-badge-reading' : ''}`}>{STATUS[it.status]}</span>
                      : <span className="book-badge">Sırada</span>}
                </span>
              </>
            );
            return (
              <li key={it.id} className={`book-item${it.written ? ' book-item-written' : ''}`}>
                {it.written ? <Link href={`/kitap-tahlilleri/${it.slug}`} className="book-item-inner">{inner}</Link> : <div className="book-item-inner">{inner}</div>}
              </li>
            );
          })}
        </ol>
      </section>

      <nav className="book-seq" aria-label="Duraklar arasında gezin">
        {prev ? (
          <Link href={`/durak/${encodeURIComponent(prev.name)}`} className="book-seq-link">
            <span className="book-seq-dir">← Önceki durak</span>
            <span className="book-seq-title">{prev.name}</span>
            <span className="book-seq-author">{prev.written}/{prev.total}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/durak/${encodeURIComponent(next.name)}`} className="book-seq-link book-seq-next">
            <span className="book-seq-dir">Sonraki durak →</span>
            <span className="book-seq-title">{next.name}</span>
            <span className="book-seq-author">{next.written}/{next.total}</span>
          </Link>
        ) : <span />}
      </nav>
    </>
  );
}
