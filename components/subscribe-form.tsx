'use client';

import { useEffect, useState } from 'react';

/** E-posta aboneliği (onay e-postasıyla). Yalnızca abonelik ayarları yapılmışsa gösterilir. */
export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('');
  const [since, setSince] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => setSince(Date.now()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/abone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: hp, t: Date.now() - since }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setState('err'); setMsg(j.error || 'Olmadı. Biraz sonra tekrar dene.'); return; }
      setState('ok');
      setMsg(j.message || 'Onay e-postası gönderildi.');
    } catch {
      setState('err');
      setMsg('Bağlantı kurulamadı.');
    }
  }

  if (state === 'ok') return <p className="subscribe-note">{msg}</p>;

  return (
    <form onSubmit={submit} className="subscribe">
      <label className="subscribe-label" htmlFor="abone-eposta">Yeni yazılar e-postana gelsin</label>
      <div className="subscribe-row">
        <input
          id="abone-eposta"
          type="email"
          required
          className="input"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input type="text" tabIndex={-1} autoComplete="off" className="hp-field" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" />
        <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>Abone ol</button>
      </div>
      {state === 'err' && <p className="subscribe-note">{msg}</p>}
    </form>
  );
}
