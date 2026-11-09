// lib/watch.ts — okuma listesine paralel izleme listesi (data/izleme.json).
// Videolar elle seçilir; anahtar okuma listesindeki sıra numarasıdır.
import data from '@/data/izleme.json';

export type Video = { id: string; title: string; channel: string; dur: string; lang: 'tr' | 'en' };

const LIST = data as unknown as Record<string, Video[] | string>;

export function videosFor(order: number | null | undefined): Video[] {
  if (order == null) return [];
  const v = LIST[String(order)];
  return Array.isArray(v) ? v : [];
}

export const videoHref = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** YouTube'un "sırayla izle" bağlantısı: geçici bir oynatma listesi açar (en fazla 50 video). */
export const playlistHref = (ids: string[]) => `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(',')}`;

export const LANG_LABEL: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce' };

/** "1:15:33" → "1 sa 16 dk", "39:28" → "39 dk" */
export function durLabel(d: string): string {
  const p = d.split(':').map(Number);
  if (p.some((x) => !Number.isFinite(x))) return d;
  const sec = p.reduce((a, x) => a * 60 + x, 0);
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`;
}
