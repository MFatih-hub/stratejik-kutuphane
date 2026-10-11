'use client';

import { useEffect, useState } from 'react';

// Uzun metinler için yazı boyu ve satır aralığı. Tercih bu tarayıcıda hatırlanır.
const SIZES = [16, 17.5, 19, 20.5, 22.5];
const LEADINGS = [1.6, 1.75, 1.95];
const KEY = 'zh-reading';

function apply(size: number, leading: number) {
  document.documentElement.style.setProperty('--read-size', `${size}px`);
  document.documentElement.style.setProperty('--read-leading', String(leading));
}

export default function ReadingSettings() {
  const [s, setS] = useState(2);
  const [l, setL] = useState(1);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved.s === 'number' && typeof saved.l === 'number') { setS(saved.s); setL(saved.l); apply(SIZES[saved.s], LEADINGS[saved.l]); }
    } catch { /* yok */ }
  }, []);

  function update(ns: number, nl: number) {
    setS(ns); setL(nl); apply(SIZES[ns], LEADINGS[nl]);
    try { localStorage.setItem(KEY, JSON.stringify({ s: ns, l: nl })); } catch { /* yok */ }
  }

  return (
    <div className="reading-settings" aria-label="Okuma ayarları">
      <button type="button" onClick={() => update(Math.max(0, s - 1), l)} disabled={s === 0} aria-label="Yazıyı küçült">A−</button>
      <button type="button" onClick={() => update(Math.min(SIZES.length - 1, s + 1), l)} disabled={s === SIZES.length - 1} aria-label="Yazıyı büyüt">A+</button>
      <button type="button" onClick={() => update(s, (l + 1) % LEADINGS.length)} aria-label="Satır aralığını değiştir" title="Satır aralığı">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
