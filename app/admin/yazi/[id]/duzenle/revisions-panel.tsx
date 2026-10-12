'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SANITIZE_CONFIG } from '@/lib/content';

// Sürüm geçmişi: veritabanı yazının eski hâllerini kendiliğinden saklar
// (en fazla 10 dakikada bir; metin birden belirgin kısalırsa beklemeden).
// Buradan önceki bir hâle bakılır ve istenirse geri dönülür.

type Rev = { id: number; reason: string; words: number | null; version_at: string | null; created_at: string; title: string | null };

const REASON: Record<string, string> = { zaman: '', kisalma: 'metin kısalmadan önce', elle: 'elle kaydedildi', geri: 'geri dönmeden önce' };

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const y = new Date(today); y.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Bugün ${time}`;
  if (d.toDateString() === y.toDateString()) return `Dün ${time}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })} ${time}`;
}

export default function RevisionsPanel({
  postId, current, onRestore,
}: {
  postId: number;
  current: () => { title: string; subtitle: string; content: string; excerpt: string; bibliography: string; words: number };
  onRestore: (rev: { title: string | null; subtitle: string | null; content: string; bibliography: string | null }) => void;
}) {
  const supabase = createClient();
  const [list, setList] = useState<Rev[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ rev: Rev; html: string; full: any } | null>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('post_revisions')
      .select('id, reason, words, version_at, created_at, title')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) { setMissing(true); setList([]); return; }
    setList((data || []) as Rev[]);
  }

  useEffect(() => { if (open && list === null) load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function snapshot(reason: 'elle' | 'geri') {
    const c = current();
    const { error } = await supabase.from('post_revisions').insert({
      post_id: postId, title: c.title, subtitle: c.subtitle || null, content: c.content, excerpt: c.excerpt || null,
      bibliography: c.bibliography || null, words: c.words, reason, version_at: new Date().toISOString(),
    });
    return !error;
  }

  async function show(rev: Rev) {
    const { data } = await supabase.from('post_revisions').select('*').eq('id', rev.id).single();
    if (!data) return;
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    setPreview({ rev, html: DOMPurify.sanitize(data.content || '', SANITIZE_CONFIG), full: data });
  }

  async function restore() {
    if (!preview) return;
    if (!confirm('Metin bu sürümle değiştirilsin mi? Şimdiki hâl de sürüm olarak saklanacak, istersen geri dönebilirsin.')) return;
    await snapshot('geri');
    onRestore({ title: preview.full.title, subtitle: preview.full.subtitle, content: preview.full.content || '', bibliography: preview.full.bibliography });
    setPreview(null);
    setMsg('Eski sürüm geri yüklendi — birkaç saniye içinde kendiliğinden kaydedilir.');
    setList(null);
    setTimeout(load, 400);
  }

  return (
    <div className="sidebar-section revisions-panel">
      <button type="button" className="sidebar-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="form-label" style={{ margin: 0 }}>Sürüm geçmişi</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <>
          {missing ? (
            <p className="form-hint">Sürüm geçmişi için Supabase'de <code>SUPABASE-MIGRATION-v6.sql</code> dosyasını bir kez çalıştırman gerekiyor.</p>
          ) : list === null ? (
            <p className="form-hint">Yükleniyor…</p>
          ) : (
            <>
              <p className="form-hint">Eski hâller kendiliğinden saklanır: en fazla 10 dakikada bir, bir bölüm silindiğinde hemen.</p>
              {list.length === 0 && <p className="form-hint"><em>Henüz kayıtlı sürüm yok.</em></p>}
              <ul className="rev-list">
                {list.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="rev-item" onClick={() => show(r)}>
                      <span>{when(r.version_at || r.created_at)}</span>
                      <span className="rev-meta">{r.words != null ? `${r.words} kelime` : ''}{REASON[r.reason] ? ` · ${REASON[r.reason]}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-sm" onClick={async () => { if (await snapshot('elle')) { setMsg('Şimdiki hâl sürüm olarak kaydedildi.'); load(); } }}>
                Şimdiki hâli sakla
              </button>
            </>
          )}
          {msg && <p className="form-hint" style={{ marginTop: 8 }}>{msg}</p>}
        </>
      )}

      {preview && (
        <div className="rev-modal" role="dialog" aria-modal="true" aria-label="Sürüm önizleme" onClick={() => setPreview(null)}>
          <div className="rev-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rev-modal-head">
              <div>
                <p className="today-kicker">Sürüm · {when(preview.rev.version_at || preview.rev.created_at)}</p>
                <h3 className="rev-modal-title">{preview.full.title}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={restore}>Bu sürüme dön</button>
                <button type="button" className="btn btn-sm" onClick={() => setPreview(null)}>Kapat</button>
              </div>
            </div>
            <div className="post-content rev-modal-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        </div>
      )}
    </div>
  );
}
