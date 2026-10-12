'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * "Dinle": yazıyı tarayıcının Türkçe sesiyle okur. Ses dosyası yok, sunucu
 * yok — cihazdaki konuşma sentezi kullanılır (kalitesi cihaza göre değişir).
 * Cihazda Türkçe ses yoksa düğme hiç görünmez. Okunan paragraf hafifçe
 * belirginleşir.
 */
type Item = { el: HTMLElement; text: string };

const RATES = [0.9, 1, 1.15];

function chunk(text: string, max = 220): string[] {
  const out: string[] = [];
  const sentences = text.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [text];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { out.push(cur.trim()); cur = ''; }
    if (s.length > max) {
      const words = s.split(/\s+/);
      for (const w of words) {
        if ((cur + ' ' + w).length > max && cur) { out.push(cur.trim()); cur = ''; }
        cur += (cur ? ' ' : '') + w;
      }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('tr'));
  if (!vs.length) return null;
  const score = (v: SpeechSynthesisVoice) => (/natural|online|neural/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return vs.sort((a, b) => score(b) - score(a))[0];
}

export default function ListenButton({ targetId = 'post-article-body' }: { targetId?: string }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [rateIdx, setRateIdx] = useState(1);
  const rateRef = useRef(1);
  const queue = useRef<{ item: Item; text: string }[]>([]);
  const pos = useRef(0);
  const alive = useRef(true);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    alive.current = true; // (geliştirme modunda efektler iki kez çalışır)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => setVoice(pickVoice());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => {
      alive.current = false;
      window.speechSynthesis.removeEventListener?.('voiceschanged', load);
      window.speechSynthesis.cancel();
      current.current?.classList.remove('is-reading');
    };
  }, []);

  function build() {
    const root = document.getElementById(targetId);
    if (!root) return [];
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, .post-notes-title'));
    const items: { item: Item; text: string }[] = [];
    for (const el of blocks) {
      if (el.closest('li') && el.tagName === 'P') continue; // li zaten okunuyor
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('sup, .fn-back').forEach((n) => n.remove());
      const text = (clone.textContent || '')
        .replace(/(^|\s)#([A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû][\wÇĞİÖŞÜçğıöşüÂâÎîÛû-]*)/g, (_m, pre, w) => `${pre}${w.replace(/[-_]+/g, ' ')}`) // #kavram → kavram
        .replace(/\s+/g, ' ').trim();
      if (!text) continue;
      for (const c of chunk(text)) items.push({ item: { el, text }, text: c });
    }
    return items;
  }

  function mark(el: HTMLElement | null) {
    if (current.current && current.current !== el) current.current.classList.remove('is-reading');
    current.current = el;
    el?.classList.add('is-reading');
  }

  function speakNext() {
    if (!alive.current) return;
    const q = queue.current;
    if (pos.current >= q.length) { stop(); return; }
    const { item, text } = q[pos.current];
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'tr-TR';
    u.rate = RATES[rateRef.current];
    u.onend = () => { pos.current += 1; speakNext(); };
    u.onerror = (e: any) => { if (e?.error !== 'interrupted' && e?.error !== 'canceled') { pos.current += 1; speakNext(); } };
    mark(item.el);
    window.speechSynthesis.speak(u);
  }

  function play() {
    const synth = window.speechSynthesis;
    if (state === 'paused') { synth.resume(); setState('playing'); return; }
    synth.cancel();
    queue.current = build();
    pos.current = 0;
    setState('playing');
    speakNext();
  }

  function pause() { window.speechSynthesis.pause(); setState('paused'); }

  function stop() {
    window.speechSynthesis.cancel();
    mark(null);
    pos.current = 0;
    setState('idle');
  }

  function cycleRate() {
    const next = (rateRef.current + 1) % RATES.length;
    rateRef.current = next;
    setRateIdx(next);
    if (state === 'playing') {
      // yeni hızla, bulunulan parçadan devam et
      window.speechSynthesis.cancel();
      setTimeout(() => speakNext(), 60);
    }
  }

  if (!voice) return null;
  return (
    <div className="listen" role="group" aria-label="Sesli dinle">
      {state !== 'playing' ? (
        <button type="button" className="listen-btn" onClick={play}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
          {state === 'paused' ? 'Devam et' : 'Dinle'}
        </button>
      ) : (
        <button type="button" className="listen-btn" onClick={pause}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5h3v13H8zM13 5.5h3v13h-3z" /></svg>
          Duraklat
        </button>
      )}
      {state !== 'idle' && <button type="button" className="listen-btn listen-btn-ghost" onClick={stop}>Durdur</button>}
      <button type="button" className="listen-btn listen-btn-ghost" onClick={cycleRate} title="Okuma hızı">{RATES[rateIdx].toString().replace('.', ',')}×</button>
    </div>
  );
}
