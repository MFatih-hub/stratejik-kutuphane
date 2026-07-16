import GithubSlugger from 'github-slugger';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

// Editörden gelen HTML'de izin verilen etiket/özellik listesi — hem tarayıcıda
// (editör, DOMPurify) hem sunucuda (herkese açık yazı sayfası, sanitize-html)
// aynı kurallar geçerli olsun diye tek yerden tanımlanıyor.
const ALLOWED_HTML_TAGS = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'img', 'br'];
const ALLOWED_HTML_ATTRS = ['href', 'src', 'alt', 'title', 'rel', 'target', 'style', 'id'];

/** Tarayıcıda (editör kaydederken) çalışan DOMPurify için ayar — SADECE client component'lerde kullan. */
export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ALLOWED_HTML_TAGS,
  ALLOWED_ATTR: ALLOWED_HTML_ATTRS,
};

/**
 * Sunucuda (herkese açık yazı sayfasını render ederken) çalışan sanitize-html
 * için ayar. isomorphic-dompurify BİLEREK kullanılmıyor: onun Node tarafı
 * jsdom'a dayanıyor, jsdom'un bir alt bağımlılığı (html-encoding-sniffer →
 * @exodus/bytes) Vercel'in sunucu ortamında ESM/CJS çakışmasıyla çöküyor
 * (ERR_REQUIRE_ESM, 16 Temmuz 2026'da canlıda görüldü). sanitize-html saf
 * JS'tir, DOM/jsdom gerektirmez, bu sorunu tamamen ortadan kaldırıyor.
 */
export const SANITIZE_HTML_OPTIONS = {
  allowedTags: ALLOWED_HTML_TAGS,
  allowedAttributes: {
    '*': ALLOWED_HTML_ATTRS,
  },
};

function stripInlineTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

/**
 * İçerikten (H1–H3) başlıkları çıkarır. Hem HTML (yeni editör) hem markdown
 * (eski yazılar) formatını destekler. Kimlikler (id) github-slugger ile
 * üretilir — bu da rehype-slug (markdown render) ve injectHeadingIds (HTML
 * render) ile aynı algoritma olduğu için içindekiler linkleri gerçek
 * başlıklarla eşleşir.
 */
export function extractHeadings(content: string, format?: string | null): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  if (format === 'html') {
    const re = /<h([1-3])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content || ''))) {
      const level = Number(match[1]);
      const text = stripInlineTags(match[2]);
      if (!text) continue;
      headings.push({ id: slugger.slug(text), text, level });
    }
  } else {
    const lines = (content || '').split('\n');
    for (const line of lines) {
      const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line.trim());
      if (!m) continue;
      const text = stripMarkdownInline(m[2]);
      if (!text) continue;
      headings.push({ id: slugger.slug(text), text, level: m[1].length });
    }
  }

  return headings;
}

/** HTML içindeki H1–H3 etiketlerine, içindekiler listesiyle eşleşen id'ler ekler. */
export function injectHeadingIds(html: string): string {
  const slugger = new GithubSlugger();
  return (html || '').replace(/<h([1-3])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    if (/\sid=/.test(attrs)) return full;
    const text = stripInlineTags(inner);
    if (!text) return full;
    const id = slugger.slug(text);
    return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
  });
}
