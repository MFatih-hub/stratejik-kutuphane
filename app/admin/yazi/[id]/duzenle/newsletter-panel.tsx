'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

/** Yayındaki bir yazıyı e-posta abonelerine gönderme. */
export default function NewsletterPanel({ postId, sentAt }: { postId: number; sentAt: string | null }) {
  const supabase = createClient();
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(sentAt);

  useEffect(() => {
    supabase.from('subscribers').select('id', { count: 'exact', head: true }).not('confirmed_at', 'is', null).is('unsubscribed_at', null)
      .then(({ count: c }) => setCount(c ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(test: boolean) {
    if (!test && !confirm(`Bu yazı ${count ?? 0} aboneye e-postayla gönderilsin mi?${sent ? ' (Daha önce gönderilmişti.)' : ''}`)) return;
    setBusy(true); setMsg('');
    const res = await fetch('/api/admin/bulten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, test }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(j.error || 'Gönderilemedi'); return; }
    setMsg(test ? `Deneme e-postası ${j.to} adresine gönderildi.` : `${j.sent} aboneye gönderildi.`);
    if (!test) setSent(new Date().toISOString());
  }

  return (
    <div className="sidebar-section">
      <label className="form-label">Abonelere gönder</label>
      <p className="form-hint">
        {count === null ? '…' : `${count} onaylı abone`}
        {sent ? ` · son gönderim ${new Date(sent).toLocaleDateString('tr-TR')}` : ''}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => send(true)}>Önce bana deneme</button>
        <button type="button" className="btn btn-sm btn-primary" disabled={busy || !count} onClick={() => send(false)}>Gönder</button>
      </div>
      {msg && <p className="form-hint" style={{ marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
