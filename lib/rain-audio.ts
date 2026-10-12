// lib/rain-audio.ts — su damlası sesinin ana iş parçacığı tarafı.
//
// Asıl ses public/rain-worklet.js içinde, örnek örnek ve fiziksel ölçülere
// göre üretilir (bkz. oradaki açıklama). Burada yalnızca:
//   • işlemci yüklenir ve çıkışları bağlanır,
//   • uzak damlaların yankısı için doğal bir oda yankısı kurulur — tizleri
//     zamanla sönen (gerçek odalarda olduğu gibi) bir yankı; tizleri uzun
//     kalan yankı metalik bir parıltı bırakırdı,
//   • ses birkaç saniyede yavaşça açılır.

export type Engine = {
  ctx: BaseAudioContext;
  node: AudioWorkletNode;
  master: GainNode;
};

const WORKLET_URL = '/rain-worklet.js?v=3';
export const MASTER_LEVEL = 0.2; // kısık

/** Tizleri zamanla sönen, kısa ön gecikmeli doğal oda yankısı. */
function makeRoom(ctx: BaseAudioContext, seconds = 1.6) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const pre = Math.floor(rate * 0.012);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / rate;
      const fc = 600 + 9000 * Math.exp(-t / 0.28); // tizler önce söner
      const a = 1 - Math.exp((-2 * Math.PI * fc) / rate);
      lp += a * (Math.random() * 2 - 1 - lp);
      const env = Math.exp(-t / 0.2) * Math.min(1, t / 0.025);
      d[i] = lp * env;
    }
  }
  return buf;
}

/**
 * Ses motorunu kurar. `report`: suya düşen damlalarda ana iş parçacığına
 * haber ver (görseldeki halkalar için). `autoBig`: büyük damlaları işlemci
 * kendisi düşürsün (önizleme kaydı için).
 */
export async function buildEngine(
  ctx: BaseAudioContext,
  opts: { report?: boolean; autoBig?: boolean; fadeIn?: number } = {}
): Promise<Engine | null> {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return null;
  await ctx.audioWorklet.addModule(WORKLET_URL);

  const master = ctx.createGain();
  const fade = opts.fadeIn ?? 2.5;
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(MASTER_LEVEL, ctx.currentTime + Math.max(0.05, fade));
  master.connect(ctx.destination);

  const room = ctx.createConvolver();
  room.buffer = makeRoom(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  room.connect(wet).connect(master);

  const node = new AudioWorkletNode(ctx, 'zh-rain', {
    numberOfInputs: 0,
    numberOfOutputs: 2,
    outputChannelCount: [2, 2],
    processorOptions: { report: !!opts.report, autoBig: !!opts.autoBig },
  });
  node.connect(master, 0);
  node.connect(room, 1);
  return { ctx, node, master };
}

/** Görseldeki büyük damla suya değdiğinde. */
export function bigDrop(e: Engine) {
  e.node.port.postMessage({ type: 'big' });
}

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
