'use client';

// Okuma listesi düzenleme planı (lib/liste-duzenleme-plani.json):
// makaleleri siler, aynı kitabın parçalarını tek kitapta birleştirir, Kardeş
// Filozoflar eserlerini duraklara ekler, tahlil metinlerini temizler ve listeyi
// yeniden numaralar. Sen "Uygula"ya basana kadar hiçbir şey değişmez. Her adım
// tekrar çalıştırılabilir: yarıda kalırsa yeniden basmak güvenlidir.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { slugify } from '@/lib/helpers';

type Rename = [number, number, string, string | null, string];          // id, eski sıra, yeni başlık, yeni yazar, eski başlık
type Group = [number, string, string, number[]];                         // temsilci, başlık, durak, üyeler
type Del = [number, number, string, string, string, number, number | null]; // id, sıra, başlık, yazar, durak, gerekçe, birleştiği id
type Insert = { key: string; author: string; title: string; module: string; pair: number };
export type Plan = {
  version: string;
  snapshot: { total: number; maxOrder: number };
  reasons: string[];
  clear: { id: number; read: boolean; title: string }[];
  renames: Rename[];
  groups: Group[];
  deletes: Del[];
  inserts: Insert[];
  existing: Record<string, number[]>;
  titles: Record<string, [string, string, string]>;
  sequence: (number | string)[];
};

type Row = { id: number; title: string; book_author: string | null; reading_order: number | null; reading_status: string | null };
type Tab = 'ozet' | 'birlestir' | 'sil' | 'yeni' | 'tahlil';

const PAGE = 1000;

