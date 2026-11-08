'use client';

import { useState } from 'react';

/**
 * Herkese açık sayfaları elle yeniler. Panelden yapılan kayıtlar bunu zaten
 * kendiliğinden yapar; Supabase'de doğrudan bir değişiklik yapıldığında kullanılır
 * (aksi hâlde sayfalar en geç bir gün içinde kendiliğinden yenilenir).
 */
export default function RefreshButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  async function run() {
    setState('busy');
    const res = await fetch('/api/admin/yenile', { method: 'POST' }).catch(() => null);
    setState(res?.ok ? 'ok' : 'err');
    setTimeout(() => setState('idle'), 2500);
  }
  return (
    <button type="button" className="btn btn-sm" onClick={run} disabled={state === 'busy'}>
      {state === 'ok' ? 'Site yenilendi' : state === 'err' ? 'Yenilenemedi' : 'Siteyi yenile'}
    </button>
  );
}
