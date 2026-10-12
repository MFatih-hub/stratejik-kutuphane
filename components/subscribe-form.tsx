'use client';

import { useState } from 'react';

/** E-posta aboneliği: yeni yazı ve tahliller e-postayla gelsin. Onay e-postasıyla çalışır. */
export default function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/abone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website: hp }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setState('err'); setMsg(j.error || 'Bir sorun oldu, biraz sonra tekrar dene.'); return; }
      setState('ok');
      setMsg(j.message || 'Onay e-postası gönderildi. Gelen kutunu kontrol et.');
    } catch {
      setState('err');
      setMsg('Bağlantı kurulamadı.');
    }
  }

  return (
    <div className={`subscribe${compact ? ' subscribe-compact' : ''}`}>
      {!compact && (
        <>
          <p className="subscribe-title">Yeni yazılar e-postana gelsin</p>
          <p className="subscribe-sub">Yeni bir yazı ya da tahlil yayımlandığında, sessizce. Reklam yok, istediğin an tek tıkla ayrılırsın.</p>
        </>
      )}
      {state === 'ok' ? (
        <p className="subscribe-ok">{msg}</p>
      ) : (
        <form onSubmit={submit} className="subscribe-form">
          <input type="email" required className="input" placeholder="e-posta adresin" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-posta adresin" autoComplete="email" />
          <input type="text" tabIndex={-1} autoComplete="off" className="hp-field" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" />
          <button type="submit" className="btn btn-primary btn-sm" disabled={state === 'busy'}>{state === 'busy' ? '…' : 'Abone ol'}</button>
        </form>
      )}
      {state === 'err' && <p className="subscribe-err">{msg}</p>}
    </div>
  );
}
