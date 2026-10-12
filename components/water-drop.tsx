'use client';

import { useEffect, useRef, useState } from 'react';
import { buildEngine, bigDrop, rnd, type Engine } from '@/lib/rain-audio';

// Sayfanın sol alt köşesinde, ekranın kenarından taşan durgun bir su yüzeyi.
// Birkaç saniyede bir (düzensiz) yukarıdan büyük bir damla düşer; arada
// "tane tane" yağmur: rastgele aralıklarla, farklı türde, farklı uzaklıkta
// damlalar. Suya düşenler yüzeyde minik halkalar bırakır.
//
// Ses dosyası yok: ses public/rain-worklet.js içinde örnek örnek, fiziksel
// ölçülere göre üretilir; hiçbir şey döngüye girmez. Tarayıcılar ilk
// tıklama/tuş basımından önce ses çalmaya izin vermediği için ses, sayfayla
// ilk etkileşimde (yavaşça açılarak) başlar. Sekme arkadayken susar.
// Uygulama düzeni (layout) sayfalar arasında korunduğu için gezinirken kesilmez.

const SOUND_KEY = 'zh-sound';
export const SOUND_EVENT = 'zh-sound-change';

export default function WaterDrop() {
  const [phase, setPhase] = useState(0); // her büyük damlada artar → animasyonu yeniden başlatır
  const ctxRef = useRef<AudioContext | null>(null);
  const engine = useRef<Engine | null>(null);
  const building = useRef(false);
  const soundOn = useRef(true);
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

  const audioRunning = () => soundOn.current && !!engine.current && ctxRef.current?.state === 'running';

  // Ses tercihi + ilk etkileşimde ses motorunu başlat
  useEffect(() => {
    try { soundOn.current = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* yok */ }

    const start = () => {
      if (!soundOn.current || document.hidden) return;
      if (!ctxRef.current) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current!;
      ctx.resume().catch(() => {}); // kullanıcı hareketi içinde çağrılmalı (iOS)
      if (!engine.current && !building.current) {
        building.current = true;
        buildEngine(ctx, { report: true })
          .then((e) => {
            engine.current = e;
            if (e) e.node.port.onmessage = (ev) => { if (ev.data?.type === 'drip') ripple(); };
          })
          .catch(() => { /* ses olmadan devam */ })
          .finally(() => { building.current = false; });
      }
    };
    const onGesture = () => start();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);

    const onChange = (ev: Event) => {
      const on = (ev as CustomEvent<boolean>).detail;
      soundOn.current = on;
      if (on) start();
      else ctxRef.current?.suspend().catch(() => {});
    };
    window.addEventListener(SOUND_EVENT, onChange);

    // sekme arkadayken sus, dönünce devam et
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (soundOn.current) ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener(SOUND_EVENT, onChange);
      document.removeEventListener('visibilitychange', onVis);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Büyük damla: yukarıdan düşer (~1.1 sn), suya değince halkalar + ses; 3–10 sn'de bir, düzensiz
  useEffect(() => {
    let alive = true;
    let fallTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;
    const FALL = 1100;
    const cycle = () => {
      if (!alive) return;
      if (document.hidden) { nextTimer = setTimeout(cycle, 2000); return; }
      setPhase((p) => p + 1);
      fallTimer = setTimeout(() => { if (audioRunning()) bigDrop(engine.current!); }, FALL);
      nextTimer = setTimeout(cycle, 3000 + Math.random() * Math.random() * 7000);
    };
    nextTimer = setTimeout(cycle, 1200);
    return () => { alive = false; clearTimeout(fallTimer); clearTimeout(nextTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ses kapalıyken de yüzeyde ara sıra minik halkalar (ses açıkken halkaları ses motoru tetikler)
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      if (!audioRunning()) ripple();
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

/** Başlıktaki ses düğmesi (damla ikonu). */
export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try { setOn(localStorage.getItem(SOUND_KEY) !== 'off'); } catch { /* yok */ }
  }, []);
  function toggle() {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* yok */ }
    window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: next }));
  }
  const label = on ? 'Damla sesini kapat' : 'Damla sesini aç';
  return (
    <button type="button" className={`icon-btn sound-btn${on ? '' : ' is-off'}`} onClick={toggle} aria-label={label} title={label} aria-pressed={on}>
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
        <path d="M12 3.5c-3 4-5.5 7.2-5.5 10.3a5.5 5.5 0 0 0 11 0C17.5 10.7 15 7.5 12 3.5z" />
        {!on && <path d="M4 20L20 4" />}
      </svg>
    </button>
  );
}
