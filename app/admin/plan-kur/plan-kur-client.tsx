'use client';

// Yeni okuma planını kurar (lib/plan-kurulum.json: ev kütüphanesi, Kasım 2026).
// Eski okuma listesi tümüyle kalkar; yerine planın eserleri, sıraları, durakları,
// yayınevleri ve ★ işaretleriyle gelir. Eski satırlardan değerli olanlar (tahlil
// metni, okuma durumu, fiş, okuma oturumu, sayfa kaydı) planın karşılık gelen
// eserine taşınır; böylece yazdıkların ve okuma geçmişin kaybolmaz.
// Sen "Uygula"ya basana kadar hiçbir şey değişmez. Yarıda kalırsa tekrar basmak
// güvenlidir: yerine oturmuş eserler bir daha dokunulmadan geçilir.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { refreshSite } from '@/lib/admin-client';
import { slugify } from '@/lib/helpers';

// [sıra, başlık, yazar, yayınevi, durak, çekirdek 0/1, okundu 0/1]
type Entry = [number, string, string | null, string | null, string, number, number];
export type Kurulum = { surum: string; eserler: Entry[] };

type Row = {
  id: number; slug: string; title: string; book_author: string | null; source_name: string | null;
  tags: string[] | null; reading_order: number | null; reading_module: string | null;
  reading_status: string | null; started_at: string | null; current_page: string | null;
};
type Valuable = { row: Row; reasons: string[]; suggested: number | null };
type Scan = {
  rows: Row[];
  placed: Map<number, Row>;      // sıra → zaten yerine oturmuş satır
  valuable: Valuable[];          // korunması gereken eski satırlar
  notesBy: Map<number, number>;
  otherSlugs: Set<string>;       // kitap olmayan yazıların adresleri
  loose: number;                 // eski duraklara bağlı kalan durak yazıları
  numLinks: number;              // [[#sıra]] bağlantısı içeren yazı ve fişler
};

const PAGE = 1000;
const CORE_TAG = 'cekirdek';

async function fetchAll<T>(make: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>, tick: () => void) {
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const x = items[i++];
      await fn(x);
      tick();
    }
  });
  await Promise.all(workers);
}

// Karşılaştırma için sadeleştir: küçük harf, aksansız, yalnız harf ve rakam
const normT = (s: string | null | undefined) =>
  (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

// Bir başlığın olası adları: tamamı, parantez dışı, parantez içi, "/" ve ":" parçaları
function alts(title: string): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => { const n = normT(s); if (n.length >= 3) out.add(n); };
  add(title);
  add(title.replace(/\([^)]*\)/g, ' '));
  for (const m of title.matchAll(/\(([^)]*)\)/g)) add(m[1]);
  title.split(/\s[\/—–-]\s|\//).forEach(add);
  add(title.split(':')[0]);
  return out;
}

function authorOk(a: string | null, b: string | null) {
  if (!a || !b) return true;
  const ta = new Set(normT(a).split(' ').filter((w) => w.length > 2));
  return normT(b).split(' ').some((w) => w.length > 2 && ta.has(w));
}

function planSlugs(eserler: Entry[]): string[] {
  const used = new Set<string>();
  return eserler.map((e) => {
    const base = slugify(e[1]).substring(0, 60).replace(/-+$/, '') || 'eser';
    let s = base;
    for (let k = 2; used.has(s); k++) s = `${base}-${k}`;
    used.add(s);
    return s;
  });
}

const isPlaced = (r: Row, e: Entry | undefined) =>
  !!e && r.reading_order === e[0] && r.title === e[1] && r.reading_module === e[4];

