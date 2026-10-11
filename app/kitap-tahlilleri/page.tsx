import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, getCategoryByPath, getCategoryColor, getCategoryName } from '@/lib/helpers';
import { fetchJourney } from '@/lib/reading-journey';
import ReadingJourney from '@/components/reading-journey';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org';
const PAGE_SIZE = 100;

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
  },
};

type Durum = 'tumu' | 'yazilan' | 'bekleyen';
const DURUMLAR: { value: Durum; label: string }[] = [
  { value: 'tumu', label: 'Tüm liste' },
  { value: 'yazilan', label: 'Tahlili yazılanlar' },
  { value: 'bekleyen', label: 'Sırada bekleyenler' },
];

type Params = { sayfa?: string; durum?: string; kategori?: string; modul?: string; q?: string };

/** PostgREST `or()` filtresini bozabilecek karakterleri temizler. */
function cleanQuery(q?: string): string {
  return (q || '').replace(/[,()*%\\:"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function buildHref(base: Params, patch: Partial<Params>): string {
  const merged: Record<string, string | undefined> = { ...base, ...patch };
  const sp = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (!v) return;
    if (k === 'durum' && v === 'tumu') return;
    if (k === 'sayfa' && v === '1') return;
    sp.set(k, v);
  });
  const s = sp.toString();
  return `/kitap-tahlilleri${s ? `?${s}` : ''}`;
}

