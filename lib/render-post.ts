// lib/render-post.ts — yazı içeriğini (site sayfası, PDF, Word, Markdown ve
// e-posta için) tek bir yoldan işler. SADECE sunucuda kullan.
//
//   1) eski markdown yazılar HTML'e çevrilir,
//   2) başlıklara içindekiler için id eklenir, HTML temizlenir,
//   3) ((dipnot metni)) ifadeleri numaralı dipnotlara dönüşür,
//   4) [[eser]] bağlantıları ve #kavramlar bağlanır (isteğe bağlı),
//   5) kaynakça alanı satır satır listeye çevrilir.
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { SANITIZE_HTML_OPTIONS, injectHeadingIds, extractHeadings, type Heading } from './content';
import { linkifyWikiHtml } from './reading';
import { linkifyHashtagsHtml } from './concepts';

export type RenderedPost = {
  html: string;
  footnotes: string[]; // her biri HTML
  headings: Heading[];
  bibliography: string[]; // her biri HTML (bağlantılar tıklanır)
};

export const FOOTNOTE_RE = /(?:[ \t\u00a0]|&nbsp;)*\(\(((?:(?!\)\)|<\/?(?:p|h[1-6]|li|ul|ol|blockquote|pre)\b)[\s\S]){1,1500}?)\)\)/g;

export function contentToHtml(content: string | null | undefined, format?: string | null): string {
  if (!content) return '';
  if (format === 'html') return content;
  try {
    return marked.parse(content, { async: false, gfm: true, breaks: false }) as string;
  } catch {
    return content;
  }
}

/** ((...)) → numaralı üst simge; dipnot metinlerini sırayla döndürür. */
export function extractFootnotes(html: string): { html: string; notes: string[] } {
  const notes: string[] = [];
  if (!html.includes('((')) return { html, notes };
  const out = html.replace(FOOTNOTE_RE, (_m, inner: string) => {
    const text = inner.trim();
    if (!text) return _m;
    notes.push(text);
    const n = notes.length;
    return `<sup class="fn-ref" id="fnref-${n}"><a href="#fn-${n}" aria-label="Dipnot ${n}">${n}</a></sup>`;
  });
  return { html: out, notes };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Kaynakça: her satır bir kaynak; içindeki adresler bağlantı olur. */
export function parseBibliography(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•]\s+/, ''))
    .filter(Boolean)
    .map((l) => esc(l).replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, '<a href="$1" rel="noopener noreferrer" target="_blank">$1</a>'));
}

export function renderPost(
  post: { content?: string | null; content_format?: string | null; bibliography?: string | null },
  opts: { wiki?: boolean; hashtags?: boolean } = {}
): RenderedPost {
  let html = contentToHtml(post.content, post.content_format);
  html = injectHeadingIds(html);
  html = sanitizeHtml(html, SANITIZE_HTML_OPTIONS);
  const fn = extractFootnotes(html);
  html = fn.html;
  if (opts.wiki) html = linkifyWikiHtml(html);
  if (opts.hashtags !== false) html = linkifyHashtagsHtml(html);
  return {
    html,
    footnotes: fn.notes,
    headings: extractHeadings(html, 'html'),
    bibliography: parseBibliography(post.bibliography),
  };
}

/** Site içi göreli bağlantıları tam adrese çevirir (dışa aktarma ve e-posta için). */
export function absolutizeLinks(html: string, siteUrl: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${siteUrl.replace(/\/$/, '')}/`);
}
