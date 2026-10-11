'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { CATEGORIES, resolveCategorySlug, slugify } from '@/lib/helpers';
import { parseBookInput, bookKey } from '@/lib/book-import';

type BookItem = {
  key: number;
  order: string; // input'ta düzenlenebilsin diye metin
  author: string;
  title: string;
  module: string;
  categorySlug: string;
  categoryGuessed: boolean;
  exists: boolean; // sitede zaten var
  existingId: number | null; // sitedeki kaydın id'si (güncelleme için)
  include: boolean;
  status: 'idle' | 'saving' | 'done' | 'error';
  result?: 'eklendi' | 'guncellendi';
  error?: string;
};

const DEFAULT_CATEGORY = 'dusunce'; // Felsefe
const PREVIEW_PAGE = 100;
const INSERT_CHUNK = 100;
const FETCH_PAGE = 1000;
const UPDATE_CONCURRENCY = 6;

const EXAMPLE_TSV = `Sıra\tYazar\tMetin
1\tPlaton\tApology (Sokrates'in Savunması)
2\tAristoteles\tProtrepticus (fragmanlar)
3\tAristoteles\tMetaphysics, I. kitap (A)`;

const EXAMPLE_LABELED = `Sıra: 1
Yazar: Platon
Metin: Apology (Sokrates'in Savunması)
Kategori: Felsefe

Sıra: 2
Yazar: Aristoteles
Metin: Protrepticus (fragmanlar)`;

