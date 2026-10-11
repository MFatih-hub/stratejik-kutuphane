'use client';

import { useEffect, useRef, useState } from 'react';
import { buildEngine, playDrop, playWater, RainModel, rnd, logRnd, type Engine } from '@/lib/rain-audio';

// Sayfanın sol alt köşesinde, ekranın kenarından taşan durgun bir su yüzeyi.
// Birkaç saniyede bir yukarıdan bir damla düşer; arada "tane tane" yağmur:
// rastgele aralıklarla, rastgele perdelerde, farklı türde damlalar (suya
// plink, yüzeye tık, yaprağa yumuşak vuruş, ince damlacık, ara sıra iri blup).
// Suya düşenler yüzeyde minik halkalar bırakır.
//
// Ses dosyası yok: hepsi Web Audio ile üretilir (sinüs ve filtrelenmiş
// gürültü + hafif yankı, sağ-sol konum ve uzaklık rastgele). Tarayıcılar ilk tıklama/tuş basımından önce ses
// çalmaya izin vermediği için ses, sayfayla ilk etkileşimde başlar.
// Uygulama düzeni (layout) sayfalar arasında korunduğu için gezinirken kesilmez.

const SOUND_KEY = 'zh-sound';
export const SOUND_EVENT = 'zh-sound-change';

function createEngine(): Engine | null {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  return buildEngine(new AC());
}

export default function WaterDrop() {
  const [phase, setPhase] = useState(0); // her damlada artar → animasyonları yeniden başlatır
  const engine = useRef<Engine | null>(null);
  const soundOn = useRef(true);
  const armed = useRef(false);

  // Ses tercihi + ilk etkileşimde ses motorunu başlat
  useEffect(() => {
    try { soundOn.current = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* yok */ }

    const start = () => {
      if (!soundOn.current) return;
      if (!engine.current) engine.current = createEngine();
      (engine.current?.ctx as AudioContext | undefined)?.resume().catch(() => {});
      armed.current = true;
    };
    const onGesture = () => start();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);

    const onChange = (ev: Event) => {
      const on = (ev as CustomEvent<boolean>).detail;
      soundOn.current = on;
      if (on) start();
      else (engine.current?.ctx as AudioContext | undefined)?.suspend().catch(() => {});
    };
    window.addEventListener(SOUND_EVENT, onChange);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener(SOUND_EVENT, onChange);
    };
  }, []);

  const ripplesRef = useRef<HTMLDivElement>(null);

  /** Su yüzeyinin görünen kısmında rastgele bir noktada minik halka. */
  const ripple = (delayMs: number) => {
    const host = ripplesRef.current;
    if (!host || host.childElementCount > 7) return;
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) {
      x = rnd(100, 262); y = rnd(18, 72);
      if (((x - 150) / 112) ** 2 + ((y - 76) / 58) ** 2 < 1) break;
    }
    const el = document.createElement('span');
    el.className = 'pond-mini';
    const w = rnd(26, 70);
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w * 0.28}px;animation-delay:${delayMs}ms`;
    el.addEventListener('animationend', () => el.remove());
    host.appendChild(el);
  };

  const audioReady = () => soundOn.current && armed.current && !!engine.current && engine.current.ctx.state === 'running';

  // Büyük damla: yukarıdan düşer (~1.1 sn), suya değince halkalar + plink; 4–5,5 sn'de bir
  useEffect(() => {
    let alive = true;
    let fallTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;
    const FALL = 1100;
    const cycle = () => {
      if (!alive) return;
      if (document.hidden) { nextTimer = setTimeout(cycle, 2000); return; }
      setPhase((p) => p + 1);
      fallTimer = setTimeout(() => {
        if (audioReady()) playWater(engine.current!, engine.current!.ctx.currentTime + 0.005, logRnd(340, 1300), rnd(0.45, 1), rnd(0, 0.5));
      }, FALL);
      // 3–10 sn, düzensiz: metronom hissi vermesin
      nextTimer = setTimeout(cycle, 3000 + Math.random() * Math.random() * 7000);
    };
    nextTimer = setTimeout(cycle, 1200);
    return () => { alive = false; clearTimeout(fallTimer); clearTimeout(nextTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tane tane yağmur: rastgele aralıklarla (ortalama saniyede ~3, yavaşça
  // sıklaşıp seyrelen) farklı türde damlalar; suya düşenler halka bırakır.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const model = new RainModel();
    let lastGap = 0.3;
    let sinceBed = 0;
    const tick = () => {
      if (!alive) return;
      if (document.hidden) { timer = setTimeout(tick, 1500); return; }
      const { gap, kind } = model.next(lastGap);
      if (audioReady()) {
        const e = engine.current!;
        playDrop(e, kind);
        sinceBed += lastGap;
        if (sinceBed > 2) { model.driftBed(e, e.ctx.currentTime); sinceBed = 0; }
      }
      if (kind === 'su' || kind === 'blup' || (kind === 'sicrama' && Math.random() < 0.5)) ripple(0);
      lastGap = gap;
      timer = setTimeout(tick, gap * 1000);
    };
    timer = setTimeout(tick, 800);
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
