'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { CATEGORIES, resolveCategorySlug, slugify } from '@/lib/helpers';

type ParsedItem = {
  key: number;
  title: string;
  source: string;
  url: string;
  summary: string;
  categorySlug: string;
  categoryGuessed: boolean;
  include: boolean;
  status: 'idle' | 'saving' | 'done' | 'error';
  error?: string;
};

const FIELD_ALIASES: Record<string, 'category' | 'title' | 'source' | 'url' | 'summary'> = {
  kategori: 'category', category: 'category',
  başlık: 'title', baslik: 'title', title: 'title',
  kaynak: 'source', source: 'source', 'kaynak adı': 'source', 'kaynak adi': 'source',
  url: 'url', link: 'url', bağlantı: 'url', baglanti: 'url',
  özet: 'summary', ozet: 'summary', summary: 'summary', özeti: 'summary',
};

const EXAMPLE = `Kategori: Jeopolitik
Başlık: A Return to Mass: Russian Force Expansion in the War with Ukraine
Kaynak: War on the Rocks
URL: https://warontherocks.com/a-return-to-mass-russian-force-expansion-in-the-war-with-ukraine/
Özet: Rusya'nın Ukrayna savaşında güç büyütme stratejisini ele alan bir analiz.

Kategori: Teknoloji
Başlık: Meet GPT-Red: an LLM super-hacker OpenAI built to make its models safer
Kaynak: MIT Technology Review
URL: https://www.technologyreview.com/2026/07/15/1140514/meet-gpt-red-an-llm-super-hacker-openai-built-to-make-its-models-safer/
Özet: OpenAI'ın kendi modellerini test etmek için geliştirdiği yapay zeka "hacker"ı üzerine.`;

function parseBlock(block: string, key: number): ParsedItem {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const fields: Record<string, string> = { category: '', title: '', source: '', url: '', summary: '' };
  let lastField: string | null = null;

  for (const line of lines) {
    const m = /^([^:]{1,20}):\s*(.*)$/.exec(line);
    if (m) {
      const label = m[1].trim().toLowerCase();
      const mapped = FIELD_ALIASES[label];
      if (mapped) {
        fields[mapped] = fields[mapped] ? `${fields[mapped]} ${m[2].trim()}` : m[2].trim();
        lastField = mapped;
        continue;
      }
    }
    // Etiketsiz satır (ör. özetin devamı) — son alana eklenir
    if (lastField) fields[lastField] = `${fields[lastField]} ${line}`.trim();
  }

  const resolved = resolveCategorySlug(fields.category);
  return {
    key,
    title: fields.title,
    source: fields.source,
    url: fields.url,
    summary: fields.summary,
    categorySlug: resolved || CATEGORIES[0].slug,
    categoryGuessed: !resolved,
    include: true,
    status: 'idle',
  };
}

function parseText(text: string): ParsedItem[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b, i) => parseBlock(b, i));
}