function toOrder(value: string): number | null {
  const n = parseInt((value || '').replace(/\D+/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Veritabanı hatasını okunur hale getirir (migration v4 çalıştırılmamışsa bunu söyler). */
function explainError(message: string): string {
  if (/book_author|reading_order|reading_module/.test(message)) {
    return 'Veritabanında yazar/sıra alanları yok — önce Supabase\'de SUPABASE-MIGRATION-v4.sql\'i çalıştır.';
  }
  return message;
}

function makeSlug(item: BookItem, attempt: number): string {
  const order = toOrder(item.order);
  const base = slugify(item.title).substring(0, 60).replace(/-+$/, '') || 'eser';
  const core = order !== null ? `${order}-${base}` : base;
  if (attempt === 0) return order !== null ? core : `${core}-${Math.random().toString(36).slice(2, 6)}`;
  return `${core}-${attempt + 1}`;
}

export default function BookBulkAddClient() {
  const supabase = createClient();
  const [raw, setRaw] = useState('');
  const [items, setItems] = useState<BookItem[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState(DEFAULT_CATEGORY);
  const [publishMode, setPublishMode] = useState<'yayinla' | 'taslak'>('yayinla');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summaryMsg, setSummaryMsg] = useState('');
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'tumu' | 'sorunlu'>('tumu');
  // Sitede zaten olan eserler (aynı sıra numarası) atlansın mı, güncellensin mi?
  // Güncelleme sadece başlık, yazar, sıra ve durağı yazar — tahlil notuna ve
  // yayın durumuna dokunmaz.
  const [updateExisting, setUpdateExisting] = useState(true);

  /** Sitedeki kitap kayıtları: sıra numarasına göre (yoksa başlığa göre) id haritası. */
  async function fetchExisting(): Promise<{ byOrder: Map<number, number>; byTitle: Map<string, number> }> {
    const byOrder = new Map<number, number>();
    const byTitle = new Map<string, number>();
    for (let p = 0; p < 50; p++) {
      const from = p * FETCH_PAGE;
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, reading_order')
        .eq('post_type', 'kitap_tahlili')
        .order('id', { ascending: true })
        .range(from, from + FETCH_PAGE - 1);
      if (error || !data || data.length === 0) break;
      data.forEach((r: any) => {
        if (r.reading_order != null && !byOrder.has(r.reading_order)) byOrder.set(r.reading_order, r.id);
        byTitle.set(bookKey(null, r.title || ''), r.id);
      });
      if (data.length < FETCH_PAGE) break;
    }
    return { byOrder, byTitle };
  }

  async function handleParse() {
    setParsing(true);
    setSummaryMsg('');
    const parsed = parseBookInput(raw);
    const existing = await fetchExisting();
    const list: BookItem[] = parsed.map((b, i) => {
      const resolved = b.category ? resolveCategorySlug(b.category) : null;
      // Sıra numarası varsa eşleşme sıraya göre (başlık önceki yüklemede kesik
      // ya da farklı yazılmış olabilir); yoksa başlığa göre.
      const existingId = b.order !== null
        ? existing.byOrder.get(b.order) ?? null
        : existing.byTitle.get(bookKey(null, b.title)) ?? null;
      const exists = existingId !== null;
      return {
        key: i,
        order: b.order !== null ? String(b.order) : '',
        author: b.author,
        title: b.title,
        module: b.module,
        categorySlug: resolved || defaultCategory,
        categoryGuessed: !!b.category && !resolved,
        exists,
        existingId,
        include: !exists || updateExisting,
        status: 'idle',
      };
    });
    setItems(list);
    setPage(0);
    setView('tumu');
    setParsing(false);
  }

  function updateItem(key: number, patch: Partial<BookItem>) {
    setItems((prev) => (prev ? prev.map((it) => (it.key === key ? { ...it, ...patch } : it)) : prev));
  }

  function updateMany(patches: Map<number, Partial<BookItem>>) {
    setItems((prev) => (prev ? prev.map((it) => (patches.has(it.key) ? { ...it, ...patches.get(it.key)! } : it)) : prev));
  }

  function applyCategoryToAll(slug: string) {
    setDefaultCategory(slug);
    setItems((prev) => (prev ? prev.map((it) => (it.status === 'done' ? it : { ...it, categorySlug: slug, categoryGuessed: false })) : prev));
  }

  // Aynı sıra numarası listede birden fazla kez geçiyor mu?
  const duplicateOrders = useMemo(() => {
    const counts = new Map<string, number>();
    (items || []).forEach((it) => { if (it.order) counts.set(it.order, (counts.get(it.order) || 0) + 1); });
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([o]) => o));
  }, [items]);

  function issuesOf(it: BookItem): string[] {
    const out: string[] = [];
    if (!it.title.trim()) out.push('Metin/başlık eksik');
    if (!it.author.trim()) out.push('Yazar eksik');
    if (!it.order) out.push('Sıra yok');
    if (it.order && duplicateOrders.has(it.order)) out.push('Sıra tekrarlanıyor');
    if (it.categoryGuessed) out.push('Kategori tanınmadı');
    if (it.exists && !updateExisting) out.push('Sitede zaten var (atlanacak)');
    if (it.status === 'error') out.push(`Hata: ${it.error}`);
    return out;
  }

  const hasModules = !!items && items.some((it) => it.module.trim());

  function rowFor(item: BookItem, slug: string) {
    const now = new Date().toISOString();
    const isPub = publishMode === 'yayinla';
    return {
      slug,
      title: item.title.trim(),
      subtitle: null,
      content: '',
      content_format: 'html',
      excerpt: null,
      cover_image_url: null,
      category: item.categorySlug,
      tags: [],
      reading_minutes: 1,
      is_published: isPub,
      published_at: isPub ? now : null,
      post_type: 'kitap_tahlili',
      book_author: item.author.trim() || null,
      reading_order: toOrder(item.order),
      // Durak alanı sadece listede durak varsa gönderilir
      ...(hasModules ? { reading_module: item.module.trim() || null } : {}),
    };
  }

  async function insertSingle(item: BookItem): Promise<{ ok: boolean; error?: string }> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { error } = await supabase.from('posts').insert(rowFor(item, makeSlug(item, attempt)));
      if (!error) return { ok: true };
      if (error.code === '23505') continue; // slug çakışması
      return { ok: false, error: explainError(error.message) };
    }
    return { ok: false, error: 'Uygun adres (slug) bulunamadı' };
  }

  async function handleInsertAll() {
    if (!items) return;
    const queue = items.filter((it) => it.include && it.status !== 'done');
    const invalid = queue.filter((it) => !it.title.trim());
    const valid = queue.filter((it) => it.title.trim());

    if (invalid.length) {
      updateMany(new Map(invalid.map((it) => [it.key, { status: 'error' as const, error: 'Metin/başlık zorunlu' }])));
    }

    const toUpdate = valid.filter((it) => it.existingId !== null);
    const toInsert = valid.filter((it) => it.existingId === null);

    setRunning(true);
    setSummaryMsg('');
    setProgress({ done: 0, total: valid.length });
    let okCount = 0;
    let updCount = 0;
    let failCount = invalid.length;
    let doneSoFar = 0;

    // 1) Sitede olanları güncelle (aynı anda birkaç istek; tahlil notuna dokunmaz)
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY * 10) {
      const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY * 10);
      updateMany(new Map(batch.map((it) => [it.key, { status: 'saving' as const }])));
      const patches = new Map<number, Partial<BookItem>>();
      for (let j = 0; j < batch.length; j += UPDATE_CONCURRENCY) {
        const group = batch.slice(j, j + UPDATE_CONCURRENCY);
        const results = await Promise.all(group.map((it) =>
          supabase.from('posts').update({
            title: it.title.trim(),
            book_author: it.author.trim() || null,
            reading_order: toOrder(it.order),
            ...(hasModules ? { reading_module: it.module.trim() || null } : {}),
          }).eq('id', it.existingId as number)
        ));
        results.forEach(({ error }, k) => {
          const it = group[k];
          if (!error) { patches.set(it.key, { status: 'done', result: 'guncellendi', error: undefined }); updCount++; }
          else { patches.set(it.key, { status: 'error', error: explainError(error.message) }); failCount++; }
        });
      }
      updateMany(patches);
      doneSoFar += batch.length;
      setProgress({ done: doneSoFar, total: valid.length });
    }

    // 2) Yenileri 100'erli partilerle ekle
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK);
      updateMany(new Map(chunk.map((it) => [it.key, { status: 'saving' as const }])));

      const { error } = await supabase.from('posts').insert(chunk.map((it) => rowFor(it, makeSlug(it, 0))));
      const patches = new Map<number, Partial<BookItem>>();

      if (!error) {
        chunk.forEach((it) => patches.set(it.key, { status: 'done', result: 'eklendi', error: undefined }));
        okCount += chunk.length;
      } else if (error.code === '23505') {
        // Partide bir adres çakışması var — bu partiyi tek tek, numaralı slug'larla dene.
        for (const it of chunk) {
          const r = await insertSingle(it);
          if (r.ok) { patches.set(it.key, { status: 'done', result: 'eklendi', error: undefined }); okCount++; }
          else { patches.set(it.key, { status: 'error', error: r.error }); failCount++; }
        }
      } else {
        chunk.forEach((it) => patches.set(it.key, { status: 'error', error: explainError(error.message) }));
        failCount += chunk.length;
      }

      updateMany(patches);
      doneSoFar += chunk.length;
      setProgress({ done: doneSoFar, total: valid.length });
    }

    setRunning(false);
    const parts = [`${okCount} eser eklendi`];
    if (updCount > 0) parts.push(`${updCount} eser güncellendi`);
    if (failCount > 0) parts.push(`${failCount} başarısız ("Kontrol edilecekler" sekmesine bak)`);
    setSummaryMsg(parts.join(', ') + '.');
  }

  const visible = useMemo(() => {
    if (!items) return [];
    return view === 'sorunlu' ? items.filter((it) => issuesOf(it).length > 0) : items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, view, duplicateOrders]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PREVIEW_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * PREVIEW_PAGE, (safePage + 1) * PREVIEW_PAGE);

  const includedCount = items ? items.filter((i) => i.include && i.status !== 'done').length : 0;
  const existsCount = items ? items.filter((i) => i.exists).length : 0;
  const updateQueued = items ? items.filter((i) => i.include && i.exists && i.status !== 'done').length : 0;

  function toggleUpdateExisting(on: boolean) {
    setUpdateExisting(on);
    setItems((prev) => (prev ? prev.map((it) => (it.exists && it.status !== 'done' ? { ...it, include: on } : it)) : prev));
  }
  const problemCount = items ? items.filter((i) => issuesOf(i).length > 0).length : 0;
  const doneCount = items ? items.filter((i) => i.status === 'done').length : 0;

  return (
    <div className="bulk-add-layout bulk-add-wide">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Kitap Tahlilleri — Toplu Ekle</h1>
          <p className="admin-sub">
            Okuma listeni tek seferde ekle: eserler Kitap Tahlilleri sayfasında sırayla listelenir, tahlil notlarını sonra tek tek yazarsın.
          </p>
        </div>
        <Link href="/admin?tur=kitap_tahlili" className="btn btn-sm">← Admin</Link>
      </div>

      {!items && (
        <section className="admin-section">
          <ol className="bulk-steps">
            <li>Excel'de <strong>Sıra · Yazar · Metin</strong> sütunlarını (başlık satırıyla birlikte ya da onsuz) seç, <kbd>Ctrl</kbd>+<kbd>C</kbd>.</li>
            <li>Aşağıdaki kutuya <kbd>Ctrl</kbd>+<kbd>V</kbd> ile yapıştır. İsteğe bağlı sütunlar: <strong>Kategori</strong> ve <strong>Durak</strong> (modül; okuma yolculuğunda eserleri gruplar).</li>
            <li>Önizlemede kontrol et, "ekle"ye bas. Sitede zaten olan eserler otomatik atlanır.</li>
          </ol>
          <textarea
            className="textarea bulk-textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'Excel\'den kopyaladığın hücreleri buraya yapıştır…\n\nya da etiketli yaz:\nSıra: 1\nYazar: Platon\nMetin: Apology\n\n(bir sonraki eser için boş satır)'}
          />
          <div className="bulk-parse-row">
            <label className="form-label" style={{ margin: 0 }}>
              Varsayılan kategori&nbsp;
              <select className="select" value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} style={{ width: 'auto', display: 'inline-block' }}>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => setRaw(EXAMPLE_TSV)}>Örnek (Excel)</button>
              <button className="btn btn-sm" onClick={() => setRaw(EXAMPLE_LABELED)}>Örnek (etiketli)</button>
              <button className="btn btn-primary" onClick={handleParse} disabled={!raw.trim() || parsing}>
                {parsing ? 'Ayrıştırılıyor…' : 'Ayrıştır ve Önizle'}
              </button>
            </div>
          </div>
          <p className="form-hint" style={{ marginTop: 10 }}>
            Etiketler: Sıra, Yazar, Metin (veya Başlık/Eser), Kategori, Durak (veya Modül). Kategori satırda yoksa varsayılan kategori kullanılır.
            Başlık "(12) Eser adı" biçimindeyse sıra numarası oradan alınır.
          </p>
        </section>
      )}

      {items && (
        <section className="admin-section">
          <div className="bulk-toolbar">
            <div className="bulk-toolbar-left" style={{ gap: 14 }}>
              <span><strong>{items.length}</strong> eser ayrıştırıldı</span>
              {existsCount > 0 && (
                <label title="Sıra numarası sitedekiyle aynı olan eserlerde başlık, yazar ve durak güncellenir; tahlil notu ve yayın durumu değişmez.">
                  <input type="checkbox" checked={updateExisting} onChange={(e) => toggleUpdateExisting(e.target.checked)} disabled={running} />
                  {' '}Sitede olan {existsCount} eseri güncelle (notlara dokunulmaz)
                </label>
              )}
              <label>
                <input type="radio" name="publishMode" checked={publishMode === 'yayinla'} onChange={() => setPublishMode('yayinla')} disabled={running} /> Yayınla (listede görünsün)
              </label>
              <label>
                <input type="radio" name="publishMode" checked={publishMode === 'taslak'} onChange={() => setPublishMode('taslak')} disabled={running} /> Taslak
              </label>
              <label>
                Tümünün kategorisi&nbsp;
                <select className="select" value={defaultCategory} onChange={(e) => applyCategoryToAll(e.target.value)} disabled={running} style={{ width: 'auto', display: 'inline-block', padding: '4px 8px' }}>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => { setItems(null); setSummaryMsg(''); }} disabled={running}>← Metne dön</button>
              <button className="btn btn-primary" onClick={handleInsertAll} disabled={running || includedCount === 0}>
                {running
                  ? `İşleniyor… ${progress.done}/${progress.total}`
                  : updateQueued > 0
                    ? `${includedCount - updateQueued} ekle · ${updateQueued} güncelle`
                    : `${includedCount} eseri ekle`}
              </button>
            </div>
          </div>

          {running && (
            <div className="bulk-progress" aria-label="İlerleme">
              <div className="bulk-progress-bar" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          )}

          {summaryMsg && (
            <p className="bulk-summary">
              {summaryMsg}{' '}
              {doneCount > 0 && (
                <>
                  <Link href="/kitap-tahlilleri" target="_blank">Kitap Tahlilleri sayfasını aç ↗</Link>
                  {' · '}
                  <Link href="/admin?tur=kitap_tahlili">Admin listesine git</Link>
                </>
              )}
            </p>
          )}

          <div className="admin-tabs" style={{ marginBottom: '1rem' }}>
            <button className={`admin-tab${view === 'tumu' ? ' admin-tab-active' : ''}`} onClick={() => { setView('tumu'); setPage(0); }}>
              Tümü <span className="count-badge">{items.length}</span>
            </button>
            <button className={`admin-tab${view === 'sorunlu' ? ' admin-tab-active' : ''}`} onClick={() => { setView('sorunlu'); setPage(0); }}>
              Kontrol edilecekler <span className="count-badge">{problemCount}</span>
            </button>
          </div>

          <div className="book-table-wrap">
            <table className="book-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th style={{ width: 70 }}>Sıra</th>
                  <th style={{ width: '24%' }}>Yazar</th>
                  <th>Metin</th>
                  {hasModules && <th style={{ width: 150 }}>Durak</th>}
                  <th style={{ width: 130 }}>Kategori</th>
                  <th style={{ width: 120 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const issues = issuesOf(item);
                  const locked = running || item.status === 'done';
                  return (
                    <tr key={item.key} className={`${item.status === 'done' ? 'book-row-done' : ''}${item.status === 'error' ? ' book-row-error' : ''}${!item.include ? ' book-row-skip' : ''}`}>
                      <td>
                        <input type="checkbox" checked={item.include} disabled={locked} onChange={(e) => updateItem(item.key, { include: e.target.checked })} aria-label="Ekle" />
                      </td>
                      <td><input className="input book-cell" value={item.order} disabled={locked} onChange={(e) => updateItem(item.key, { order: e.target.value })} inputMode="numeric" /></td>
                      <td><input className="input book-cell" value={item.author} disabled={locked} onChange={(e) => updateItem(item.key, { author: e.target.value })} /></td>
                      <td><input className="input book-cell" value={item.title} disabled={locked} onChange={(e) => updateItem(item.key, { title: e.target.value })} /></td>
                      {hasModules && (
                        <td><input className="input book-cell" value={item.module} disabled={locked} onChange={(e) => updateItem(item.key, { module: e.target.value })} /></td>
                      )}
                      <td>
                        <select className="select book-cell" value={item.categorySlug} disabled={locked} onChange={(e) => updateItem(item.key, { categorySlug: e.target.value, categoryGuessed: false })}>
                          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className="book-status">
                          {item.status === 'done' && <span className="book-ok">{item.result === 'guncellendi' ? '✓ Güncellendi' : '✓ Eklendi'}</span>}
                          {item.status === 'idle' && item.exists && item.include && <span className="form-hint" style={{ margin: 0, fontSize: 11 }}>Sitede var · güncellenecek</span>}
                          {item.status === 'saving' && <span>…</span>}
                          {item.status !== 'done' && issues.map((m) => <span key={m} className="bulk-warning">{m}</span>)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={hasModules ? 7 : 6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)' }}>Kontrol edilecek satır yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="pager">
              <button className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Önceki</button>
              <span>Sayfa {safePage + 1} / {pageCount}</span>
              <button className="btn btn-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Sonraki →</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
