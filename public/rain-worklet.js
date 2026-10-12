/* Zihin Haritası — su damlası sesi (AudioWorklet işlemcisi).
 *
 * Ses dosyası yok, döngü yok: her örnek (saniyede 44–48 bin kez) burada
 * hesaplanır. Damlaların zamanı, türü, perdesi, uzaklığı ve konumu rastgele;
 * yağmurun sıklığı ve tür karışımı da yavaşça, periyotsuz sürüklenir.
 *
 * Fizik (van den Doel 2005, "Physically based models for liquid sounds";
 * Phillips vd. 2018, damlayan musluk sesi):
 *   • Suya düşen damla önce çok kısa, geniş bantlı bir "çarpma" yapar.
 *   • Çoğu zaman yüzeyin altına bir hava kabarcığı hapseder; kabarcık kendi
 *     Minnaert frekansında çınlar ve ÇOK çabuk söner. Sönüm hızı perdeye
 *     bağlıdır: d = 0.043·f + 0.0014·f^1.5 (1/sn) — 1 kHz'lik kabarcık ~12 ms,
 *     3 kHz'lik ~3 ms içinde kaybolur. Uzun çınlayan saf ton "bip/çan" gibi,
 *     yani elektronik duyulur; doğal olan bu kısa "plip"tir.
 *   • Kabarcık yükselirken perdesi hafifçe artar: f(t) = f0·(1 + σ·d·t).
 *   • Yaprağa, taşa düşen damlalar ise yalnızca kısa, rezonanssız (düşük Q)
 *     gürültü taneleridir — dar filtre "ting" diye metal gibi öterdi.
 *   • Uzaktaki damlalar daha kısık, daha boğuk ve daha yankılıdır.
 *
 * Çıkış 0: kuru (yakın) ses, çıkış 1: yankıya gönderilen pay (ana iş
 * parçacığında, tizleri zamanla sönen bir oda yankısına bağlanır).
 */
/* global sampleRate, AudioWorkletProcessor, registerProcessor */

const SR = sampleRate;
const TAU = Math.PI * 2;
const R = (a, b) => a + Math.random() * (b - a);
const LR = (a, b) => Math.exp(R(Math.log(a), Math.log(b)));
const gauss = () => {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
};
const smp = (msec) => Math.max(1, Math.round((msec * SR) / 1000));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

const MAX_VOICES = 72;
const KINDS = ['su', 'damlacik', 'sicrama', 'yaprak', 'tas', 'blup'];

/** Ses kaynağını sağ-sol konuma ve uzaklığa yerleştirir. */
function place(v, pan, dist) {
  const th = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  const dry = 1 - 0.68 * dist;
  const wet = 0.14 + 0.6 * dist;
  v.dl = Math.cos(th) * dry;
  v.dr = Math.sin(th) * dry;
  v.wl = Math.cos(th) * wet;
  v.wr = Math.sin(th) * wet;
  // uzaklık tizleri yumuşatır: 16 kHz (yakın) → 2.4 kHz (uzak)
  const fc = Math.min(16000 * Math.pow(2400 / 16000, dist), SR * 0.45);
  v.lpa = 1 - Math.exp((-TAU * fc) / SR);
  v.lp = 0;
  return v;
}

/** Hava kabarcığı: üstel sönen, hafifçe tizleşen sinüs. */
function bubble(f0, amp, delay, pan, dist, sigma, dmul) {
  f0 = Math.min(f0, SR * 0.38);
  if (sigma === undefined) sigma = R(0.04, 0.28);
  if (dmul === undefined) dmul = R(0.75, 1.3);
  const d = (0.043 * f0 + 0.0014 * Math.pow(f0, 1.5)) * dmul;
  const w0 = (TAU * f0) / SR;
  return place(
    {
      k: 0, wait: delay, n: 0, ph: 0,
      w0, ws: (w0 * sigma * d) / SR, wmax: TAU * 0.42,
      env: amp, amp, ed: Math.exp(-d / SR),
      att: smp(R(0.12, 0.5)), floor: amp * 2e-4,
    },
    pan, dist
  );
}

/**
 * Gürültü tanesi: beyaz gürültü → düşük Q'lu durum-değişkenli filtre
 * (0: alçak geçiren, 1: bant geçiren, 2: yüksek geçiren) → kısa zarf.
 */
