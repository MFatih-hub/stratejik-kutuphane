'use client';

import { useEffect, useState } from 'react';

/** Sayfa üstünde sabit, hedef elementteki (yazı gövdesi) okuma ilerlemesini gösteren ince çubuk. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const el = document.getElementById(targetId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elTop = rect.top + window.scrollY;
      const elHeight = rect.height;
      const viewportH = window.innerHeight;
      const startOffset = viewportH * 0.3;
      const scrolled = window.scrollY - elTop + startOffset;
      const total = Math.max(1, elHeight - startOffset);
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      setProgress(pct);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [targetId]);

  return (
    <div className="reading-progress-track" aria-hidden="true">
      <div className="reading-progress-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}