export default function BulkAddClient() {
  const supabase = createClient();
  const [raw, setRaw] = useState('');
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [publishMode, setPublishMode] = useState<'yayinla' | 'taslak'>('yayinla');
  const [running, setRunning] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState('');

  function handleParse() {
    const parsed = parseText(raw);
    setItems(parsed);
    setSummaryMsg('');
  }

  function updateItem(key: number, patch: Partial<ParsedItem>) {
    setItems((prev) => (prev ? prev.map((it) => (it.key === key ? { ...it, ...patch } : it)) : prev));
  }

  async function insertOne(item: ParsedItem): Promise<{ ok: boolean; error?: string }> {
    const baseSlug = slugify(item.title) || `paylasim-${item.key}`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const { error } = await supabase.from('posts').insert({
        slug: candidateSlug,
        title: item.title.trim(),
        subtitle: null,
        content: '',
        content_format: 'html',
        excerpt: (item.summary || '').slice(0, 180),
        cover_image_url: null,
        category: item.categorySlug,
        tags: [],
        reading_minutes: 1,
        is_published: publishMode === 'yayinla',
        published_at: publishMode === 'yayinla' ? new Date().toISOString() : null,
        post_type: 'okuma_bulteni',
        source_name: item.source.trim() || null,
        source_url: item.url.trim(),
        source_summary: item.summary.trim() || null,
      });
      if (!error) return { ok: true };
      if (error.code === '23505') continue; // slug çakışması — bir sonraki numarayı dene
      return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Uygun slug bulunamadı (çok fazla çakışma)' };
  }

  async function handleInsertAll() {
    if (!items) return;
    setRunning(true);
    setSummaryMsg('');
    let okCount = 0;
    let failCount = 0;

    for (const item of items) {
      if (!item.include || item.status === 'done') continue;
      if (!item.title.trim() || !item.url.trim()) {
        updateItem(item.key, { status: 'error', error: 'Başlık ve URL zorunlu' });
        failCount++;
        continue;
      }
      updateItem(item.key, { status: 'saving' });
      const result = await insertOne(item);
      if (result.ok) {
        updateItem(item.key, { status: 'done' });
        okCount++;
      } else {
        updateItem(item.key, { status: 'error', error: result.error });
        failCount++;
      }
    }

    setRunning(false);
    setSummaryMsg(`${okCount} eklendi${failCount > 0 ? `, ${failCount} başarısız` : ''}.`);
  }

  const includedCount = items ? items.filter((i) => i.include && i.status !== 'done').length : 0;

  return (
    <div className="bulk-add-layout">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Okuma Bülteni — Toplu Ekle</h1>
          <p className="admin-sub">
            Birden fazla linki tek seferde ekle. Her öğeyi boş satırla ayır, alanları <code>Etiket: değer</code> biçiminde yaz.
          </p>
        </div>
        <Link href="/admin" className="btn btn-sm">← Admin</Link>
      </div>

      {!items && (
        <section className="admin-section">
          <textarea
            className="textarea bulk-textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`Kategori: Jeopolitik\nBaşlık: ...\nKaynak: ...\nURL: https://...\nÖzet: ...\n\n(bir sonraki öğe için boş satır bırak)`}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={handleParse} disabled={!raw.trim()}>
              Ayrıştır ve Önizle
            </button>
            <button className="btn btn-sm" onClick={() => setRaw(EXAMPLE)}>Örnek metni yapıştır</button>
          </div>
          <p className="form-hint" style={{ marginTop: 10 }}>
            Kabul edilen etiketler: Kategori, Başlık, Kaynak, URL, Özet (İngilizce karşılıkları da çalışır: Category, Title, Source, URL, Summary).
          </p>
        </section>
      )}

      {items && (
        <section className="admin-section">
          <div className="bulk-toolbar">
            <div className="bulk-toolbar-left">
              <span>{items.length} öğe ayrıştırıldı</span>
              <label style={{ marginLeft: 16 }}>
                <input type="radio" name="publishMode" checked={publishMode === 'yayinla'} onChange={() => setPublishMode('yayinla')} /> Yayınla
              </label>
              <label style={{ marginLeft: 10 }}>
                <input type="radio" name="publishMode" checked={publishMode === 'taslak'} onChange={() => setPublishMode('taslak')} /> Taslak olarak ekle
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setItems(null)} disabled={running}>← Metne dön</button>
              <button className="btn btn-primary" onClick={handleInsertAll} disabled={running || includedCount === 0}>
                {running ? 'Ekleniyor…' : `${includedCount} öğeyi ekle`}
              </button>
            </div>
          </div>

          {summaryMsg && <p className="form-hint" style={{ marginBottom: 10 }}>{summaryMsg}</p>}

          <div className="bulk-items">
            {items.map((item) => (
              <div key={item.key} className={`bulk-item${item.status === 'done' ? ' bulk-item-done' : ''}${item.status === 'error' ? ' bulk-item-error' : ''}`}>
                <div className="bulk-item-check">
                  <input
                    type="checkbox"
                    checked={item.include}
                    disabled={item.status === 'done' || running}
                    onChange={(e) => updateItem(item.key, { include: e.target.checked })}
                  />
                </div>
                <div className="bulk-item-fields">
                  <input
                    className="input"
                    value={item.title}
                    disabled={running}
                    onChange={(e) => updateItem(item.key, { title: e.target.value })}
                    placeholder="Başlık"
                  />
                  <div className="bulk-item-row">
                    <input
                      className="input"
                      value={item.source}
                      disabled={running}
                      onChange={(e) => updateItem(item.key, { source: e.target.value })}
                      placeholder="Kaynak adı"
                      style={{ flex: 1 }}
                    />
                    <select
                      className="select"
                      value={item.categorySlug}
                      disabled={running}
                      onChange={(e) => updateItem(item.key, { categorySlug: e.target.value, categoryGuessed: false })}
                      style={{ flex: 1 }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="input"
                    value={item.url}
                    disabled={running}
                    onChange={(e) => updateItem(item.key, { url: e.target.value })}
                    placeholder="https://…"
                  />
                  <textarea
                    className="textarea"
                    value={item.summary}
                    disabled={running}
                    onChange={(e) => updateItem(item.key, { summary: e.target.value })}
                    placeholder="Özet"
                    style={{ minHeight: 50 }}
                  />
                  <div className="bulk-item-warnings">
                    {!item.title.trim() && <span className="bulk-warning">⚠ Başlık eksik</span>}
                    {!item.url.trim() && <span className="bulk-warning">⚠ URL eksik</span>}
                    {item.categoryGuessed && <span className="bulk-warning">⚠ Kategori tahmin edildi, kontrol et</span>}
                    {!item.summary.trim() && <span className="bulk-warning">Özet yok (sonra eklenebilir)</span>}
                  </div>
                  {item.status === 'error' && <p className="bulk-warning">Hata: {item.error}</p>}
                  {item.status === 'done' && <p className="form-hint">✓ Eklendi</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
