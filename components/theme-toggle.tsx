'use client';

import { useEffect, useState } from 'react';
import { ThemeIcon } from './calm';

// Temalar: otomatik (gündüz Sis, gün batımından sonra Gece Denizi) → Sis →
// Gece Denizi → Metalik Deniz → otomatik… Seçim bu tarayıcıda hatırlanır.
type Mode = 'auto' | 'light' | 'dark' | 'blue';

const LABELS: Record<Mode, string> = {
  auto: 'Otomatik: gün batımından sonra koyu (Sis temasına geçmek için tıkla)',
  light: 'Sis (Gece Denizi temasına geçmek için tıkla)',
  dark: 'Gece Denizi (Metalik Deniz temasına geçmek için tıkla)',
  blue: 'Metalik Deniz (otomatiğe dönmek için tıkla)',
};
const NEXT: Record<Mode, Mode> = { auto: 'light', light: 'dark', dark: 'blue', blue: 'auto' };

// İstanbul (UTC+3) için ayın ortasında yaklaşık gün doğumu / batımı (dakika)
const SUN: [number, number][] = [
  [505, 1025], [480, 1065], [435, 1100], [390, 1185], [355, 1220], [330, 1240],
  [340, 1235], [370, 1205], [400, 1155], [435, 1110], [470, 1020], [500, 1005],
];

function isNightInIstanbul(d = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', month: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const mins = get('hour') * 60 + get('minute');
  const [rise, set] = SUN[get('month') - 1];
  return mins < rise || mins >= set;
}

function resolve(mode: Mode): 'light' | 'dark' | 'blue' {
  return mode === 'auto' ? (isNightInIstanbul() ? 'dark' : 'light') : mode;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let saved: Mode = 'auto';
    try {
      const v = localStorage.getItem('theme') as Mode | null;
      if (v && ['auto', 'light', 'dark', 'blue'].includes(v)) saved = v;
    } catch { /* yok */ }
    setMode(saved);
    document.documentElement.setAttribute('data-theme', resolve(saved));
  }, []);

  // Otomatikteyken gün batımını kaçırmamak için arada bir yeniden bak
  useEffect(() => {
    if (mode !== 'auto') return;
    const t = setInterval(() => document.documentElement.setAttribute('data-theme', resolve('auto')), 5 * 60_000);
    return () => clearInterval(t);
  }, [mode]);

  function toggle() {
    const next = NEXT[mode];
    setMode(next);
    document.documentElement.setAttribute('data-theme', resolve(next));
    try { localStorage.setItem('theme', next); } catch { /* yok */ }
  }

  if (!mounted) return <button className="icon-btn" aria-label="Tema"><ThemeIcon name="moon" /></button>;

  const icon = mode === 'auto' ? 'auto' : mode === 'light' ? 'sun' : mode === 'dark' ? 'moon' : 'sea';
  return (
    <button onClick={toggle} className="icon-btn" aria-label={LABELS[mode]} title={LABELS[mode]}>
      <ThemeIcon name={icon as any} />
    </button>
  );
}
