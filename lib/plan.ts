// lib/plan.ts — okuma planının iskeleti: bölümler ve her bölümün durakları.
//
// Kitaplar veritabanında (posts, post_type = 'kitap_tahlili'): sıra
// (reading_order), durak (reading_module), yayınevi (source_name) ve çekirdek
// işareti (tags içinde 'cekirdek'). Bölüm ise duraktan çıkar; durakların hangi
// bölümde olduğu data/okuma-plani.json'da durur. Planda olmayan bir durak
// "Diğer" bölümüne düşer.
import data from '@/data/okuma-plani.json';

export const CORE_TAG = 'cekirdek';

export type PlanBolum = { no: number; roman: string; ad: string; duraklar: string[] };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV',
  'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV'];

export const roman = (n: number) => ROMAN[n] || String(n);

export const BOLUMLER: PlanBolum[] = (data as { bolumler: { ad: string; duraklar: string[] }[] }).bolumler.map((b, i) => ({
  no: i + 1,
  roman: roman(i + 1),
  ad: b.ad,
  duraklar: b.duraklar,
}));

const BY_DURAK = new Map<string, PlanBolum>();
for (const b of BOLUMLER) for (const d of b.duraklar) BY_DURAK.set(d, b);

/** Durağın bölümü (planda yoksa null). */
export function bolumOf(durak: string | null | undefined): PlanBolum | null {
  return durak ? BY_DURAK.get(durak) || null : null;
}

/** Çekirdek (★) eser mi? */
export function isCoreTags(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(CORE_TAG);
}
