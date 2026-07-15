'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/content';

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-96px 0px -70% 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="toc-box" aria-label="İçindekiler">
      <p className="toc-title">İçindekiler</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`toc-item toc-level-${h.level}${activeId === h.id ? ' toc-active' : ''}`}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
