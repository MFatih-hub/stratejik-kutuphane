// lib/reading.ts — okuma süreci yardımcıları (durum, gün, [[bağlantılar]]).
import { turkishLower } from './helpers';

export type ReadingStatus = 'sirada' | 'okunuyor' | 'okundu' | 'yazildi';

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  sirada: 'Sırada',
  okunuyor: 'Okunuyor',
  okundu: 'Okundu · tahlil bekliyor',
  yazildi: 'Tahlili yazıldı',
};

export const NOTE_KINDS = [
  { value: 'not', label: 'Not' },
  { value: 'alinti', label: 'Alıntı' },
  { value: 'soru', label: 'Soru' },
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number]['value'];

/** İstanbul saatine göre gün (YYYY-AA-GG). */
export function istanbulDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Bugünü "okuma yapılan gün" olarak işaretler (tekrar çağırmak zararsız). */
export async function markReadingDay(supabase: any) {
  try {
    await supabase.from('reading_days').upsert({ day: istanbulDay() }, { onConflict: 'day', ignoreDuplicates: true });
  } catch { /* önemli değil */ }
}

// ============== [[BAĞLANTILAR]] ==============
// Notlarda ve tahlillerde [[...]] ile başka bir esere bağlantı verilir:
//   [[#123]]            → okuma listesindeki 123. eser
//   [[Etika]]           → başlığı "Etika" olan (ya da öyle başlayan) eser
//   [[Spinoza, Etika]]  → yazarı Spinoza'yı, başlığı Etika'yı içeren eser

export const WIKILINK_RE = /\[\[([^\[\]\n]{1,160})\]\]/g;

export function extractWikiLinks(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) out.push(m[1].trim());
  return out;
}

function norm(s: string): string {
  return turkishLower(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ğüşöçı\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type LinkTarget = { id: number; slug: string; title: string; author: string | null; order: number | null };

// Aynı liste için normalize edilmiş başlık/yazarları bir kez hesapla
const NORM_CACHE = new WeakMap<object, { t: string[]; a: string[] }>();
function normsFor(items: LinkTarget[]) {
  let c = NORM_CACHE.get(items);
  if (!c) { c = { t: items.map((i) => norm(i.title)), a: items.map((i) => norm(i.author || '')) }; NORM_CACHE.set(items, c); }
  return c;
}

/** [[...]] metnini eser listesinde bulur; bulamazsa null. */
export function resolveWikiTarget<T extends LinkTarget>(raw: string, items: T[]): T | null {
  const text = raw.trim();
  const num = /^#?\s*(\d{1,5})$/.exec(text);
  if (num) return items.find((i) => i.order === parseInt(num[1], 10)) || null;

  const { t: nt, a: na } = normsFor(items);
  const best = (pred: (i: number) => boolean): T | null => {
    let hit: T | null = null;
    for (let i = 0; i < items.length; i++) {
      if (pred(i) && (!hit || (items[i].order ?? 1e9) < (hit.order ?? 1e9))) hit = items[i];
    }
    return hit;
  };
  const comma = text.indexOf(',');
  if (comma > 0) {
    const a = norm(text.slice(0, comma));
    const t = norm(text.slice(comma + 1));
    const h = best((i) => na[i].includes(a) && nt[i].includes(t));
    if (h) return h;
  }
  const q = norm(text);
  if (!q) return null;
  return best((i) => nt[i] === q) || best((i) => nt[i].startsWith(q)) || best((i) => nt[i].includes(q));
}

/** Bağlantının gideceği adres: sunucuda çözülüp ilgili esere yönlendirir. */
export function wikiHref(text: string): string {
  return `/eser?ad=${encodeURIComponent(text)}`;
}

/** HTML içindeki [[...]] ifadelerini bağlantıya çevirir (etiketlerin içine dokunmaz). */
export function linkifyWikiHtml(html: string): string {
  if (!html || !html.includes('[[')) return html;
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : part.replace(WIKILINK_RE, (_m, t) => {
      const label = String(t).trim();
      return `<a href="${wikiHref(label)}" class="wikilink">${label}</a>`;
    })))
    .join('');
}
