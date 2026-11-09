'use client';

import { useState } from 'react';

export default function SendButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | string>('idle');
  async function send() {
    setState('busy');
    const r = await fetch('/api/admin/hafta', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    setState(r.ok ? 'ok' : j.error || 'Gönderilemedi');
  }
  if (state === 'ok') return <span>Gönderildi.</span>;
  return (
    <>
      <button type="button" className="link-btn" disabled={state === 'busy'} onClick={send}>{state === 'busy' ? 'Gönderiliyor' : 'Şimdi gönder'}</button>
      {state !== 'idle' && state !== 'busy' && <span> {state}</span>}
    </>
  );
}
