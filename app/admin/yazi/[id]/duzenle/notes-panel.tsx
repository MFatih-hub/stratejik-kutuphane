'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

// Tahlil yazarken: bu eser için okurken alınan fişler. "Metne ekle" ile
// imlecin olduğu yere alıntı / paragraf olarak eklenir.
const KIND_LABEL: Record<string, string> = { not: 'Not', alinti: 'Alıntı', soru: 'Soru' };

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

export function noteToHtml(n: { kind: string; body: string; page: string | null }): string {
  const page = n.page ? ` <em>(s. ${esc(n.page)})</em>` : '';
  if (n.kind === 'alinti') return `<blockquote><p>${esc(n.body)}${page}</p></blockquote><p></p>`;
  if (n.kind === 'soru') return `<p><strong>Soru:</strong> ${esc(n.body)}${page}</p>`;
  return `<p>${esc(n.body)}${page}</p>`;
}

/** Sayfa numarasına göre sıralama anahtarı ("12", "s. 40-41" → 12, 40); sayfasızlar sona. */
function pageKey(n: { page: string | null }) {
  const m = /\d+/.exec(n.page || '');
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * Fişlerden tahlil taslağı: notlar "Ana fikirler", alıntılar "Öne çıkan
 * alıntılar", sorular "Açık sorular" altında, her biri sayfa sırasıyla.
 * Giriş ve değerlendirme başlıkları yazman için boş bırakılır.
 */
export function draftFromNotes(notes: { kind: string; body: string; page: string | null; created_at?: string }[]): string {
  const sorted = [...notes].sort((a, b) => pageKey(a) - pageKey(b) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const of = (k: string) => sorted.filter((n) => (n.kind || 'not') === k);
  const ideas = of('not');
  const quotes = of('alinti');
  const questions = of('soru');
  const page = (n: { page: string | null }) => (n.page ? ` <em>(s. ${esc(n.page)})</em>` : '');
  let html = '<h2>Eser ve bağlamı</h2><p></p>';
  if (ideas.length) html += '<h2>Ana fikirler</h2>' + ideas.map((n) => `<p>${esc(n.body)}${page(n)}</p>`).join('');
  if (quotes.length) html += '<h2>Öne çıkan alıntılar</h2>' + quotes.map((n) => `<blockquote><p>${esc(n.body)}${page(n)}</p></blockquote>`).join('');
  if (questions.length) html += '<h2>Açık sorular</h2><ul>' + questions.map((n) => `<li><p>${esc(n.body)}${page(n)}</p></li>`).join('') + '</ul>';
  html += '<h2>Değerlendirme</h2><p></p>';
  return html;
}

export default function NotesPanel({ postId, onInsert }: { postId: number; onInsert: (html: string) => void }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<any[] | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase.from('notes').select('*').eq('post_id', postId).order('created_at', { ascending: true })
      .then(({ data, error }) => setNotes(error ? [] : data || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (notes === null) return <div className="sidebar-section notes-panel"><p className="form-hint">Fişler yükleniyor…</p></div>;

  return (
    <div className="sidebar-section notes-panel">
      <label className="form-label">Okurken aldığın fişler ({notes.length})</label>
      {notes.length === 0 ? (
        <p className="form-hint">Bu eser için henüz fiş yok. <Link href="/admin/dem">Dem</Link>’de okurken not alabilirsin.</p>
      ) : (
        <>
          <ul className="notes-panel-list">
            {notes.map((n) => (
              <li key={n.id} className={used.has(n.id) ? 'is-used' : ''}>
                <span className="note-kind">{KIND_LABEL[n.kind] || 'Not'}{n.page ? ` · s. ${n.page}` : ''}</span>
                <p>{n.body}</p>
                <button type="button" className="btn btn-sm" onClick={() => { onInsert(noteToHtml(n)); setUsed((u) => new Set(u).add(n.id)); }}>
                  {used.has(n.id) ? 'Tekrar ekle' : 'Metne ekle'}
                </button>
              </li>
            ))}
          </ul>
          <div className="notes-panel-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { onInsert(draftFromNotes(notes)); setUsed(new Set(notes.map((n) => n.id))); }}>
              Fişlerden taslak kur
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { onInsert(notes.map(noteToHtml).join('')); setUsed(new Set(notes.map((n) => n.id))); }}>
              Hepsini sırayla ekle
            </button>
          </div>
          <p className="form-hint">Taslak: notlar “Ana fikirler”, alıntılar “Öne çıkan alıntılar”, sorular “Açık sorular” başlığı altında, sayfa sırasıyla; giriş ve değerlendirme sana kalır.</p>
        </>
      )}
    </div>
  );
}
