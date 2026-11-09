// lib/watch-links.ts — YouTube bağlantıları ve süre yazımı (tarayıcıda da kullanılır;
// video listesinin kendisini içermez, böylece sayfaların JavaScript'i büyümez).

export const videoHref = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** YouTube'un "sırayla izle" bağlantısı: geçici bir oynatma listesi açar (en fazla 50 video). */
export const playlistHref = (ids: string[]) => `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(',')}`;

export const LANG_LABEL: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce' };

/** "1:15:33" → saniye; okunamazsa null */
function seconds(d: string): number | null {
  const p = d.split(':').map(Number);
  if (p.length === 0 || p.some((x) => !Number.isFinite(x))) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
}

function minutesLabel(m: number): string {
  if (m < 60) return `${m} dk`;
  return m % 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m / 60} sa`;
}

/** "1:15:33" → "1 sa 16 dk", "39:28" → "39 dk" */
export function durLabel(d: string): string {
  const s = seconds(d);
  return s == null ? d : minutesLabel(Math.round(s / 60));
}

/** Videoların toplam süresi: "9 sa 12 dk" */
export function totalLabel(durs: string[]): string {
  const s = durs.reduce((a, d) => a + (seconds(d) ?? 0), 0);
  return minutesLabel(Math.round(s / 60));
}