async function fetchAllRows(supabase: any): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('posts')
      .select('id, title, book_author, reading_order, reading_status')
      .eq('post_type', 'kitap_tahlili').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function idsWithContent(supabase: any): Promise<Set<number>> {
  const out = new Set<number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('posts').select('id')
      .eq('post_type', 'kitap_tahlili').neq('content', '').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    (data || []).forEach((r: any) => out.add(r.id));
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

const norm = (s: string | null | undefined) => (s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

export default function ListeDuzenleClient({ plan }: { plan: Plan }) {
  const [tab, setTab] = useState<Tab>('ozet');
  const [skipDel, setSkipDel] = useState<Set<number>>(new Set());      // silinmeyecek satırlar
  const [skipGroup, setSkipGroup] = useState<Set<number>>(new Set());  // uygulanmayacak birleştirme/adlandırma (temsilci id)
  const [skipNew, setSkipNew] = useState<Set<string>>(new Set());      // eklenmeyecek yeni eserler
  const [clearTahlil, setClearTahlil] = useState(true);
  const [q, setQ] = useState('');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<{ label: string; n: number; total: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const say = (m: string) => setLog((l) => [...l, m]);

  const groupOf = useMemo(() => {
    const m = new Map<number, Group>();
    plan.groups.forEach((g) => m.set(g[0], g));
    return m;
  }, [plan]);
  const renameOf = useMemo(() => new Map(plan.renames.map((r) => [r[0], r] as const)), [plan]);
  const plainDeletes = useMemo(() => plan.deletes.filter((d) => d[5] !== 5), [plan]);
  const mergeDeletes = useMemo(() => plan.deletes.filter((d) => d[5] === 5), [plan]);
  const singleRenames = useMemo(() => plan.renames.filter((r) => !groupOf.has(r[0])), [plan, groupOf]);

  // Sen bir şeyi hariç tutunca ne kalır?
  function effectiveDeletes(): Del[] {
    return plan.deletes.filter((d) => {
      if (skipDel.has(d[0])) return false;
      if (d[5] === 5 && d[6] != null && skipGroup.has(d[6])) return false;
      return true;
    });
  }
  const effDelCount = effectiveDeletes().length;
  const effNew = plan.inserts.filter((i) => !skipNew.has(i.key)).length;
  const finalCount = plan.snapshot.total - effDelCount + effNew;

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    setter(n);
  };

  async function apply() {
    if (running) return;
    setRunning(true); setDone(false); setLog([]);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum kapanmış görünüyor. Yeniden giriş yap.');

      // 1) Güncel listeyi oku
      setProgress({ label: 'Liste okunuyor', n: 0, total: 1 });
      const rows = await fetchAllRows(supabase);
      const written = await idsWithContent(supabase);
      const byId = new Map(rows.map((r) => [r.id, r]));
      say(`Sitede şu an ${rows.length} eser var (plan ${plan.snapshot.total} eserle hazırlandı).`);

      const clearIds = new Set(clearTahlil ? plan.clear.map((c) => c.id) : []);
      let dels = effectiveDeletes().filter((d) => byId.has(d[0]));
      // Tahlil metni olan satırı (temizlenmeyecekse) asla silme
      const protectedRows = dels.filter((d) => written.has(d[0]) && !clearIds.has(d[0]));
      if (protectedRows.length) {
        say(`Tahlil metni olduğu için silinmedi: ${protectedRows.map((d) => `#${d[1]} ${d[2]}`).join('; ')}`);
        const keep = new Set(protectedRows.map((d) => d[0]));
        dels = dels.filter((d) => !keep.has(d[0]));
      }

      // 2) Fişleri koru: birleşen parçaların fişleri kitaba taşınır, diğerleri silinmez
      setProgress({ label: 'Fişler denetleniyor', n: 0, total: dels.length });
      const notesBy = new Map<number, number>();
      for (const part of chunks(dels.map((d) => d[0]), 150)) {
        const { data, error } = await supabase.from('notes').select('id, post_id').in('post_id', part);
        if (error) throw new Error('Fişler okunamadı: ' + error.message);
        (data || []).forEach((n: any) => notesBy.set(n.post_id, (notesBy.get(n.post_id) || 0) + 1));
      }
      const keepForNotes: Del[] = [];
      for (const d of dels) {
        const n = notesBy.get(d[0]);
        if (!n) continue;
        if (d[5] === 5 && d[6] != null) {
          const { error } = await supabase.from('notes').update({ post_id: d[6] }).eq('post_id', d[0]);
          if (error) throw new Error('Fiş taşınamadı: ' + error.message);
          say(`#${d[1]} «${d[2]}» eserindeki ${n} fiş birleştiği kitaba taşındı.`);
        } else {
          keepForNotes.push(d);
        }
      }
      if (keepForNotes.length) {
        say(`Fişi olduğu için silinmedi: ${keepForNotes.map((d) => `#${d[1]} ${d[2]}`).join('; ')}`);
        const keep = new Set(keepForNotes.map((d) => d[0]));
        dels = dels.filter((d) => !keep.has(d[0]));
      }
      const delSet = new Set(dels.map((d) => d[0]));

      // 3) Tahlil metinlerini temizle (okunan eserler "okundu" olarak kalır)
      if (clearTahlil) {
        setProgress({ label: 'Tahliller temizleniyor', n: 0, total: plan.clear.length });
        for (const c of plan.clear) {
          if (!byId.has(c.id)) continue;
          const patch: any = { content: '', excerpt: null };
          if (!delSet.has(c.id)) {
            patch.reading_status = c.read ? 'okundu' : null;
            patch.finished_at = c.read ? new Date().toISOString() : null;
          }
          const { error } = await supabase.from('posts').update(patch).eq('id', c.id);
          if (error) throw new Error('Tahlil temizlenemedi: ' + error.message);
        }
        say(`${plan.clear.length} tahlil metni silindi (yedeği sende).`);
      }

      // 4) Parçadan kitaba: yeni başlıklar
      const renames = plan.renames.filter((r) => !skipGroup.has(r[0]) && byId.has(r[0]));
      let rn = 0;
      setProgress({ label: 'Kitap adları düzeltiliyor', n: 0, total: renames.length });
      await pool(renames, 6, async (r) => {
        const cur = byId.get(r[0])!;
        const patch: any = {};
        if (cur.title !== r[2]) patch.title = r[2];
        if (r[3] && cur.book_author !== r[3]) patch.book_author = r[3];
        if (!Object.keys(patch).length) return;
        const { error } = await supabase.from('posts').update(patch).eq('id', r[0]);
        if (error) throw new Error(`#${r[1]} yeniden adlandırılamadı: ${error.message}`);
      }, () => setProgress({ label: 'Kitap adları düzeltiliyor', n: ++rn, total: renames.length }));
      say(`${renames.length} parça tek kitap adına çevrildi.`);

      // 5) Yeni eserler (zaten varsa tekrar eklenmez)
      const newIds = new Map<string, number>();
      const ins = plan.inserts.filter((i) => !skipNew.has(i.key));
      setProgress({ label: 'Yeni eserler ekleniyor', n: 0, total: ins.length });
      let added = 0;
      const now = new Date().toISOString();
      for (const it of ins) {
        const hit = rows.find((r) => norm(r.title) === norm(it.title) && norm(r.book_author) === norm(it.author));
        if (hit) { newIds.set(it.key, hit.id); continue; }
        const base = slugify(it.title).substring(0, 60).replace(/-+$/, '') || 'eser';
        let inserted: number | null = null;
        for (let attempt = 0; attempt < 5 && inserted == null; attempt++) {
          const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
          const { data, error } = await supabase.from('posts').insert({
            slug, title: it.title, subtitle: null, content: '', content_format: 'html', excerpt: null,
            cover_image_url: null, category: 'dusunce', tags: [], reading_minutes: 1, is_published: true,
            published_at: now, post_type: 'kitap_tahlili', book_author: it.author, reading_order: null,
            reading_module: it.module,
          }).select('id').single();
          if (!error) inserted = (data as any).id;
          else if (error.code !== '23505') throw new Error(`«${it.title}» eklenemedi: ${error.message}`);
        }
        if (inserted == null) throw new Error(`«${it.title}» için uygun adres bulunamadı`);
        newIds.set(it.key, inserted);
        added++;
        setProgress({ label: 'Yeni eserler ekleniyor', n: added, total: ins.length });
      }
      say(`${added} yeni eser eklendi${ins.length - added ? ` (${ins.length - added} tanesi zaten vardı)` : ''}.`);

      // 6) Sil
      const delIds = [...delSet];
      let dn = 0;
      setProgress({ label: 'Makaleler ve parçalar siliniyor', n: 0, total: delIds.length });
      for (const part of chunks(delIds, 100)) {
        const { error } = await supabase.from('posts').delete().in('id', part);
        if (error) throw new Error('Silme yarıda kaldı: ' + error.message);
        dn += part.length;
        setProgress({ label: 'Makaleler ve parçalar siliniyor', n: dn, total: delIds.length });
      }
      say(`${delIds.length} satır silindi.`);

      // 7) Yeniden numarala
      const seen = new Set<number>();
      const finalIds: number[] = [];
      for (const tok of plan.sequence) {
        if (typeof tok === 'number') {
          if (delSet.has(tok) || !byId.has(tok)) continue;
          finalIds.push(tok); seen.add(tok);
        } else {
          const id = newIds.get(tok);
          if (id != null && !seen.has(id)) { finalIds.push(id); seen.add(id); }
        }
      }
      // Plan hazırlandıktan sonra eklenmiş eserler: eski sıralarıyla sona
      const extra = rows.filter((r) => !seen.has(r.id) && !delSet.has(r.id) && ![...newIds.values()].includes(r.id))
        .sort((a, b) => (a.reading_order ?? 1e9) - (b.reading_order ?? 1e9));
      if (extra.length) say(`Planda olmayan ${extra.length} eser listenin sonuna alındı.`);
      extra.forEach((r) => finalIds.push(r.id));
      const updates = finalIds.map((id, i) => ({ id, order: i + 1 }))
        .filter((u) => (byId.get(u.id)?.reading_order ?? null) !== u.order);
      let on = 0;
      setProgress({ label: 'Sıra numaraları yenileniyor', n: 0, total: updates.length });
      await pool(updates, 8, async (u) => {
        const { error } = await supabase.from('posts').update({ reading_order: u.order }).eq('id', u.id);
        if (error) throw new Error(`Sıra yazılamadı (#${u.order}): ${error.message}`);
      }, () => setProgress({ label: 'Sıra numaraları yenileniyor', n: ++on, total: updates.length }));
      say(`Liste 1'den ${finalIds.length}'e yeniden numaralandı.`);

      setProgress(null);
      setDone(true);
    } catch (e: any) {
      say('HATA: ' + (e?.message || String(e)) + ' — Kaldığı yerden devam etmek için tekrar "Uygula"ya basabilirsin.');
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }

  const ql = norm(q);
  const match = (...s: (string | null | undefined)[]) => !ql || s.some((x) => norm(x).includes(ql));

  return (
    <div className="ld">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link><span className="breadcrumb-sep">›</span><span>Okuma listesini düzenle</span>
      </nav>

      <section className="blog-hero" style={{ paddingBottom: 12 }}>
        <div className="hero-eyebrow"><span className="hero-dot"></span>Plan · {plan.version}</div>
        <h1 className="blog-hero-title">Okuma listesini düzenle</h1>
        <p className="blog-hero-sub">
          {plan.snapshot.total} eser → <strong>{finalCount}</strong> kitap. Makaleler çıkar, aynı kitabın parçaları tek kitapta
          birleşir, Kardeş Filozoflar eserleri uygun duraklara girer, liste yeniden numaralanır.
          Sen &quot;Uygula&quot;ya basana kadar hiçbir şey değişmez.
        </p>
      </section>

      <div className="ld-cards">
        <button className={`ld-card${tab === 'sil' ? ' is-on' : ''}`} onClick={() => setTab('sil')}>
          <span className="ld-num">{plainDeletes.filter((d) => !skipDel.has(d[0])).length}</span><span>makale, mektup ya da fragman silinecek</span>
        </button>
        <button className={`ld-card${tab === 'birlestir' ? ' is-on' : ''}`} onClick={() => setTab('birlestir')}>
          <span className="ld-num">{mergeDeletes.length}</span><span>parça {plan.groups.length} kitapta birleşecek; {singleRenames.length} parça kitap adını alacak</span>
        </button>
        <button className={`ld-card${tab === 'yeni' ? ' is-on' : ''}`} onClick={() => setTab('yeni')}>
          <span className="ld-num">{effNew}</span><span>yeni eser (Kardeş Filozoflar)</span>
        </button>
        <button className={`ld-card${tab === 'tahlil' ? ' is-on' : ''}`} onClick={() => setTab('tahlil')}>
          <span className="ld-num">{clearTahlil ? plan.clear.length : 0}</span><span>tahlil metni silinecek</span>
        </button>
      </div>

      {tab !== 'ozet' && tab !== 'tahlil' && (
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input className="input" placeholder="Başlık, yazar ya da durak ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-sm" onClick={() => { setTab('ozet'); setQ(''); }}>Özete dön</button>
        </div>
      )}

      {tab === 'ozet' && (
        <section className="ld-section">
          <p className="section-title">Nasıl uygulanır</p>
          <ol className="ld-steps">
            <li>Önce <a href="/api/admin/yedek">tam yedeği indir</a>. Plan, silinen her satırın başlığını da içerir; yine de yedek iyi olur.</li>
            <li>Yukarıdaki kutulara tıklayıp listelere göz at. İstemediğin satırın işaretini kaldır; o satır olduğu gibi kalır.</li>
            <li>&quot;Uygula&quot;ya bas. Yaklaşık bir iki dakika sürer; sayfayı kapatma. Yarıda kalırsa tekrar basmak güvenlidir.</li>
          </ol>
          <p className="form-hint">
            Kurallar: tırnak içindeki başlıklar makale/deneme sayıldı. Bir kitabın bölümleri tek kitapta birleşti ve kitap, parçalarının
            en çok bulunduğu durağa yerleşti. Fişi olan bir parça silinmez; birleşiyorsa fişleri kitaba taşınır.
          </p>
        </section>
      )}

      {tab === 'tahlil' && (
        <section className="ld-section">
          <label className="ld-row">
            <input type="checkbox" checked={clearTahlil} onChange={(e) => setClearTahlil(e.target.checked)} />
            <span>Yazdığım tahlillerin metnini sil (yedek dosyası sende)</span>
          </label>
          <ul className="ld-list">
            {plan.clear.map((c) => {
              const del = plan.deletes.find((d) => d[0] === c.id);
              return (
                <li key={c.id}>
                  <span className="ld-title">{c.title}</span>
                  <span className="ld-meta">{del ? 'metin silinir, satır kitabın tamamıyla birleşir' : c.read ? 'metin silinir, eser “okundu” olarak kalır' : 'metin silinir'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === 'sil' && (
        <section className="ld-section">
          {plan.reasons.map((reason, code) => {
            const list = plainDeletes.filter((d) => d[5] === code && match(d[2], d[3], d[4]));
            if (!list.length) return null;
            return (
              <details key={code} open={code !== 0 || !!ql}>
                <summary className="section-title">{reason} · {list.length}</summary>
                <ul className="ld-list">
                  {list.map((d) => (
                    <li key={d[0]}>
                      <label className="ld-row">
                        <input type="checkbox" checked={!skipDel.has(d[0])} onChange={() => toggle(skipDel, setSkipDel, d[0])} />
                        <span className="ld-no">#{d[1]}</span>
                        <span className="ld-title">{d[2]}</span>
                        <span className="ld-meta">{d[3]} · {d[4]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>
      )}

      {tab === 'birlestir' && (
        <section className="ld-section">
          <p className="section-title">Birleşen kitaplar · {plan.groups.length}</p>
          <ul className="ld-list">
            {plan.groups.filter((g) => match(g[1], g[2], ...mergeDeletes.filter((d) => d[6] === g[0]).map((d) => d[2]))).map((g) => {
              const parts = mergeDeletes.filter((d) => d[6] === g[0]);
              const r = renameOf.get(g[0]);
              return (
                <li key={g[0]}>
                  <label className="ld-row">
                    <input type="checkbox" checked={!skipGroup.has(g[0])} onChange={() => toggle(skipGroup, setSkipGroup, g[0])} />
                    <span className="ld-title"><strong>{g[1]}</strong></span>
                    <span className="ld-meta">{g[2]}{r ? ` · eski adı: ${r[4]}` : ''}</span>
                  </label>
                  <ul className="ld-parts">
                    {parts.map((d) => <li key={d[0]}>#{d[1]} {d[2]} <span className="ld-meta">({d[4]})</span></li>)}
                  </ul>
                </li>
              );
            })}
          </ul>
          <p className="section-title" style={{ marginTop: 18 }}>Parçadan kitaba · {singleRenames.length}</p>
          <ul className="ld-list">
            {singleRenames.filter((r) => match(r[2], r[4])).map((r) => (
              <li key={r[0]}>
                <label className="ld-row">
                  <input type="checkbox" checked={!skipGroup.has(r[0])} onChange={() => toggle(skipGroup, setSkipGroup, r[0])} />
                  <span className="ld-no">#{r[1]}</span>
                  <span className="ld-title">{r[4]} → <strong>{r[2]}</strong></span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'yeni' && (
        <section className="ld-section">
          <p className="section-title">Eklenecek eserler · durağın sonuna</p>
          <ul className="ld-list">
            {plan.inserts.filter((i) => match(i.title, i.author, i.module)).map((i) => (
              <li key={i.key}>
                <label className="ld-row">
                  <input type="checkbox" checked={!skipNew.has(i.key)} onChange={() => toggle(skipNew, setSkipNew, i.key)} />
                  <span className="ld-no">{i.pair}. çift</span>
                  <span className="ld-title"><strong>{i.title}</strong> — {i.author}</span>
                  <span className="ld-meta">{i.module}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="section-title" style={{ marginTop: 18 }}>Listede zaten olan Kardeş eserleri</p>
          <ul className="ld-list">
            {Object.entries(plan.existing).map(([pair, ids]) => (
              <li key={pair}>
                <span className="ld-no">{pair}. çift</span>
                <span className="ld-title">{ids.map((id) => plan.titles[String(id)]?.[0]).filter(Boolean).join('  ·  ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ld-apply">
        <button className="btn btn-primary" onClick={apply} disabled={running}>
          {running ? 'Uygulanıyor…' : done ? 'Tekrar kontrol et' : `Uygula (${plan.snapshot.total} → ${finalCount})`}
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
            Bitti. Liste bir dakika içinde sitede yenilenir: <Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link>
          </p>
        )}
      </section>
    </div>
  );
}
