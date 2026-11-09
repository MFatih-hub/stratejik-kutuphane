'use client';

import { useEffect, useState } from 'react';
import { Chevron } from './icons';

/**
 * Rafın altındaki iki yuvarlak ok (Apple'daki gibi). Yalnızca kartlar ekrana
 * sığmadığında görünür; telefonda gizlidir (parmakla kaydırılır).
 */
export default function ShelfPaddles({ target }: { target: string }) {
  const [state, setState] = useState<{ prev: boolean; next: boolean } | null>(null);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setState(max > 4 ? { prev: el.scrollLeft > 4, next: el.scrollLeft < max - 4 } : null);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [target]);

  if (!state) return null;

  function go(dir: 1 | -1) {
    const el = document.getElementById(target);
    if (!el) return;
    const item = el.querySelector('li');
    const step = item ? item.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    const count = Math.max(1, Math.floor((el.clientWidth - 40) / step));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step * count, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <div className="paddles">
      <button type="button" className="paddle" aria-label="Önceki" disabled={!state.prev} onClick={() => go(-1)}>
        <Chevron dir="left" />
      </button>
      <button type="button" className="paddle" aria-label="Sonraki" disabled={!state.next} onClick={() => go(1)}>
        <Chevron />
      </button>
    </div>
  );
}