export default async function KitapTahlilleriPage({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();

  const durum: Durum = DURUMLAR.some((d) => d.value === searchParams?.durum) ? (searchParams.durum as Durum) : 'tumu';
  // Adreste yeni kategori adı (felsefe) ya da eski iç değer (dusunce) olabilir
  const kategoriCat = getCategoryByPath(searchParams?.kategori);
  const kategori = kategoriCat?.slug || '';
  const modul = (searchParams?.modul || '').trim().slice(0, 120);
  const q = cleanQuery(searchParams?.q);
  const pageNum = Math.max(1, parseInt(searchParams?.sayfa || '1', 10) || 1);
  const current: Params = { durum, kategori: kategoriCat?.path || '', modul, q, sayfa: String(pageNum) };
  const showJourney = !q && !kategori && !modul && durum === 'tumu' && pageNum === 1;

  // Ortak filtreler (durum hariç) — sekme sayaçları için de kullanılır
  const applyCommon = (query: any) => {
    let qq = query.eq('is_published', true).eq('post_type', 'kitap_tahlili');
    if (kategori) qq = qq.eq('category', kategori);
    if (modul) qq = qq.eq('reading_module', modul);
    if (q) qq = qq.or(`title.ilike.%${q}%,book_author.ilike.%${q}%`);
    return qq;
  };
  const applyDurum = (query: any, d: Durum) => {
    if (d === 'yazilan') return query.neq('content', '');
    if (d === 'bekleyen') return query.eq('content', '');
    return query;
  };

  const from = (pageNum - 1) * PAGE_SIZE;
  const listQuery = applyDurum(
    applyCommon(
      supabase
        .from('posts')
        .select('id, slug, title, book_author, reading_order, category, content, published_at', { count: 'exact' })
    ),
    durum
  )
    .order('reading_order', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const countQuery = (d: Durum) =>
    applyDurum(applyCommon(supabase.from('posts').select('id', { count: 'exact', head: true })), d);

  let [{ data: rows, count, error }, totalRes, writtenRes, journey] = await Promise.all([
    listQuery,
    countQuery('tumu'),
    countQuery('yazilan'),
    showJourney ? fetchJourney(supabase) : Promise.resolve(null),
  ]);

  if (error) {
    console.error('[kitap-tahlilleri] Supabase hatası:', error.message);
    // Migration v4 (book_author / reading_order) henüz çalıştırılmadıysa sayfa
    // boş kalmasın: yeni alanlar olmadan, yayın tarihine göre listele.
    let fallback = supabase
      .from('posts')
      .select('id, slug, title, category, content, published_at', { count: 'exact' })
      .eq('is_published', true)
      .eq('post_type', 'kitap_tahlili');
    if (kategori) fallback = fallback.eq('category', kategori);
    if (modul) fallback = fallback.eq('id', -1); // durak alanı yoksa durak filtresi boş döner
    if (q) fallback = fallback.ilike('title', `%${q}%`);
    if (durum === 'yazilan') fallback = fallback.neq('content', '');
    if (durum === 'bekleyen') fallback = fallback.eq('content', '');
    const fb = await fallback.order('published_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    rows = fb.data as any;
    count = fb.count;
  }

  const list = rows || [];
  const totalCount = totalRes.count || 0;
  const writtenCount = writtenRes.count || 0;
  const counts: Record<Durum, number> = { tumu: totalCount, yazilan: writtenCount, bekleyen: Math.max(0, totalCount - writtenCount) };
  const pageCount = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const progressPct = totalCount ? Math.round((writtenCount / totalCount) * 1000) / 10 : 0;

  return (
    <>
      <section className="blog-hero">
        <div className="hero-eyebrow">
          <span className="hero-dot"></span>
          KİTAP TAHLİLLERİ
        </div>
        <h1 className="blog-hero-title">Kitap Tahlilleri</h1>
        <p className="blog-hero-sub">
          Okuma listesi ve okunan eserler üzerine notlar. Tahlili yazılan eserler bağlantılıdır.
        </p>
        {totalCount > 0 && !journey && (
          <div className="book-progress" aria-label="Tahlil ilerlemesi">
            <div className="book-progress-track">
              <div className="book-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="book-progress-label">
              {writtenCount} / {totalCount} eserin tahlili yazıldı
            </span>
          </div>
        )}
      </section>

      {journey && (
        <ReadingJourney journey={journey} moduleHref={(name) => buildHref(current, { modul: name, sayfa: '1' })} />
      )}

      {modul && (
        <div className="book-module-banner">
          Durak: <strong>{modul}</strong>
          <Link href={buildHref(current, { modul: '', sayfa: '1' })} className="btn btn-sm">× Tüm liste</Link>
        </div>
      )}

      <section className="book-filters" aria-label="Filtreler">
        <div className="category-bar" style={{ marginBottom: 10 }}>
          {DURUMLAR.map((d) => (
            <Link
              key={d.value}
              href={buildHref(current, { durum: d.value, sayfa: '1' })}
              className={`category-pill${durum === d.value ? ' category-pill-active' : ''}`}
            >
              {d.label} <span className="book-pill-count">{counts[d.value]}</span>
            </Link>
          ))}
        </div>
        <div className="category-bar" style={{ marginBottom: 10 }}>
          <Link href={buildHref(current, { kategori: '', sayfa: '1' })} className={`category-pill${!kategori ? ' category-pill-active' : ''}`}>
            Tüm alanlar
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={buildHref(current, { kategori: c.path, sayfa: '1' })}
              className={`category-pill${kategori === c.slug ? ' category-pill-active' : ''}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <form method="get" action="/kitap-tahlilleri" className="book-search">
          {durum !== 'tumu' && <input type="hidden" name="durum" value={durum} />}
          {current.kategori && <input type="hidden" name="kategori" value={current.kategori} />}
          {modul && <input type="hidden" name="modul" value={modul} />}
          <input type="search" name="q" defaultValue={q} className="input" placeholder="Eser ya da yazar ara…" />
          <button type="submit" className="btn btn-sm">Ara</button>
          {q && <Link href={buildHref(current, { q: '', sayfa: '1' })} className="btn btn-sm">Temizle</Link>}
        </form>
      </section>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">
            {totalCount === 0 && !q && !kategori ? 'Henüz kitap tahlili yok. Yakında ilki gelecek.' : 'Bu filtreyle eşleşen eser yok.'}
          </p>
        </div>
      ) : (
        <section className="book-list" aria-label="Eserler">
          <p className="section-title">
            {count} eser{pageCount > 1 ? ` · sayfa ${pageNum}/${pageCount}` : ''}
          </p>
          <ol className="book-items">
            {list.map((post: any) => {
              const written = !!post.content;
              const inner = (
                <>
                  <span className="book-no">{post.reading_order ?? '—'}</span>
                  <span className="book-main">
                    <span className="book-title">{post.title}</span>
                    {post.book_author && <span className="book-author">{post.book_author}</span>}
                  </span>
                  <span className="book-side">
                    <span
                      className="post-category"
                      style={{ background: `${getCategoryColor(post.category)}15`, color: getCategoryColor(post.category) }}
                    >
                      {getCategoryName(post.category)}
                    </span>
                    {written ? <span className="book-badge book-badge-done">Tahlil →</span> : <span className="book-badge">Sırada</span>}
                  </span>
                </>
              );
              return (
                <li key={post.id} id={post.reading_order != null ? `eser-${post.reading_order}` : undefined} className={`book-item${written ? ' book-item-written' : ''}`}>
                  {written ? (
                    <Link href={`/kitap-tahlilleri/${post.slug}`} className="book-item-inner">{inner}</Link>
                  ) : (
                    <div className="book-item-inner">{inner}</div>
                  )}
                </li>
              );
            })}
          </ol>

          {pageCount > 1 && (
            <nav className="pager" aria-label="Sayfalar">
              {pageNum > 1 ? (
                <Link href={buildHref(current, { sayfa: String(pageNum - 1) })} className="btn btn-sm">← Önceki</Link>
              ) : <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.4 }}>← Önceki</span>}
              <span>Sayfa {pageNum} / {pageCount}</span>
              {pageNum < pageCount ? (
                <Link href={buildHref(current, { sayfa: String(pageNum + 1) })} className="btn btn-sm">Sonraki →</Link>
              ) : <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.4 }}>Sonraki →</span>}
            </nav>
          )}
        </section>
      )}
    </>
  );
}
