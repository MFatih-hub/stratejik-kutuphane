'use client';

import { useEffect, useState } from 'react';
import { AppearanceIcon } from './icons';
import { NEXT_THEME, THEME_NAMES, resolveTheme, type ThemeMode } from '@/lib/theme';

// Görünüm sırası: Otomatik → Sis → Gece Denizi → Metalik Deniz → Otomatik.
// Seçim bu tarayıcıda hatırlanır; ilk boyamayı <head>'deki küçük betik yapar.
export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    let saved: ThemeMode = 'auto';
    try {
      const v = localStorage.getItem('theme') as ThemeMode | null;
      if (v && v in THEME_NAMES) saved = v;
    } catch { /* yok */ }
    setMode(saved);
  }, []);

  // Otomatikteyken gün batımını kaçırmamak için arada bir yeniden bak
  useEffect(() => {
    if (mode !== 'auto') return;
    const t = setInterval(() => document.documentElement.setAttribute('data-theme', resolveTheme('auto')), 5 * 60_000);
    return () => clearInterval(t);
  }, [mode]);

  function toggle() {
    const next = NEXT_THEME[mode];
    setMode(next);
    document.documentElement.setAttribute('data-theme', resolveTheme(next));
    try { localStorage.setItem('theme', next); } catch { /* yok */ }
  }

  const label = `Görünüm: ${THEME_NAMES[mode]}`;
  return (
    <button type="button" onClick={toggle} className="nav-icon" aria-label={label} title={label}>
      <AppearanceIcon />
    </button>
  );
}
