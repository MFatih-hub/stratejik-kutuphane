import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, timeAgo, hasRealContent } from '@/lib/helpers';
import { STATUS_LABELS, type ReadingStatus } from '@/lib/reading';

export const revalidate = 0;

// İçerik yönetimi: kitap tahlilleri (okuma listesi) ve yazılar.
// Eskiden bütün kayıtlar tek seferde çekiliyordu; 3.650+ eserle yavaşlamasın
// diye artık sayfa sayfa (50'şer), filtre ve aramayla çalışır.
const PAGE = 50;
type Tur = 'kitap_tahlili' | 'yazi';
type Durum = 'hepsi' | ReadingStatus | 'taslak';
type Params = { tur?: string; durum?: string; q?: string; sayfa?: string };

const DURUMLAR: { value: Durum; label: string }[] = [
  { value: 'hepsi', label: 'Hepsi' },
  { value: 'okunuyor', label: 'Okunuyor' },
  { value: 'okundu', label: 'Tahlil bekliyor' },
  { value: 'yazildi', label: 'Tahlili yazıldı' },
  { value: 'sirada', label: 'Sırada' },
  { value: 'taslak', label: 'Taslak' },
];

function cleanQuery(q?: string) {
  return (q || '').replace(/[,()*%\\:"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function href(p: Params) {
  const sp = new URLSearchParams();
  if (p.tur && p.tur !== 'kitap_tahlili') sp.set('tur', p.tur);
  if (p.durum && p.durum !== 'hepsi') sp.set('durum', p.durum);
  if (p.q) sp.set('q', p.q);
  if (p.sayfa && p.sayfa !== '1') sp.set('sayfa', p.sayfa);
  const s = sp.toString();
  return `/admin${s ? `?${s}` : ''}`;
}

export default async function AdminPage({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const tur: Tur = searchParams.tur === 'yazi' ? 'yazi' : 'kitap_tahlili';
  const durum: Durum = DURUMLAR.some((d) => d.value === searchParams.durum) ? (searchParams.durum as Durum) : 'hepsi';
  const q = cleanQuery(searchParams.q);
  const page = Math.max(1, parseInt(searchParams.sayfa || '1', 10) || 1);
  const from = (page - 1) * PAGE;
  const cur: Params = { tur, durum, q, sayfa: String(page) };

  const count = (fn: (x: any) => any) => fn(supabase.from('posts').select('id', { count: 'exact', head: true }));
  const [kitapAll, yaziAll, okunuyor, okundu, yazildi] = await Promise.all([
    count((x) => x.eq('post_type', 'kitap_tahlili')),
    count((x) => x.eq('post_type', 'yazi')),
    count((x) => x.eq('post_type', 'kitap_tahlili').eq('reading_status', 'okunuyor')),
    count((x) => x.eq('post_type', 'kitap_tahlili').eq('reading_status', 'okundu')),
    count((x) => x.eq('post_type', 'kitap_tahlili').eq('reading_status', 'yazildi')),
  ]);
  const statusReady = !okunuyor.error;

  let list = supabase.from('posts').select('*', { count: 'exact' }).eq('post_type', tur);
  if (q) {
    const num = /^#?(\d{1,5})$/.exec(q);
    list = num && tur === 'kitap_tahlili'
      ? list.eq('reading_order', parseInt(num[1], 10))
      : list.or(tur === 'kitap_tahlili' ? `title.ilike.%${q}%,book_author.ilike.%${q}%` : `title.ilike.%${q}%`);
  }
  if (durum === 'taslak') list = list.eq('is_published', false);
  else if (durum === 'sirada' && statusReady) list = list.is('reading_status', null).eq('content', '');
  else if (durum !== 'hepsi' && statusReady && tur === 'kitap_tahlili') list = list.eq('reading_status', durum);

  list = tur === 'kitap_tahlili'
    ? list.order('reading_order', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
    : list.order('updated_at', { ascending: false });
  const { data: rows, count: total, error } = await list.range(from, from + PAGE - 1);
  if (error) console.error('[admin] Supabase hatası:', error.message);

  const posts = rows || [];
  const pages = Math.max(1, Math.ceil((total || 0) / PAGE));

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">İçerik</h1>
          <p className="admin-sub">Okuma listesi, tahliller ve yazılar</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/bugun" className="btn btn-primary">Bugün</Link>
          <Link href="/admin/notlar" className="btn btn-sm">Fişler</Link>
          <Link href="/admin/harita" className="btn btn-sm">Zihin haritası</Link>
          <Link href="/admin/kitap-tahlilleri/toplu-ekle" className="btn btn-sm">Tahlil: Toplu Ekle</Link>
          <Link href="/admin/yazi/yeni" className="btn btn-sm">Yeni Yazı</Link>
          <Link href="/admin/analiz" className="btn btn-sm">Analiz</Link>
          <Link href="/kavram" className="btn btn-sm">Kavramlar</Link>
          <Link href="/admin/ozet" className="btn btn-sm">Okuma özeti</Link>
          <Link href="/admin/aboneler" className="btn btn-sm">Aboneler</Link>
          <a href="/api/admin/yedek" className="btn btn-sm" title="Bütün yazılar, notlar ve veriler tek bir ZIP dosyasında">Tam yedek indir</a>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card"><span className="stat-label">Okuma listesi</span><span className="stat-value">{kitapAll.count || 0}</span></div>
        <div className="stat-card"><span className="stat-label">Okunuyor</span><span className="stat-value">{statusReady ? okunuyor.count || 0 : '—'}</span></div>
        <div className="stat-card"><span className="stat-label">Tahlil bekliyor</span><span className="stat-value">{statusReady ? okundu.count || 0 : '—'}</span></div>
        <div className="stat-card"><span className="stat-label">Tahlili yazıldı</span><span className="stat-value">{statusReady ? yazildi.count || 0 : '—'}</span></div>
      </div>

      {!statusReady && (
        <div className="today-banner">Okuma durumları ve fişler için Supabase'de <code>SUPABASE-MIGRATION-v5.sql</code> dosyasını çalıştır.</div>
      )}

      <div className="admin-tabs" role="tablist">
        <Link href={href({ tur: 'kitap_tahlili' })} className={`admin-tab${tur === 'kitap_tahlili' ? ' admin-tab-active' : ''}`}>
          Kitap Tahlilleri <span className="count-badge">{kitapAll.count || 0}</span>
        </Link>
        <Link href={href({ tur: 'yazi' })} className={`admin-tab${tur === 'yazi' ? ' admin-tab-active' : ''}`}>
          Yazılar <span className="count-badge">{yaziAll.count || 0}</span>
        </Link>
      </div>

      <div className="admin-filters">
        <div className="category-bar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          {DURUMLAR.filter((d) => tur === 'kitap_tahlili' || d.value === 'hepsi' || d.value === 'taslak').map((d) => (
            <Link key={d.value} href={href({ ...cur, durum: d.value, sayfa: '1' })} className={`category-pill${durum === d.value ? ' category-pill-active' : ''}`}>
              {d.label}
            </Link>
          ))}
        </div>
        <form action="/admin" className="book-search" style={{ border: 'none', padding: 0, margin: '12px 0 0' }}>
          {tur !== 'kitap_tahlili' && <input type="hidden" name="tur" value={tur} />}
          {durum !== 'hepsi' && <input type="hidden" name="durum" value={durum} />}
          <input name="q" defaultValue={q} className="input" placeholder={tur === 'kitap_tahlili' ? 'Eser, yazar ya da #sıra…' : 'Başlık…'} />
          <button className="btn btn-sm" type="submit">Ara</button>
          {q && <Link href={href({ ...cur, q: '', sayfa: '1' })} className="btn btn-sm">Temizle</Link>}
        </form>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">
          {total || 0} kayıt {pages > 1 && <span className="count-badge">sayfa {page}/{pages}</span>}
        </h2>
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Bu filtreyle kayıt yok.</p>
        ) : (
          <div className="admin-posts">
            {posts.map((post: any) => <PostRow key={post.id} post={post} />)}
          </div>
        )}
        {pages > 1 && (
          <nav className="pager">
            {page > 1 ? <Link className="btn btn-sm" href={href({ ...cur, sayfa: String(page - 1) })}>← Önceki</Link> : <span />}
            <span>Sayfa {page} / {pages}</span>
            {page < pages ? <Link className="btn btn-sm" href={href({ ...cur, sayfa: String(page + 1) })}>Sonraki →</Link> : <span />}
          </nav>
        )}
      </section>
    </>
  );
}

