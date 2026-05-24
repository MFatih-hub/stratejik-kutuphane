'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = (saved as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  if (!mounted) return <button className="icon-btn" style={{ width: 36 }} aria-label="Tema"></button>;

  return (
    <button onClick={toggle} className="icon-btn" aria-label="Tema değiştir" title="Tema değiştir">
      <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`} style={{ fontSize: 16 }}></i>
    </button>
  );
}
