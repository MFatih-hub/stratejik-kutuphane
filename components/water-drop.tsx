'use client';

import { useEffect, useRef, useState } from 'react';

// Sayfanın sol alt köşesinde, ekranın kenarından taşan durgun bir su yüzeyi.
// Birkaç saniyede bir (düzensiz) yukarıdan büyük bir damla düşer; yüzeyde ara
// sıra minik halkalar belirir. Yalnızca görsel; ses yoktur.

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function WaterDrop() {
  const [phase, setPhase] = useState(0); // her büyük damlada artar → animasyonu yeniden başlatır
  const ripplesRef = useRef<HTMLDivElement>(null);

  /** Su yüzeyinin görünen kısmında rastgele bir noktada minik halka. */
  const ripple = () => {
    const host = ripplesRef.current;
    if (!host || host.childElementCount > 7 || document.hidden) return;
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) {
      x = rnd(100, 262); y = rnd(18, 72);
      if (((x - 150) / 112) ** 2 + ((y - 76) / 58) ** 2 < 1) break;
    }
    const el = document.createElement('span');
    el.className = 'pond-mini';
    const w = rnd(26, 70);
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w * 0.28}px`;
    el.addEventListener('animationend', () => el.remove());
    host.appendChild(el);
  };

  // Büyük damla: 3–10 sn'de bir, düzensiz
  useEffect(() => {
    let alive = true;
    let nextTimer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      if (!alive) return;
      if (document.hidden) { nextTimer = setTimeout(cycle, 2000); return; }
      setPhase((p) => p + 1);
      nextTimer = setTimeout(cycle, 3000 + Math.random() * Math.random() * 7000);
    };
    nextTimer = setTimeout(cycle, 1200);
    return () => { alive = false; clearTimeout(nextTimer); };
  }, []);

  // Yüzeyde ara sıra minik halkalar
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      ripple();
      timer = setTimeout(tick, Math.max(150, -Math.log(1 - Math.random()) * 1100));
    };
    timer = setTimeout(tick, 900);
    return () => { alive = false; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pond" aria-hidden="true">
      <div className="pond-water" />
      <div className="pond-minis" ref={ripplesRef} />
      {phase > 0 && (
        <div className="pond-anim" key={phase}>
          <span className="pond-drop" />
          <span className="pond-ring pond-ring-1" />
          <span className="pond-ring pond-ring-2" />
          <span className="pond-ring pond-ring-3" />
          <span className="pond-glint" />
        </div>
      )}
    </div>
  );
}