function PostRow({ post }: { post: any }) {
  const category = CATEGORIES.find((c) => c.slug === post.category);
  const isBook = post.post_type === 'kitap_tahlili';
  const written = isBook && hasRealContent(post.content);
  const status: ReadingStatus | null = post.reading_status || (written ? 'yazildi' : null);
  const base = isBook ? '/kitap-tahlilleri' : '/yazi';
  return (
    <div className="admin-post-row">
      <div className="admin-post-info">
        <div className="admin-post-meta">
          {category && (
            <span className="post-category" style={{ background: `${category.color}15`, color: category.color }}>{category.name}</span>
          )}
          {!post.is_published && <span className="draft-badge">Taslak</span>}
          {isBook && status && <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>}
          {isBook && post.reading_module && <span className="admin-post-date">{post.reading_module}</span>}
          {!isBook && (
            <span className="admin-post-date">{post.is_published ? formatDate(post.published_at) : `${timeAgo(post.updated_at)} düzenlendi`}</span>
          )}
        </div>
        <h3 className="admin-post-title">
          {isBook && post.reading_order != null && <span className="admin-order">#{post.reading_order}</span>}
          {post.title}
        </h3>
        {isBook && post.book_author && <p className="admin-post-subtitle">{post.book_author}</p>}
      </div>
      <div className="admin-post-actions">
        <Link href={`${base}/${post.slug}`} className="btn btn-sm">Önizle</Link>
        <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm btn-primary">
          {isBook && !written ? 'Tahlil yaz' : 'Düzenle'}
        </Link>
      </div>
    </div>
  );
}