function grain(mode, fc, q, attMs, tauMs, amp, delay, pan, dist) {
  fc = Math.min(fc, SR * 0.42);
  // düşük frekanslı taneler doğal olarak daha az enerji taşır; kısmen dengele
  amp *= Math.pow(6000 / fc, 0.4);
  const g = Math.tan((Math.PI * fc) / SR);
  const kk = 1 / q;
  const a1 = 1 / (1 + g * (g + kk));
  const a2 = g * a1;
  return place(
    {
      k: 1, wait: delay, n: 0, mode, kk, a1, a2, a3: g * a2, s1: 0, s2: 0,
      env: 0, amp, att: smp(attMs), ed: Math.exp(-1000 / (tauMs * SR)), floor: amp * 2e-4,
    },
    pan, dist
  );
}

class ZhRain extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.report = !!o.report;
    this.autoBig = !!o.autoBig;
    this.voices = [];

    // sürüklenen durum (log ölçekte, Ornstein–Uhlenbeck)
    this.xNear = Math.log(R(1.8, 3)); // yakın damlalar / sn
    this.xTex = Math.log(R(25, 55)); // uzaktaki çok küçük damlalar / sn
    this.xLoud = 0; // genel şiddet (±)
    this.w = { su: 0.34, damlacik: 0.17, sicrama: 0.11, yaprak: 0.15, tas: 0.15, blup: 0.05 };

    this.nNear = smp(R(200, 700));
    this.nTex = smp(R(5, 40));
    this.nBig = smp(R(1500, 4000));

    // arka plan: çok kısık, boğuk "oda/yağmur havası"
    this.pk = [new Float64Array(3), new Float64Array(3)];
    this.bs = [[0, 0], [0, 0]];
    this.bedX = Math.log(800);
    this.bedGX = Math.log(0.05);
    this.bedG = 0;

    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'big') this.big(0);
    };
  }

  add(v) {
    if (this.voices.length < MAX_VOICES) this.voices.push(v);
  }

  /** Yavaş sürüklenmeler (her blokta bir). */
  drift(dt) {
    const sq = Math.sqrt(dt);
    this.xNear += 0.03 * (Math.log(2.4) - this.xNear) * dt + 0.2 * sq * gauss();
    this.xNear = clamp(this.xNear, Math.log(0.6), Math.log(6.5));
    this.xTex += 0.02 * (Math.log(40) - this.xTex) * dt + 0.22 * sq * gauss();
    this.xTex = clamp(this.xTex, Math.log(6), Math.log(150));
    this.xLoud += 0.04 * (0 - this.xLoud) * dt + 0.08 * sq * gauss();
    this.xLoud = clamp(this.xLoud, -0.5, 0.35);
    for (const k of KINDS) {
      const lo = k === 'blup' ? 0.01 : 0.03;
      const hi = k === 'blup' ? 0.1 : 0.55;
      this.w[k] = clamp(this.w[k] * Math.exp(0.06 * sq * gauss()), lo, hi);
    }
    this.bedX += 0.03 * (Math.log(800) - this.bedX) * dt + 0.1 * sq * gauss();
    this.bedX = clamp(this.bedX, Math.log(350), Math.log(1800));
    this.bedGX += 0.03 * (Math.log(0.05) - this.bedGX) * dt + 0.1 * sq * gauss();
    this.bedGX = clamp(this.bedGX, Math.log(0.02), Math.log(0.09));
  }

  pickKind() {
    let total = 0;
    for (const k of KINDS) total += this.w[k];
    let r = Math.random() * total;
    for (const k of KINDS) {
      r -= this.w[k];
      if (r <= 0) return k;
    }
    return 'su';
  }

  /** Damlanın etrafa sıçrattığı minik damlacıklar (taç). */
  crown(at, pan, dist, amp) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = at + smp(R(35, 240));
      const p = pan + R(-0.18, 0.18);
      const dd = clamp(dist + R(0, 0.2), 0, 1);
      if (Math.random() < 0.6) this.add(bubble(LR(2200, 6500), amp * R(0.06, 0.22), t, p, dd));
      else this.add(grain(2, LR(3000, 8000), 0.6, 0.05, R(0.2, 0.7), amp * R(0.05, 0.16), t, p, dd));
    }
  }

  /** Suya düşen damla: çarpma + kabarcık (+ bazen ikinci kabarcık, taç). */
  water(at, f0, amp, pan, dist, crownP) {
    this.add(grain(0, LR(2500, 9000), 0.6, 0.04, R(0.25, 0.9), amp * R(0.18, 0.5), at, pan, dist));
    if (Math.random() < 0.85) {
      const bt = at + smp(R(0.4, 6));
      this.add(bubble(f0, amp, bt, pan, dist));
      if (Math.random() < 0.22) this.add(bubble(f0 * LR(1.2, 2.3), amp * R(0.15, 0.45), bt + smp(R(4, 45)), pan, dist));
    }
    if (Math.random() < crownP) this.crown(at, pan, dist, amp);
  }

  near(at) {
    const kind = this.pickKind();
    const pan = R(-0.92, 0.92);
    const dist = Math.pow(Math.random(), 0.8);
    const loud = Math.exp(this.xLoud) * (1 - 0.55 * dist);
    let ripple = false;
    switch (kind) {
      case 'su': {
        const f0 = LR(380, 3000);
        this.water(at, f0, 0.3 * Math.pow(1000 / f0, 0.45) * LR(0.35, 1) * loud, pan, dist, 0.4);
        ripple = true;
        break;
      }
      case 'damlacik': {
        const f0 = LR(1600, 5500);
        this.water(at, f0, 0.16 * LR(0.3, 1) * loud, pan, dist, 0.12);
        ripple = Math.random() < 0.3;
        break;
      }
      case 'sicrama': { // kabarcıksız ıslak sıçrama
        const a = 0.14 * LR(0.35, 1) * loud;
        this.add(grain(1, LR(1500, 6000), R(0.5, 0.85), R(0.1, 0.6), R(1.5, 6), a, at, pan, dist));
        if (Math.random() < 0.5) this.crown(at, pan, dist, a * 1.5);
        ripple = Math.random() < 0.5;
        break;
      }
      case 'yaprak': { // yaprağa / toprağa yumuşak, boğuk vuruş
        const a = 0.12 * LR(0.35, 1) * loud;
        this.add(grain(0, LR(500, 2400), 0.7, R(0.3, 1.6), R(3, 12), a, at, pan, dist));
        if (Math.random() < 0.35) this.add(grain(0, LR(160, 380), 0.7, R(0.5, 1.5), R(4, 9), a * 0.5, at, pan, dist));
        break;
      }
      case 'tas': { // ıslak taşa kısa vuruş: rezonanssız tık + ıslak kuyruk
        const a = 0.12 * LR(0.35, 1) * loud;
        this.add(grain(2, LR(2200, 7000), 0.65, 0.04, R(0.3, 1.5), a, at, pan, dist));
        this.add(grain(1, LR(900, 3000), 0.6, R(0.3, 1), R(2, 6), a * R(0.2, 0.45), at + smp(R(0.5, 3)), pan, dist));
        break;
      }
      case 'blup': { // iri damla: derin kabarcık
        const f0 = LR(180, 480);
        const a = 0.36 * LR(0.5, 1) * loud;
        this.add(grain(0, LR(1200, 3500), 0.6, 0.15, R(1, 3), a * 0.35, at, pan, dist * 0.6));
        this.add(bubble(f0, a, at + smp(R(1, 8)), pan, dist * 0.6, R(0.1, 0.35)));
        this.crown(at, pan, dist * 0.6, a);
        ripple = true;
        break;
      }
    }
    if (ripple && this.report) this.port.postMessage({ type: 'drip' });
  }

  /** Uzaktaki çok küçük damlalar: yağmurun "tane tane" dokusu. */
  tex(at) {
    const pan = R(-1, 1);
    const dist = R(0.55, 1);
    const u = Math.random();
    const a = 0.05 * u * u * u * Math.exp(this.xLoud);
    const r = Math.random();
    if (r < 0.55) this.add(grain(2, LR(2500, 8000), 0.6, 0.03, R(0.15, 0.8), a, at, pan, dist));
    else if (r < 0.9) this.add(bubble(LR(1800, 7500), a * 1.4, at, pan, dist));
    else this.add(grain(0, LR(700, 2500), 0.7, R(0.2, 0.8), R(1.5, 5), a, at, pan, dist));
  }

  /** Görseldeki büyük damla (havuza düşen). */
  big(at) {
    const f0 = LR(320, 1200);
    const pan = R(-0.45, 0.45);
    const dist = R(0, 0.35);
    this.water(at, f0, 0.42 * Math.pow(800 / f0, 0.3) * R(0.75, 1.1), pan, dist, 0.75);
  }

  process(_inputs, outputs) {
    const o0 = outputs[0];
    const o1 = outputs[1];
    if (!o0 || !o0[0]) return true;
    const dl = o0[0], dr = o0[1] || o0[0];
    const wl = o1 && o1[0] ? o1[0] : null;
    const wr = o1 && o1[1] ? o1[1] : wl;
    const N = dl.length;
    dl.fill(0); dr.fill(0);
    if (wl) { wl.fill(0); if (wr !== wl) wr.fill(0); }

    this.drift(N / SR);

    // olayları bu bloğa yerleştir (blok içi örnek hassasiyetinde)
    while (this.nNear < N) {
      this.near(this.nNear);
      this.nNear += Math.max(smp(30), Math.round((-Math.log(1 - Math.random()) / Math.exp(this.xNear)) * SR));
    }
    this.nNear -= N;
    while (this.nTex < N) {
      this.tex(this.nTex);
      this.nTex += Math.max(1, Math.round((-Math.log(1 - Math.random()) / Math.exp(this.xTex)) * SR));
    }
    this.nTex -= N;
    if (this.autoBig) {
      while (this.nBig < N) {
        this.big(this.nBig);
        this.nBig += smp(3000 + Math.random() * Math.random() * 7000);
      }
      this.nBig -= N;
    }

    // arka plan: iki bağımsız pembe gürültü → alçak geçiren → çok kısık
    {
      const fc = Math.exp(this.bedX);
      const g = Math.tan((Math.PI * fc) / SR);
      const kk = 1 / 0.6;
      const a1 = 1 / (1 + g * (g + kk)), a2 = g * a1, a3 = g * a2;
      const target = Math.exp(this.bedGX);
      for (let ch = 0; ch < 2; ch++) {
        const b = this.pk[ch];
        const s = this.bs[ch];
        const outD = ch === 0 ? dl : dr;
        const outW = ch === 0 ? wl : wr !== wl ? wr : null;
        let bg = this.bedG;
        for (let i = 0; i < N; i++) {
          const w = Math.random() * 2 - 1;
          b[0] = 0.99765 * b[0] + w * 0.099046;
          b[1] = 0.963 * b[1] + w * 0.2965164;
          b[2] = 0.57 * b[2] + w * 1.0526913;
          const x = (b[0] + b[1] + b[2] + w * 0.1848) * 0.11;
          const v3 = x - s[1];
          const v1 = a1 * s[0] + a2 * v3;
          const v2 = s[1] + a2 * s[0] + a3 * v3;
          s[0] = 2 * v1 - s[0];
          s[1] = 2 * v2 - s[1];
          bg += (target - bg) * 0.00002;
          outD[i] += v2 * bg * 0.6;
          if (outW) outW[i] += v2 * bg * 0.4;
        }
        if (ch === 1) this.bedG = bg;
      }
    }

    // sesler
    const vs = this.voices;
    for (let j = vs.length - 1; j >= 0; j--) {
      const v = vs[j];
      let i = 0;
      if (v.wait >= N) { v.wait -= N; continue; }
      if (v.wait > 0) { i = v.wait; v.wait = 0; }
      let dead = false;
      if (v.k === 0) {
        for (; i < N; i++) {
          const n = v.n++;
          let w = v.w0 + v.ws * n;
          if (w > v.wmax) w = v.wmax;
          v.ph += w;
          let s = Math.sin(v.ph) * v.env;
          if (n < v.att) s *= n / v.att;
          v.env *= v.ed;
          v.lp += v.lpa * (s - v.lp);
          const y = v.lp;
          dl[i] += y * v.dl; dr[i] += y * v.dr;
          if (wl) { wl[i] += y * v.wl; if (wr !== wl) wr[i] += y * v.wr; }
          if (v.env < v.floor) { dead = true; break; }
        }
      } else {
        for (; i < N; i++) {
          const n = v.n++;
          const x = Math.random() * 2 - 1;
          const v3 = x - v.s2;
          const v1 = v.a1 * v.s1 + v.a2 * v3;
          const v2 = v.s2 + v.a2 * v.s1 + v.a3 * v3;
          v.s1 = 2 * v1 - v.s1;
          v.s2 = 2 * v2 - v.s2;
          const f = v.mode === 0 ? v2 : v.mode === 1 ? v.kk * v1 : x - v.kk * v1 - v2;
          let e;
          if (n < v.att) e = (v.amp * n) / v.att;
          else { if (n === v.att) v.env = v.amp; e = v.env; v.env *= v.ed; }
          const s = f * e;
          v.lp += v.lpa * (s - v.lp);
          const y = v.lp;
          dl[i] += y * v.dl; dr[i] += y * v.dr;
          if (wl) { wl[i] += y * v.wl; if (wr !== wl) wr[i] += y * v.wr; }
          if (n > v.att && v.env < v.floor) { dead = true; break; }
        }
      }
      if (dead) { vs[j] = vs[vs.length - 1]; vs.pop(); }
    }
    return true;
  }
}

registerProcessor('zh-rain', ZhRain);
