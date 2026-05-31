'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'blue';

const ICONS: Record<Theme, string> = { light: '🌙', dark: '🌌', blue: '☀️' };
const LABELS: Record<Theme, string> = {
  light: 'Koyu temaya geç',
  dark: 'Mavi metalik temaya geç',
  blue: 'Açık temaya geç',
};
const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'blue', blue: 'light' };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = NEXT[theme];
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  if (!mounted) return <button className="icon-btn" aria-label="Tema">⚪</button>;

  return (
    <button onClick={toggle} className="icon-btn" aria-label={LABELS[theme]} title={LABELS[theme]}>
      {ICONS[theme]}
    </button>
  );
}
