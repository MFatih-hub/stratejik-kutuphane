import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { NOTE_KINDS } from '@/lib/reading';
import { NoteBody } from '../bugun/bugun-client';
import { Horizon } from '@/components/calm';

export const revalidate = 0;
export const metadata: Metadata = { title: 'Fişler', robots: { index: false, follow: false } };

const PAGE = 40;
const KIND_LABEL: Record<string, string> = { not: 'Not', alinti: 'Alıntı', soru: 'Soru' };

type Params = { q?: string; tur?: string; sayfa?: string };

function href(p: Params) {
  const sp = new URLSearchParams();
  if (p.q) sp.set('q', p.q);
  if (p.tur) sp.set('tur', p.tur);
  if (p.sayfa && p.sayfa !== '1') sp.set('sayfa', p.sayfa);
  const s = sp.toString();
  return `/admin/notlar${s ? `?${s}` : ''}`;
}

export default async function NotesPage({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const q = (searchParams.q || '').trim().slice(0, 120);
  const tur = NOTE_KINDS.some((k) => k.value === searchParams.tur) ? searchParams.tur! : '';
  const page = Math.max(1, parseInt(searchParams.sayfa || '1', 10) || 1);
  const from = (page - 1) * PAGE;

  const base = () => {
    let x = supabase.from('notes').select('*, posts(id, slug, title, book_author, reading_order)', { count: 'exact' });
    if (tur) x = x.eq('kind', tur);
    return x;
  };

  // Önce tam metin arama; sonuç yoksa (ya da sözdizimi uymazsa) içinde geçen kelime araması
  let res: any;
  if (q) {
    res = await base().textSearch('fts', q, { type: 'websearch', config: 'simple' })
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    if (res.error || (res.count || 0) === 0) {
      res = await base().ilike('body', `%${q.replace(/[%_]/g, ' ')}%`)
        .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    }
  } else {
    res = await base().order('created_at', { ascending: false }).range(from, from + PAGE - 1);
  }

  const notes = res.data || [];
  const count = res.count || 0;
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const schemaMissing = !!res.error && /notes/.test(res.error.message || '');

  return (
    <div className="notes-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Fişler</h1>
          <p className="admin-sub">Okurken aldığın notlar, alıntılar ve sorular. Sadece sen görürsün.</p>
        </div>
        <Link href="/admin/bugun" className="btn btn-sm">← Bugün</Link>
      </div>

      <form action="/admin/notlar" className="notes-search">
        <input name="q" defaultValue={q} className="input" placeholder="Kelime, kavram, isim… (ör. nefs, “zorunlu varlık”)" />
        {tur && <input type="hidden" name="tur" value={tur} />}
        <button className="btn btn-sm" type="submit">Ara</button>
      </form>

      <div className="category-bar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1.25rem' }}>
        <Link href={href({ q })} className={`category-pill${!tur ? ' category-pill-active' : ''}`}>Hepsi</Link>
        {NOTE_KINDS.map((k) => (
          <Link key={k.value} href={href({ q, tur: k.value })} className={`category-pill${tur === k.value ? ' category-pill-active' : ''}`}>{k.label}</Link>
        ))}
      </div>

      {schemaMissing ? (
        <div className="today-banner">Fişler için Supabase'de <code>SUPABASE-MIGRATION-v5.sql</code> dosyasını çalıştır.</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <Horizon />
          <p className="empty-state-text">{q ? 'Bu aramayla eşleşen fiş yok.' : 'Henüz fiş yok. Bugün ekranından ilkini al.'}</p>
        </div>
      ) : (
        <>
          <p className="section-title">{count} fiş{q ? ` · “${q}”` : ''}</p>
          <ul className="note-list notes-all">
            {notes.map((n: any) => (
              <li key={n.id} className={`note note-${n.kind}`}>
                <NoteBody text={n.body} />
                <p className="note-meta">
                  <span className={`note-kind note-kind-${n.kind}`}>{KIND_LABEL[n.kind] || 'Not'}</span>
                  {n.page && <> · s. {n.page}</>}
                  {n.posts && (
                    <> · <Link href={`/admin/yazi/${n.posts.id}/duzenle`}>#{n.posts.reading_order} {n.posts.title}</Link></>
                  )}
                  {' · '}{new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                </p>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav className="pager">
              {page > 1 ? <Link className="btn btn-sm" href={href({ q, tur, sayfa: String(page - 1) })}>← Önceki</Link> : <span />}
              <span>Sayfa {page} / {pages}</span>
              {page < pages ? <Link className="btn btn-sm" href={href({ q, tur, sayfa: String(page + 1) })}>Sonraki →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
