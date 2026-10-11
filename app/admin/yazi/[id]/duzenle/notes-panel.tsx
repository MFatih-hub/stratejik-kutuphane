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
        <p className="form-hint">Bu eser için henüz fiş yok. <Link href="/admin/bugun">Bugün</Link> ekranından okurken not alabilirsin.</p>
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
          <button type="button" className="btn btn-sm" onClick={() => { onInsert(notes.map(noteToHtml).join('')); setUsed(new Set(notes.map((n) => n.id))); }}>
            Hepsini sırayla ekle
          </button>
        </>
      )}
    </div>
  );
}
