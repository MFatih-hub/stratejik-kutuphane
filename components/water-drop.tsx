'use client';

import { useEffect, useRef, useState } from 'react';

// Sayfanın sol alt köşesinde, ekranın kenarından taşan durgun bir su yüzeyi.
// Birkaç saniyede bir yukarıdan bir damla düşer; suya değdiği an halkalar
// açılır ve (ses açıksa) yumuşak bir damla sesi çıkar.
//
// Ses dosyası yok: damla sesi Web Audio ile üretilir (kısa, yukarı kayan bir
// sinüs "plip" + hafif yankı). Tarayıcılar ilk tıklama/tuş basımından önce ses
// çalmaya izin vermediği için ses, sayfayla ilk etkileşimde başlar.
// Uygulama düzeni (layout) sayfalar arasında korunduğu için gezinirken kesilmez.

const SOUND_KEY = 'zh-sound';
export const SOUND_EVENT = 'zh-sound-change';

function makeImpulse(ctx: AudioContext, seconds = 2.2, decay = 3.2) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

type Engine = { ctx: AudioContext; out: GainNode; wet: ConvolverNode };

function createEngine(): Engine | null {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  const ctx: AudioContext = new AC();
  const out = ctx.createGain();
  out.gain.value = 0.09; // çok kısık
  const wet = ctx.createConvolver();
  wet.buffer = makeImpulse(ctx);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.42;
  wet.connect(wetGain).connect(out);
  out.connect(ctx.destination);
  return { ctx, out, wet };
}

function playDrop(e: Engine) {
  const { ctx, out, wet } = e;
  const t = ctx.currentTime + 0.01;
  const base = 520 + Math.random() * 260; // her damla biraz farklı

  // Ana "plip": kısa, yukarı kayan sinüs
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 2.6, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g);
  g.connect(out);
  g.connect(wet);
  o.start(t);
  o.stop(t + 0.25);

  // Suyun içinden gelen alçak, yumuşak bir "dum"
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(base * 0.42, t + 0.01);
  o2.frequency.exponentialRampToValueAtTime(base * 0.3, t + 0.18);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.25, t + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o2.connect(g2);
  g2.connect(wet);
  o2.start(t);
  o2.stop(t + 0.32);
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
      engine.current?.ctx.resume().catch(() => {});
      armed.current = true;
    };
    const onGesture = () => start();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);

    const onChange = (ev: Event) => {
      const on = (ev as CustomEvent<boolean>).detail;
      soundOn.current = on;
      if (on) start();
      else engine.current?.ctx.suspend().catch(() => {});
    };
    window.addEventListener(SOUND_EVENT, onChange);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener(SOUND_EVENT, onChange);
    };
  }, []);

  // Damla döngüsü: düşüş ~1.1 sn, sonra halkalar + ses; 4–5,5 sn'de bir
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
        if (soundOn.current && armed.current && engine.current && engine.current.ctx.state === 'running') {
          playDrop(engine.current);
        }
      }, FALL);
      nextTimer = setTimeout(cycle, 4000 + Math.random() * 1500);
    };
    nextTimer = setTimeout(cycle, 1200);
    return () => { alive = false; clearTimeout(fallTimer); clearTimeout(nextTimer); };
  }, []);

  return (
    <div className="pond" aria-hidden="true">
      <div className="pond-water" />
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
