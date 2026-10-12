import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { istanbulDay } from '@/lib/reading';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Okuma özeti', robots: { index: false, follow: false } };

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MON3 = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

async function pageAll(make: (a: number, b: number) => any): Promise<{ rows: any[]; ok: boolean }> {
  const rows: any[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) return { rows, ok: from > 0 };
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { rows, ok: true };
}

function dayDiff(a: string, b: string) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}

function streaks(days: string[], today: string) {
  const sorted = Array.from(new Set(days)).sort();
  let best = 0, bestEnd = '', run = 0, prev = '';
  for (const d of sorted) {
    run = prev && dayDiff(prev, d) === 1 ? run + 1 : 1;
    if (run > best) { best = run; bestEnd = d; }
    prev = d;
  }
  // şu anki seri: bugün ya da dün okunduysa geriye doğru say
  const set = new Set(sorted);
  let cur = 0;
  let d = set.has(today) ? today : (() => { const y = new Date(Date.parse(today + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10); return set.has(y) ? y : ''; })();
  while (d && set.has(d)) { cur++; d = new Date(Date.parse(d + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10); }
  return { best, bestEnd, cur };
}

function Bars({ values, label, unit, max }: { values: number[]; label: string; unit: string; max?: number }) {
  const m = Math.max(1, max ?? Math.max(...values));
  return (
    <figure className="ozet-chart" aria-label={label}>
      <figcaption className="ozet-chart-title">{label}</figcaption>
      <div className="ozet-bars" role="list">
        {values.map((v, i) => (
          <div key={i} className="ozet-bar-col" role="listitem" title={`${MONTHS[i]}: ${v} ${unit}`}>
            <span className="ozet-bar-val">{v > 0 ? v : ''}</span>
            <span className="ozet-bar" style={{ height: `${v > 0 ? Math.max(3, (v / m) * 100) : 0}%` }} />
            <span className="ozet-bar-label">{MON3[i]}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export default async function OzetPage({ searchParams }: { searchParams: { yil?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const today = istanbulDay();
  const thisYear = Number(today.slice(0, 4));
  const year = Math.min(thisYear, Math.max(2000, Number(searchParams?.yil) || thisYear));
  const y0 = `${year}-01-01`, y1 = `${year + 1}-01-01`;
  const ts0 = `${y0}T00:00:00+03:00`, ts1 = `${y1}T00:00:00+03:00`;

  const [allDays, log, notes, finished, written, yazilar] = await Promise.all([
    pageAll((a, b) => supabase.from('reading_days').select('day').order('day', { ascending: true }).range(a, b)),
    pageAll((a, b) => supabase.from('reading_log').select('day, page_from, page_to, post_id').gte('day', y0).lt('day', y1).order('id', { ascending: true }).range(a, b)),
    pageAll((a, b) => supabase.from('notes').select('post_id, kind, created_at, posts(title, slug, reading_order, book_author)').gte('created_at', ts0).lt('created_at', ts1).order('id', { ascending: true }).range(a, b)),
    pageAll((a, b) => supabase.from('posts').select('id, slug, title, book_author, reading_order, finished_at, reading_status').eq('post_type', 'kitap_tahlili').in('reading_status', ['okundu', 'yazildi']).gte('finished_at', ts0).lt('finished_at', ts1).order('finished_at', { ascending: true }).range(a, b)),
    pageAll((a, b) => supabase.from('posts').select('id, slug, title, reading_order, written_at').eq('post_type', 'kitap_tahlili').gte('written_at', ts0).lt('written_at', ts1).order('written_at', { ascending: true }).range(a, b)),
    pageAll((a, b) => supabase.from('posts').select('id, slug, title, published_at').eq('post_type', 'yazi').eq('is_published', true).gte('published_at', ts0).lt('published_at', ts1).order('published_at', { ascending: true }).range(a, b)),
  ]);

  const days = allDays.rows.map((r) => r.day as string);
  const yearDays = days.filter((d) => d >= y0 && d < y1);
  const st = streaks(days, today);
  const month = (iso: string) => Number(istanbulDay(new Date(iso)).slice(5, 7)) - 1;

  const mDays = Array(12).fill(0), mPages = Array(12).fill(0), mFinished = Array(12).fill(0), mWritten = Array(12).fill(0), mNotes = Array(12).fill(0);
  yearDays.forEach((d) => mDays[Number(d.slice(5, 7)) - 1]++);
  let pages = 0;
  log.rows.forEach((r) => { if (r.page_from != null && r.page_to > r.page_from) { const p = r.page_to - r.page_from; if (p < 2000) { pages += p; mPages[Number(String(r.day).slice(5, 7)) - 1] += p; } } });
  finished.rows.forEach((r) => mFinished[month(r.finished_at)]++);
  written.rows.forEach((r) => mWritten[month(r.written_at)]++);
  notes.rows.forEach((r) => mNotes[month(r.created_at)]++);

  const byBook = new Map<number, { n: number; book: any }>();
  notes.rows.forEach((r) => { const e = byBook.get(r.post_id) || { n: 0, book: r.posts }; e.n++; byBook.set(r.post_id, e); });
  const topBooks = Array.from(byBook.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  const kinds = { not: 0, alinti: 0, soru: 0 } as Record<string, number>;
  notes.rows.forEach((r) => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; });

  // Yıl takvimi (53 hafta × 7 gün)
  const set = new Set(yearDays);
  const start = new Date(Date.UTC(year, 0, 1));
  const lead = (start.getUTCDay() + 6) % 7; // pazartesi = 0
  const cells: { d: string | null; on: boolean; future: boolean }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ d: null, on: false, future: false });
  for (let t = start.getTime(); t < Date.UTC(year + 1, 0, 1); t += 864e5) {
    const d = new Date(t).toISOString().slice(0, 10);
    cells.push({ d, on: set.has(d), future: d > today });
  }

  const firstYear = days.length ? Number(days[0].slice(0, 4)) : thisYear;
  const years: number[] = [];
  for (let y = thisYear; y >= Math.min(firstYear, thisYear); y--) years.push(y);
  const passedDays = year === thisYear ? dayDiff(y0, today) + 1 : (year % 4 === 0 ? 366 : 365);

  const tiles = [
    { v: yearDays.length, l: 'okuma günü', s: `yılın %${Math.round((yearDays.length / Math.max(1, passedDays)) * 100)}'i` },
    { v: pages, l: 'sayfa', s: log.ok ? (yearDays.length ? `okunan günde ~${Math.round(pages / Math.max(1, yearDays.length))}` : '') : 'v6 gerekli' },
    { v: finished.rows.length, l: 'kitap bitti', s: '' },
    { v: written.ok ? written.rows.length : '—', l: 'tahlil yazıldı', s: written.ok ? '' : 'v6 gerekli' },
    { v: notes.rows.length, l: 'fiş', s: `${kinds.alinti || 0} alıntı · ${kinds.soru || 0} soru` },
    { v: st.best, l: 'en uzun seri', s: st.cur ? `şu an ${st.cur} gün` : '' },
  ];

  return (
    <div className="ozet">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Okuma özeti · {year}</h1>
          <p className="admin-sub">Okuma günleri, sayfalar, bitirilen kitaplar ve fişler</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {years.map((y) => (
            <Link key={y} href={`/admin/ozet?yil=${y}`} className={`category-pill${y === year ? ' category-pill-active' : ''}`}>{y}</Link>
          ))}
          <Link href="/admin/bugun" className="btn btn-sm">Bugün</Link>
        </div>
      </div>

      <div className="ozet-tiles">
        {tiles.map((t) => (
          <div key={t.l} className="ozet-tile">
            <span className="ozet-tile-v">{t.v}</span>
            <span className="ozet-tile-l">{t.l}</span>
            {t.s && <span className="ozet-tile-s">{t.s}</span>}
          </div>
        ))}
      </div>

      <section className="ozet-cal" aria-label="Yıl takvimi">
        <p className="section-title">Okunan günler</p>
        <div className="ozet-cal-grid">
          {cells.map((c, i) => (
            <span key={i} className={`ozet-cal-cell${c.on ? ' is-on' : ''}${c.future ? ' is-future' : ''}${!c.d ? ' is-blank' : ''}`} title={c.d ? `${c.d}${c.on ? ' · okundu' : ''}` : undefined} />
          ))}
        </div>
      </section>

      <div className="ozet-charts">
        <Bars values={mDays} label="Ay ay okuma günleri" unit="gün" max={31} />
        <Bars values={mPages} label="Ay ay okunan sayfa" unit="sayfa" />
      </div>

      <section className="ozet-table-wrap" aria-label="Aylık tablo">
        <p className="section-title">Ay ay</p>
        <table className="ozet-table">
          <thead><tr><th>Ay</th><th>Gün</th><th>Sayfa</th><th>Biten kitap</th><th>Tahlil</th><th>Fiş</th></tr></thead>
          <tbody>
            {MONTHS.map((m, i) => (
              <tr key={m} className={mDays[i] + mNotes[i] + mFinished[i] === 0 ? 'is-empty' : ''}>
                <td>{m}</td><td>{mDays[i] || '·'}</td><td>{mPages[i] || '·'}</td><td>{mFinished[i] || '·'}</td><td>{mWritten[i] || '·'}</td><td>{mNotes[i] || '·'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Toplam</td><td>{yearDays.length}</td><td>{pages}</td><td>{finished.rows.length}</td><td>{written.rows.length}</td><td>{notes.rows.length}</td></tr></tfoot>
        </table>
      </section>

      <div className="ozet-lists">
        <section>
          <p className="section-title">Bu yıl bitirdiklerin</p>
          {finished.rows.length === 0 ? <p className="form-hint">Henüz yok.</p> : (
            <ol className="ozet-list">
              {finished.rows.map((b) => (
                <li key={b.id}>
                  <Link href={`/kitap-tahlilleri/${b.slug}`}><span className="today-no">#{b.reading_order}</span> {b.title}</Link>
                  <span className="ozet-list-meta">{new Date(b.finished_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' })}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <p className="section-title">En çok fiş aldıkların</p>
          {topBooks.length === 0 ? <p className="form-hint">Henüz yok.</p> : (
            <ol className="ozet-list">
              {topBooks.map(([id, e]) => (
                <li key={id}>
                  <Link href={`/admin/yazi/${id}/duzenle`}>{e.book?.reading_order != null && <span className="today-no">#{e.book.reading_order}</span>} {e.book?.title || 'Eser'}</Link>
                  <span className="ozet-list-meta">{e.n} fiş</span>
                </li>
              ))}
            </ol>
          )}
          {yazilar.rows.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: 18 }}>Yayımlanan yazılar · {yazilar.rows.length}</p>
              <ul className="ozet-list">
                {yazilar.rows.map((p) => <li key={p.id}><Link href={`/yazi/${p.slug}`}>{p.title}</Link></li>)}
              </ul>
            </>
          )}
        </section>
      </div>
      {!log.ok && <p className="form-hint" style={{ marginTop: 18 }}>Sayfa sayıları ve tahlil tarihleri için Supabase'de <code>SUPABASE-MIGRATION-v6.sql</code> dosyasını çalıştır; o andan sonra okudukların sayılmaya başlar.</p>}
    </div>
  );
}
