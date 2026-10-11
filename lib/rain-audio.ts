// lib/rain-audio.ts — "tane tane" su damlası sesi, tamamen anlık üretim.
//
// Hiçbir kayıt döngüye alınmaz: her damla o anda, kendi rastgele
// parametreleriyle sentezlenir. Zihnin bir kalıp yakalamaması için:
//   • damlalar arası süre üstel dağılımlı (Poisson süreci, doğal düzensizlik),
//   • ortalama sıklık sinüsle değil, rastgele bir sürüklenmeyle (Ornstein–
//     Uhlenbeck) yavaşça sıklaşıp seyrelir — periyodu yoktur,
//   • damla türlerinin oranı (su / yaprak / sert yüzey / damlacık) dakikalar
//     içinde rastgele kayar; ses manzarası aynı yerde durmaz,
//   • her damlanın perdesi, süresi, uzaklığı (seviye + yankı) ve sağ-sol
//     konumu bağımsızdır,
//   • arka plandaki çok kısık hışırtı uzun (~13 sn) bir gürültüden gelir,
//     filtresi, seviyesi ve hızı sürekli rastgele kayar.
//
// Su damlası fiziği: suya çarpan damla önce çok kısa bir "tık" (çarpma)
// yapar; çoğu zaman yüzeyin altına minik bir hava kabarcığı sürükler ve
// kabarcık çınlar (Minnaert rezonansı). Kabarcık küçüldükçe ses hızla
// tizleşir — su damlasını su damlası yapan o yukarı kayan "plink" budur.
// Her damla kabarcık yapmaz; bazıları yalnızca sıçrar.

export type Engine = {
  ctx: BaseAudioContext;
  out: GainNode;
  wet: ConvolverNode;
  noise: AudioBuffer;
  bedFilter: BiquadFilterNode;
  bedGain: GainNode;
  bedSrc: AudioBufferSourceNode;
};

export type DropKind = 'su' | 'sicrama' | 'tik' | 'yaprak' | 'damlacik' | 'blup';
const KINDS: DropKind[] = ['su', 'sicrama', 'tik', 'yaprak', 'damlacik', 'blup'];

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const logRnd = (a: number, b: number) => Math.exp(rnd(Math.log(a), Math.log(b)));
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function makeImpulse(ctx: BaseAudioContext, seconds = 1.7, decay = 3.3) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // erken yansımalar biraz seyrek, kuyruk yumuşak
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < rate * 0.02 ? 0.4 : 1);
  }
  return buf;
}

/** Uzun, "pembe"ye yakın gürültü (yüksek frekansları biraz yumuşatılmış). */
function makeNoise(ctx: BaseAudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return buf;
}

export function buildEngine(ctx: BaseAudioContext): Engine {
  const out = ctx.createGain();
  out.gain.value = 0.11; // kısık
  out.connect(ctx.destination);
  const wet = ctx.createConvolver();
  wet.buffer = makeImpulse(ctx);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;
  wet.connect(wetGain).connect(out);

  const noise = makeNoise(ctx, 13.37);

  const bedSrc = ctx.createBufferSource();
  bedSrc.buffer = noise;
  bedSrc.loop = true;
  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = 'bandpass';
  bedFilter.frequency.value = 1100;
  bedFilter.Q.value = 0.35;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.02;
  bedSrc.connect(bedFilter).connect(lp).connect(bedGain).connect(out);
  bedSrc.start(0, Math.random() * 13);

  return { ctx, out, wet, noise, bedFilter, bedGain, bedSrc };
}

/** Bir damlanın çıkış zinciri: uzaklık (seviye + yankı payı) ve sağ-sol konum. */
function voice(e: Engine, t: number, level: number, dist = Math.random()) {
  const { ctx, out, wet } = e;
  const g = ctx.createGain();
  const pan = (ctx as any).createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) pan.pan.setValueAtTime(rnd(-0.9, 0.9), t);
  const dry = ctx.createGain();
  dry.gain.value = level * (1 - dist * 0.8);
  const send = ctx.createGain();
  send.gain.value = level * (0.2 + dist * 0.65);
  // uzaktaki damlanın tizleri biraz yumuşar
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 16000 - dist * 11000;
  g.connect(tone);
  if (pan) { tone.connect(pan); pan.connect(dry); pan.connect(send); } else { tone.connect(dry); tone.connect(send); }
  dry.connect(out);
  send.connect(wet);
  return g;
}

function noiseBurst(e: Engine, t: number, type: BiquadFilterType, freq: number, q: number, dur: number, peak: number, dest: AudioNode) {
  const { ctx, noise } = e;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.0012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(env).connect(dest);
  src.start(t, Math.random() * 12);
  src.stop(t + dur + 0.02);
}

/** Kabarcık çınlaması: yukarı kayan, üstel sönen sinüs (Minnaert). */
function bubble(e: Engine, t: number, f: number, level: number, dest: AudioNode) {
  const { ctx } = e;
  const o = ctx.createOscillator();
  o.type = 'sine';
  // küçük kabarcık: tiz, kısa; büyük kabarcık: pes, biraz daha uzun
  const dec = Math.min(0.22, Math.max(0.03, rnd(0.6, 1.4) * 55 / Math.sqrt(f)));
  const rise = rnd(1.25, 2.4);
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * rise, t + dec * rnd(0.5, 0.9));
  o.detune.value = rnd(-30, 30);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + rnd(0.0015, 0.004));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(env).connect(dest);
  o.start(t);
  o.stop(t + dec + 0.02);
}