export default function PlanKurClient({ kurulum }: { kurulum: Kurulum }) {
  const eserler = kurulum.eserler;
  const N = eserler.length;
  const byOrder = useMemo(() => new Map(eserler.map((e) => [e[0], e] as const)), [eserler]);
  const slugs = useMemo(() => planSlugs(eserler), [eserler]);
  const altIndex = useMemo(() => eserler.map((e) => alts(e[1])), [eserler]);
  const stats = useMemo(() => {
    const duraks = new Set(eserler.map((e) => e[4]));
    return { duraks: duraks.size, core: eserler.filter((e) => e[5]).length, read: eserler.filter((e) => e[6]).length };
  }, [eserler]);

  const [backedUp, setBackedUp] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<'tara' | 'uygula' | null>(null);
  const running = mode !== null;
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<{ label: string; n: number; total: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const say = (m: string) => setLog((l) => [...l, m]);

  function suggest(row: Row, taken: Set<number>): number | null {
    const t = row.title || '';
    const explicit = /sokrat/i.test(t) && /savunma|apolog/i.test(t) ? 1 : /kriton|crito/i.test(t) ? 3 : null;
    if (explicit && !taken.has(explicit)) return explicit;
    const mine = alts(t);
    for (let i = 0; i < N; i++) {
      const e = eserler[i];
      if (taken.has(e[0])) continue;
      if (![...mine].some((a) => altIndex[i].has(a))) continue;
      if (!authorOk(row.book_author, e[2])) continue;
      return e[0];
    }
    return null;
  }

  async function readSite(supabase: any): Promise<Scan> {
    setProgress({ label: 'Site okunuyor', n: 0, total: 6 });
    const rows = await fetchAll<Row>(() => supabase.from('posts')
      .select('id, slug, title, book_author, source_name, tags, reading_order, reading_module, reading_status, started_at, current_page')
      .eq('post_type', 'kitap_tahlili').order('id', { ascending: true }));
    setProgress({ label: 'Site okunuyor', n: 1, total: 6 });
    const written = new Set((await fetchAll<{ id: number }>(() => supabase.from('posts').select('id')
      .eq('post_type', 'kitap_tahlili').neq('content', '').order('id', { ascending: true }))).map((r) => r.id));
    setProgress({ label: 'Site okunuyor', n: 2, total: 6 });
    const notes = await fetchAll<{ post_id: number }>(() => supabase.from('notes').select('post_id')
      .not('post_id', 'is', null).order('id', { ascending: true }));
    const notesBy = new Map<number, number>();
    notes.forEach((n) => notesBy.set(n.post_id, (notesBy.get(n.post_id) || 0) + 1));
    setProgress({ label: 'Site okunuyor', n: 3, total: 6 });
    // Okuma oturumları ve sayfa kaydı (tablolar yoksa geç)
    const sessions = new Set<number>();
    const logs = new Set<number>();
    try {
      (await fetchAll<{ post_id: number }>(() => supabase.from('reading_sessions').select('post_id')
        .not('post_id', 'is', null).order('id', { ascending: true }))).forEach((r) => sessions.add(r.post_id));
    } catch { /* v7 kurulmamış */ }
    setProgress({ label: 'Site okunuyor', n: 4, total: 6 });
    try {
      (await fetchAll<{ post_id: number }>(() => supabase.from('reading_log').select('post_id')
        .not('post_id', 'is', null).order('id', { ascending: true }))).forEach((r) => logs.add(r.post_id));
    } catch { /* v6 kurulmamış */ }
    setProgress({ label: 'Site okunuyor', n: 5, total: 6 });
    const others = await fetchAll<{ slug: string; durak_summary?: string | null }>(() => supabase.from('posts')
      .select('slug, durak_summary').neq('post_type', 'kitap_tahlili').order('id', { ascending: true }))
      .catch(async () => fetchAll<{ slug: string }>(() => supabase.from('posts')
        .select('slug').neq('post_type', 'kitap_tahlili').order('id', { ascending: true })));
    // [[#123]] gibi sıra numarasıyla verilen bağlantılar yeni planda başka esere gider
    let numLinks = 0;
    try {
      const [p, n] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).like('content', '%[[#%'),
        supabase.from('notes').select('id', { count: 'exact', head: true }).like('body', '%[[#%'),
      ]);
      numLinks = (p.count || 0) + (n.count || 0);
    } catch { /* önemli değil */ }
    const planDuraks = new Set(eserler.map((e) => e[4]));
    const loose = others.filter((o: any) => o.durak_summary && !planDuraks.has(o.durak_summary)).length;
    setProgress(null);

    const placed = new Map<number, Row>();
    for (const r of rows) {
      const e = r.reading_order != null ? byOrder.get(r.reading_order) : undefined;
      if (isPlaced(r, e) && !placed.has(e![0])) placed.set(e![0], r);
    }
    const placedIds = new Set([...placed.values()].map((r) => r.id));
    const taken = new Set(placed.keys());
    const valuable: Valuable[] = [];
    for (const r of rows) {
      if (placedIds.has(r.id)) continue;
      const reasons: string[] = [];
      if (written.has(r.id)) reasons.push('tahlil metni');
      if (r.reading_status) reasons.push(r.reading_status === 'okunuyor' ? 'okunuyor' : r.reading_status === 'yazildi' ? 'tahlili yazıldı' : 'okundu');
      if (r.current_page) reasons.push(`sayfa ${r.current_page}`);
      if (notesBy.get(r.id)) reasons.push(`${notesBy.get(r.id)} fiş`);
      if (sessions.has(r.id)) reasons.push('okuma oturumu');
      if (logs.has(r.id)) reasons.push('sayfa kaydı');
      if (!reasons.length && r.started_at) reasons.push('başlanmış');
      if (!reasons.length) continue;
      const s = suggest(r, taken);
      if (s != null) taken.add(s);
      valuable.push({ row: r, reasons, suggested: s });
    }
    return { rows, placed, valuable, notesBy, otherSlugs: new Set(others.map((o) => o.slug)), loose, numLinks };
  }

  async function doScan() {
    if (running) return;
    setMode('tara'); setLog([]);
    try {
      const supabase = createClient();
      const s = await readSite(supabase);
      setScan(s);
      setOverrides(Object.fromEntries(s.valuable.map((v) => [v.row.id, v.suggested != null ? String(v.suggested) : ''])));
    } catch (e: any) {
      say('HATA: ' + (e?.message || String(e)));
      setProgress(null);
    } finally {
      setMode(null);
    }
  }

  // Değerli satırların hedef sıraları (geçersiz/çakışan değerler hata olarak gösterilir)
  function targets(s: Scan): { map: Map<number, number>; problems: string[] } {
    const map = new Map<number, number>();
    const problems: string[] = [];
    const used = new Map<number, string>();
    s.placed.forEach((r, o) => used.set(o, r.title));
    for (const v of s.valuable) {
      const raw = (overrides[v.row.id] ?? '').trim();
      if (!raw) continue;
      const n = parseInt(raw.replace(/^#/, ''), 10);
      if (!byOrder.has(n)) { problems.push(`«${v.row.title}»: ${raw} planda yok (1–${N}).`); continue; }
      if (used.has(n)) { problems.push(`#${n} iki kez seçilmiş: «${used.get(n)}» ve «${v.row.title}».`); continue; }
      used.set(n, v.row.title);
      map.set(v.row.id, n);
    }
    return { map, problems };
  }

  async function apply() {
    if (running || !scan) return;
    setMode('uygula'); setDone(false); setLog([]);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum kapanmış görünüyor. Yeniden giriş yap.');

      // 1) Güncel durumu yeniden oku; senin seçtiğin eşleşmeler satır kimliğiyle uygulanır
      const s = await readSite(supabase);
      const { map: chosen, problems } = targets(s);
      if (problems.length) throw new Error(problems.join(' '));
      const assign = new Map<number, Row>(s.placed);
      const keepSlug = new Set<number>(); // adresi değişmeyecek satırlar
      s.placed.forEach((r) => keepSlug.add(r.id));
      for (const v of s.valuable) {
        const o = chosen.get(v.row.id);
        if (o != null) {
          assign.set(o, v.row);
          if (v.reasons.includes('tahlil metni')) keepSlug.add(v.row.id);
        }
      }
      const keptIds = new Set([...assign.values()].map((r) => r.id));
      const delRows = s.rows.filter((r) => !keptIds.has(r.id));
      say(`Sitede ${s.rows.length} eser vardı. ${s.placed.size} tanesi zaten yerinde, ${assign.size - s.placed.size} eski kayıt plana taşınacak, ${delRows.length} eski kayıt silinecek.`);

      // 2) Silinecek satırların fişleri silinmesin: bağımsız fiş olarak kalsın
      const withNotes = delRows.filter((r) => s.notesBy.get(r.id));
      for (const part of chunks(withNotes.map((r) => r.id), 100)) {
        const { error } = await supabase.from('notes').update({ post_id: null }).in('post_id', part);
        if (error) throw new Error('Fişler ayrılamadı: ' + error.message);
      }
      if (withNotes.length) say(`${withNotes.length} eski eserin fişleri korundu (artık bir esere bağlı değil): ${withNotes.map((r) => `«${r.title}»`).join(', ')}.`);
      const lostValuable = s.valuable.filter((v) => !keptIds.has(v.row.id));
      if (lostValuable.length) say(`Plana taşınmadan silinen kayıtlı eserler: ${lostValuable.map((v) => `«${v.row.title}» (${v.reasons.join(', ')})`).join('; ')}. Hepsi yedekte duruyor.`);

      // 3) Eski listeyi sil
      let dn = 0;
      setProgress({ label: 'Eski liste siliniyor', n: 0, total: delRows.length });
      for (const part of chunks(delRows.map((r) => r.id), 100)) {
        const { error } = await supabase.from('posts').delete().in('id', part);
        if (error) throw new Error('Silme yarıda kaldı: ' + error.message);
        dn += part.length;
        setProgress({ label: 'Eski liste siliniyor', n: dn, total: delRows.length });
      }
      if (delRows.length) say(`${delRows.length} eski kayıt silindi${delRows.length <= 20 ? `: ${delRows.map((r) => `#${r.reading_order ?? '—'} «${r.title}»`).join(', ')}` : ''}.`);

      // 4) Adresler: planın adresi; başka bir yazıda kullanılıyorsa sonuna "-kitap"
      const taken = new Set<string>(s.otherSlugs);
      assign.forEach((r) => { if (keepSlug.has(r.id)) taken.add(r.slug); });
      const finalSlug = new Map<number, string>(); // sıra → adres
      for (const e of eserler) {
        const r = assign.get(e[0]);
        if (r && keepSlug.has(r.id)) { finalSlug.set(e[0], r.slug); continue; }
        const base = slugs[e[0] - 1];
        let sl = base;
        for (let k = 1; taken.has(sl); k++) sl = k === 1 ? `${base}-kitap` : `${base}-kitap-${k}`;
        taken.add(sl);
        finalSlug.set(e[0], sl);
      }

      // 5) Plana taşınan eski kayıtlar: önce geçici adres (çakışma olmasın), sonra plan bilgileri
      // (Yerine oturmuş satırlara dokunulmaz: sonradan elle yaptığın değişiklikler korunur.)
      const moves = [...assign.entries()].filter(([o, r]) => s.placed.get(o)?.id !== r.id);
      for (const [, r] of moves) {
        if (keepSlug.has(r.id)) continue;
        const { error } = await supabase.from('posts').update({ slug: `gecici-${r.id}-${Date.now().toString(36)}` }).eq('id', r.id);
        if (error) throw new Error(`«${r.title}» için geçici adres verilemedi: ${error.message}`);
      }
      const nowIso = new Date().toISOString();
      let mn = 0;
      setProgress({ label: 'Eski kayıtlar plana taşınıyor', n: 0, total: moves.length });
      await pool(moves, 6, async ([o, r]) => {
        const e = byOrder.get(o)!;
        const tags = e[5] ? [CORE_TAG] : [];
        const patch: Record<string, any> = {};
        if (r.title !== e[1]) patch.title = e[1];
        if ((r.book_author || null) !== (e[2] || null)) patch.book_author = e[2];
        if ((r.source_name || null) !== (e[3] || null)) patch.source_name = e[3];
        if (JSON.stringify(r.tags || []) !== JSON.stringify(tags)) patch.tags = tags;
        if (r.reading_order !== o) patch.reading_order = o;
        if (r.reading_module !== e[4]) patch.reading_module = e[4];
        if (!keepSlug.has(r.id)) patch.slug = finalSlug.get(o);
        if (e[6] && r.reading_status !== 'okundu' && r.reading_status !== 'yazildi') {
          patch.reading_status = 'okundu';
          patch.finished_at = nowIso;
        }
        if (!Object.keys(patch).length) return;
        const { error } = await supabase.from('posts').update(patch).eq('id', r.id);
        if (error) throw new Error(`#${o} «${e[1]}» güncellenemedi: ${error.message}`);
      }, () => setProgress({ label: 'Eski kayıtlar plana taşınıyor', n: ++mn, total: moves.length }));
      if (moves.length) say(`${moves.length} eski kayıt plandaki yerine taşındı: ${moves.map(([o, r]) => `«${r.title}» → #${o}`).join('; ')}.`);

      // 6) Planın geri kalanını ekle (100'er satır)
      const missing = eserler.filter((e) => !assign.has(e[0]));
      const rowFor = (e: Entry, slug: string) => ({
        slug, title: e[1], subtitle: null, content: '', content_format: 'html', excerpt: null,
        cover_image_url: null, category: 'dusunce', tags: e[5] ? [CORE_TAG] : [], reading_minutes: 1,
        is_published: true, published_at: nowIso, post_type: 'kitap_tahlili', book_author: e[2],
        source_name: e[3], reading_order: e[0], reading_module: e[4],
        ...(e[6] ? { reading_status: 'okundu', finished_at: nowIso } : {}),
      });
      let added = 0;
      setProgress({ label: 'Plan eserleri ekleniyor', n: 0, total: missing.length });
      for (const part of chunks(missing, 100)) {
        const { error } = await supabase.from('posts').insert(part.map((e) => rowFor(e, finalSlug.get(e[0])!)));
        if (error) {
          if (error.code !== '23505') throw new Error('Ekleme yarıda kaldı: ' + error.message);
          // Adres çakışması: bu parçayı tek tek, gerekirse farklı adresle ekle
          for (const e of part) {
            let ok = false;
            for (let attempt = 0; attempt < 6 && !ok; attempt++) {
              const sl = attempt === 0 ? finalSlug.get(e[0])! : `${slugs[e[0] - 1]}-${Math.random().toString(36).slice(2, 6)}`;
              const r = await supabase.from('posts').insert(rowFor(e, sl));
              if (!r.error) ok = true;
              else if (r.error.code !== '23505') throw new Error(`#${e[0]} «${e[1]}» eklenemedi: ${r.error.message}`);
            }
            if (!ok) throw new Error(`#${e[0]} «${e[1]}» için uygun adres bulunamadı`);
          }
        }
        added += part.length;
        setProgress({ label: 'Plan eserleri ekleniyor', n: added, total: missing.length });
      }
      if (added) say(`${added} eser eklendi.`);

      // 7) Eski listenin artıkları: izleme listesi ayarı
      await supabase.from('settings').delete().eq('key', 'izlenenler');

      // 8) Denetle
      setProgress({ label: 'Denetleniyor', n: 0, total: 1 });
      const after = await fetchAll<{ id: number; reading_order: number | null }>(() => supabase.from('posts')
        .select('id, reading_order').eq('post_type', 'kitap_tahlili').order('id', { ascending: true }));
      const orders = new Set(after.map((r) => r.reading_order));
      const gaps = eserler.filter((e) => !orders.has(e[0])).map((e) => e[0]);
      setProgress(null);
      if (after.length === N && !gaps.length) {
        say(`Tamam: okuma planında ${N} eser var, sıralar 1'den ${N}'e eksiksiz.`);
        setDone(true);
      } else {
        say(`Dikkat: ${after.length} eser var${gaps.length ? `, eksik sıralar: ${gaps.slice(0, 20).join(', ')}${gaps.length > 20 ? '…' : ''}` : ''}. Tekrar "Uygula"ya bas.`);
      }
      if (s.loose) say(`${s.loose} durak yazısı eski bir durağa bağlıydı; düzenleyicide yeni bir durak seçebilirsin.`);
      refreshSite();
      setScan(null);
    } catch (e: any) {
      say('HATA: ' + (e?.message || String(e)) + ' — Kaldığı yerden devam etmek için önce "Siteyi tara", sonra "Uygula".');
      setProgress(null);
    } finally {
      setMode(null);
    }
  }

  const check = scan ? targets(scan) : null;
  const willDelete = scan ? scan.rows.length - scan.placed.size - (check?.map.size || 0) : 0;

  return (
    <div className="ld">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link><span className="breadcrumb-sep">›</span><span>Okuma planını kur</span>
      </nav>

      <section className="blog-hero" style={{ paddingBottom: 12 }}>
        <div className="hero-eyebrow"><span className="hero-dot"></span>Ev kütüphanesi · {kurulum.surum}</div>
        <h1 className="blog-hero-title">Okuma planını kur</h1>
        <p className="blog-hero-sub">
          Eski okuma listesi tümüyle kalkar; yerine ev kütüphanesinin planı gelir: <strong>{N} eser</strong>,{' '}
          {stats.duraks} durak, ★ {stats.core} çekirdek. Yazdığın tahliller, fişler ve okuma geçmişin plandaki karşılığına taşınır.
          Sen &quot;Uygula&quot;ya basana kadar hiçbir şey değişmez.
        </p>
      </section>

      <section className="ld-section">
        <p className="section-title">Nasıl uygulanır</p>
        <ol className="ld-steps">
          <li>
            Önce <a href="/api/admin/yedek" onClick={() => setBackedUp(true)}>tam yedeği indir</a>
            {backedUp ? ' ✓' : ''}. Silinen her şey bu dosyada kalır.
          </li>
          <li>&quot;Siteyi tara&quot;ya bas. Korunacak eski kayıtlar ve plandaki karşılıkları listelenir; istersen sıra numarasını değiştir. Boş bırakılan kayıt silinir.</li>
          <li>&quot;Uygula&quot;ya bas. Bir iki dakika sürer; sayfayı kapatma. Yarıda kalırsa tarayıp tekrar basmak güvenlidir.</li>
        </ol>
        <button className="btn" onClick={doScan} disabled={running || !backedUp}>
          {mode === 'tara' ? 'Taranıyor…' : 'Siteyi tara'}
        </button>
        {!backedUp && <span className="form-hint" style={{ marginLeft: 10 }}>Önce yedeği indir.</span>}
      </section>

      {scan && (
        <>
          <div className="ld-cards">
            <div className="ld-card"><span className="ld-num">{scan.rows.length}</span><span>eser şu an sitede</span></div>
            <div className="ld-card"><span className="ld-num">{scan.placed.size}</span><span>zaten yerinde (önceki kurulumdan)</span></div>
            <div className="ld-card"><span className="ld-num">{check?.map.size || 0}</span><span>eski kayıt plana taşınacak</span></div>
            <div className="ld-card"><span className="ld-num">{Math.max(0, willDelete)}</span><span>eski kayıt silinecek</span></div>
          </div>

          <section className="ld-section">
            <p className="section-title">Korunacak eski kayıtlar · {scan.valuable.length}</p>
            {scan.valuable.length === 0 ? (
              <p className="form-hint">Taşınacak bir şey yok: eski listede tahlil, fiş ya da okuma kaydı bulunmadı.</p>
            ) : (
              <ul className="ld-list">
                {scan.valuable.map((v) => {
                  const raw = overrides[v.row.id] ?? '';
                  const e = byOrder.get(parseInt(raw.replace(/^#/, ''), 10));
                  return (
                    <li key={v.row.id}>
                      <div className="ld-row" style={{ cursor: 'default' }}>
                        <span className="ld-no">{v.row.reading_order != null ? `#${v.row.reading_order}` : '—'}</span>
                        <span className="ld-title">
                          <strong>{v.row.title}</strong>{v.row.book_author ? ` — ${v.row.book_author}` : ''}
                          <br />
                          <span className="ld-meta" style={{ textAlign: 'left' }}>
                            {v.reasons.join(' · ')} → {e ? `#${e[0]} ${e[1]}${e[3] ? ` (${e[3]})` : ''}` : 'silinecek'}
                          </span>
                        </span>
                        <input
                          className="input" inputMode="numeric" aria-label="Plandaki sıra" placeholder="sıra"
                          style={{ width: 84, flex: '0 0 auto' }} value={raw}
                          onChange={(ev) => setOverrides((o) => ({ ...o, [v.row.id]: ev.target.value }))}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {check && check.problems.length > 0 && (
              <ul className="ld-log">{check.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
            )}
            {scan.numLinks > 0 && (
              <p className="form-hint" style={{ marginTop: 10 }}>
                {scan.numLinks} yazı ya da fişte <code>[[#sıra]]</code> biçiminde bağlantı var. Sıra numaraları değişeceği için bunlar
                başka esere gidebilir; kurulumdan sonra <code>[[Yazar, Eser]]</code> biçimine çevirmen iyi olur.
              </p>
            )}
            {scan.loose > 0 && (
              <p className="form-hint" style={{ marginTop: 10 }}>
                {scan.loose} durak yazısı eski bir durağa bağlı. Silinmez; düzenleyicide yeni bir durak seçebilirsin.
              </p>
            )}
          </section>
        </>
      )}

      <section className="ld-apply">
        <button className="btn btn-primary" onClick={apply} disabled={running || !scan || !backedUp || !!check?.problems.length}>
          {mode === 'uygula' ? 'Uygulanıyor…' : `Uygula (${N} eserlik plan)`}
        </button>
        {progress && (
          <div className="book-progress" aria-label="İlerleme" style={{ marginTop: 10 }}>
            <div className="book-progress-track">
              <div className="book-progress-fill" style={{ width: `${progress.total ? Math.round((progress.n / progress.total) * 100) : 0}%` }} />
            </div>
            <span className="book-progress-label">{progress.label} · {progress.n}/{progress.total}</span>
          </div>
        )}
        {log.length > 0 && <ul className="ld-log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        {done && (
          <p className="form-hint" style={{ marginTop: 8 }}>
            Bitti. Plan bir dakika içinde sitede yenilenir: <Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link>
          </p>
        )}
      </section>
    </div>
  );
}
