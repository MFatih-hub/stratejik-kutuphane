// lib/watch.ts — okuma listesine paralel izleme listesi (data/izleme.json).
// Videolar elle seçilir; anahtar okuma listesindeki sıra numarasıdır. Yalnızca
// sunucuda (sayfa üretilirken) kullanılır.
import data from '@/data/izleme.json';

export { LANG_LABEL, durLabel, playlistHref, totalLabel, videoHref } from './watch-links';

export type Video = { id: string; title: string; channel: string; dur: string; lang: 'tr' | 'en' };

const LIST = data as unknown as Record<string, Video[] | string>;

export function videosFor(order: number | null | undefined): Video[] {
  if (order == null) return [];
  const v = LIST[String(order)];
  return Array.isArray(v) ? v : [];
}

/** Listede videosu olan bütün sıra numaraları. */
export function watchOrders(): number[] {
  return Object.keys(LIST).filter((k) => Array.isArray(LIST[k])).map(Number).sort((a, b) => a - b);
}
