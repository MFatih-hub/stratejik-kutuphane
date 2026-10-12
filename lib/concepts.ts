// lib/concepts.ts — #kavram etiketleri.
//
// Notlarda ve yazılarda #adalet, #iktidar, #zaman-algısı gibi yazılan her
// kavram bir "kavram sayfası"na bağlanır. Yazıların etiketleri de aynı
// sayfaya düşer: etiket = kavram.
import { turkishLower } from './helpers';

const LETTER = 'A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛûÊêÔô';
// Önünde boşluk / satır başı / açılış işareti olan, harfle başlayan #kelime
export const HASHTAG_RE = new RegExp(`(^|[\\s(\\[>“"'‘;])#([${LETTER}][${LETTER}0-9_-]{1,48})`, 'g');

/** Kavram anahtarı: küçük harf (Türkçe kurallarıyla), sondaki tire/alt çizgi atılır. */
export function conceptKey(raw: string): string {
  return turkishLower((raw || '').trim().replace(/^#/, '')).replace(/[-_]+$/g, '');
}

export function conceptHref(raw: string): string {
  return `/kavram/${encodeURIComponent(conceptKey(raw))}`;
}

/** Düz metindeki #kavramları (tekrarsız, anahtar hâlinde) çıkarır. */
export function extractHashtags(text: string): string[] {
  if (!text || !text.includes('#')) return [];
  const out = new Set<string>();
  const plain = text.replace(/<[^>]+>/g, ' ');
  for (const m of plain.matchAll(HASHTAG_RE)) {
    const k = conceptKey(m[2]);
    if (k.length >= 2) out.add(k);
  }
  return Array.from(out);
}

/**
 * HTML içindeki #kavramları kavram sayfasına bağlar. Etiketlerin içine,
 * mevcut bağlantıların ve kod bloklarının içine dokunmaz.
 */
export function linkifyHashtagsHtml(html: string): string {
  if (!html || !html.includes('#')) return html;
  const parts = html.split(/(<[^>]+>)/g);
  let skip = 0; // <a>, <code>, <pre> içindeyken > 0
  return parts
    .map((part) => {
      if (part.startsWith('<')) {
        const m = /^<(\/?)(a|code|pre)\b/i.exec(part);
        if (m) skip += m[1] ? -1 : 1;
        if (skip < 0) skip = 0;
        return part;
      }
      if (skip > 0 || !part.includes('#')) return part;
      return part.replace(HASHTAG_RE, (_all, pre, word) => {
        const key = conceptKey(word);
        return `${pre}<a href="${conceptHref(key)}" class="concept-link">#${word}</a>`;
      });
    })
    .join('');
}

/** Bir yazının hem etiketlerinden hem metnindeki #kavramlardan anahtar listesi. */
export function postConcepts(post: { tags?: string[] | null; content?: string | null }): string[] {
  const s = new Set<string>();
  for (const t of post.tags || []) { const k = conceptKey(t); if (k) s.add(k); }
  for (const k of extractHashtags(post.content || '')) s.add(k);
  return Array.from(s);
}