/** Suya düşen damla: çarpma "tık"ı + (çoğu zaman) kabarcık çınlaması. */
export function playWater(e: Engine, t: number, f = logRnd(380, 2600), level = rnd(0.35, 1), dist = Math.random()) {
  const dest = voice(e, t, level, dist);
  noiseBurst(e, t, 'highpass', rnd(2500, 6000), 0.7, rnd(0.002, 0.006), rnd(0.05, 0.25), dest);
  bubble(e, t + rnd(0.002, 0.012), f, rnd(0.5, 0.85), dest);
  // ara sıra ikinci, daha küçük bir kabarcık
  if (Math.random() < 0.22) bubble(e, t + rnd(0.02, 0.07), f * rnd(1.3, 2.2), rnd(0.15, 0.35), dest);
}

function playKind(e: Engine, kind: DropKind, t: number) {
  switch (kind) {
    case 'su': playWater(e, t); break;
    case 'sicrama': { // kabarcıksız, kısa ıslak sıçrama
      const dest = voice(e, t, rnd(0.25, 0.7));
      noiseBurst(e, t, 'bandpass', logRnd(1800, 5500), rnd(0.8, 2.2), rnd(0.012, 0.03), 0.8, dest);
      break;
    }
    case 'tik': { // sert yüzeye (taş, tahta) kısa vuruş
      const dest = voice(e, t, rnd(0.3, 0.85));
      noiseBurst(e, t, 'bandpass', logRnd(1400, 6500), rnd(2.5, 8), rnd(0.005, 0.016), 1, dest);
      break;
    }
    case 'yaprak': { // yaprağa yumuşak, boğuk düşüş
      const dest = voice(e, t, rnd(0.25, 0.6));
      noiseBurst(e, t, 'bandpass', logRnd(300, 1400), rnd(0.7, 1.8), rnd(0.02, 0.055), 0.9, dest);
      break;
    }
    case 'damlacik': { // çok küçük, tiz damlacık
      const dest = voice(e, t, rnd(0.15, 0.4));
      bubble(e, t, logRnd(2600, 6000), rnd(0.3, 0.6), dest);
      break;
    }
    case 'blup': { // iri damla, derin kabarcık
      const dest = voice(e, t, rnd(0.4, 0.85), rnd(0, 0.6));
      noiseBurst(e, t, 'lowpass', rnd(900, 1800), 0.7, rnd(0.01, 0.025), 0.35, dest);
      bubble(e, t + 0.006, rnd(160, 420), 0.8, dest);
      if (Math.random() < 0.6) bubble(e, t + rnd(0.03, 0.09), logRnd(700, 1500), 0.3, dest);
      break;
    }
  }
  // ara sıra hemen arkasından küçük sıçrama damlası
  if (Math.random() < 0.16) playWater(e, t + rnd(0.04, 0.14), logRnd(1300, 3600), rnd(0.12, 0.3));
}

/**
 * Yağmurun "durumu": sıklık ve damla türlerinin oranı yavaşça, rastgele kayar.
 * Canlı çalışta da önizleme kaydında da aynısı kullanılır.
 */
export class RainModel {
  private x = Math.log(3);            // log(sıklık), OU süreciyle sürüklenir
  private w: Record<DropKind, number> = { su: 0.34, sicrama: 0.14, tik: 0.18, yaprak: 0.18, damlacik: 0.11, blup: 0.05 };
  private bedF = 1100;
  private bedG = 0.02;

  /** dt saniye ilerlet; bir sonraki damlaya kadar süre ve damla türünü ver. */
  next(dt: number): { gap: number; kind: DropKind } {
    const mu = Math.log(2.6), theta = 0.035, sigma = 0.16;
    this.x += theta * (mu - this.x) * dt + sigma * Math.sqrt(Math.max(dt, 0.001)) * gauss();
    this.x = Math.max(Math.log(0.7), Math.min(Math.log(7), this.x));
    // tür oranları: küçük rastgele adımlar, sınırlı
    for (const k of KINDS) {
      const lo = k === 'blup' ? 0.01 : 0.03, hi = k === 'blup' ? 0.1 : 0.55;
      this.w[k] = Math.max(lo, Math.min(hi, this.w[k] * Math.exp(0.05 * gauss() * Math.sqrt(Math.max(dt, 0.001)))));
    }
    const total = KINDS.reduce((s, k) => s + this.w[k], 0);
    let r = Math.random() * total, kind: DropKind = 'su';
    for (const k of KINDS) { r -= this.w[k]; if (r <= 0) { kind = k; break; } }
    const rate = Math.exp(this.x);
    const gap = Math.max(0.035, -Math.log(1 - Math.random()) / rate);
    return { gap, kind };
  }

  /** Arka plan hışırtısını yavaşça kaydır. */
  driftBed(e: Engine, t: number) {
    this.bedF = Math.max(600, Math.min(2200, this.bedF * Math.exp(0.04 * gauss())));
    this.bedG = Math.max(0.008, Math.min(0.03, this.bedG * Math.exp(0.05 * gauss())));
    e.bedFilter.frequency.setTargetAtTime(this.bedF, t, 3);
    e.bedGain.gain.setTargetAtTime(this.bedG, t, 4);
    e.bedSrc.playbackRate.setTargetAtTime(rnd(0.94, 1.06), t, 6);
  }
}

/** Bir damla çal (t: bağlam zamanı). */
export function playDrop(e: Engine, kind: DropKind, t = e.ctx.currentTime + 0.01) {
  playKind(e, kind, t);
}
