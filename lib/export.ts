// lib/export.ts — yazıları, kitap notlarını ve tüm siteyi dışa aktarma.
// SADECE sunucuda kullan.
import TurndownService from 'turndown';
import { formatDate, getPostUrl, stripHtml } from './helpers';
import { absolutizeLinks, renderPost } from './render-post';
import { buildDocx, type DocxSection } from './export-docx';
import { NOTE_KINDS, STATUS_LABELS } from './reading';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org').replace(/\/$/, '');
export const AUTHOR_NAME = 'Muhammet Fatih Işık';

// ---------------------------------------------------------------- yardımcılar
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*' });
td.addRule('footnoteRef', {
  filter: (node) => node.nodeName === 'SUP' && /\bfn-ref\b/.test((node as any).getAttribute?.('class') || ''),
  replacement: (_content, node) => `[^${String((node as any).textContent || '').replace(/\D+/g, '')}]`,
});
td.addRule('strike', { filter: ['s', 'del'] as any, replacement: (c) => `~~${c}~~` });
td.addRule('underline', { filter: ['u'] as any, replacement: (c) => `<u>${c}</u>` });

export function htmlToMarkdown(html: string): string {
  return td.turndown(html || '').replace(/\n{3,}/g, '\n\n').trim();
}

const yaml = (v: string) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function fileSafe(s: string): string {
  return (s || 'belge').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşüÂâÎîÛû._ -]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'belge';
}

/** Content-Disposition: Türkçe karakterli dosya adları için RFC 5987 biçimi. */
export function attachmentHeader(filename: string): string {
  const ascii = filename.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function kindLabel(kind: string) {
  return NOTE_KINDS.find((k) => k.value === kind)?.label || 'Not';
}

function pageNum(p?: string | null): number {
  const m = /\d+/.exec(p || '');
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

// ---------------------------------------------------------------- yazı / tahlil
export function postKicker(post: any): string {
  if (post.post_type === 'kitap_tahlili') return ['Kitap Tahlili', post.book_author].filter(Boolean).join(' · ');
  if (post.series) return `${post.series}${post.series_order ? ` · ${post.series_order}. bölüm` : ''}`;
  return 'Yazı';
}

export function postMetaLine(post: any): string {
  return [AUTHOR_NAME, formatDate(post.published_at || post.updated_at)].filter(Boolean).join(' · ');
}

export function postToMarkdown(post: any): string {
  const r = renderPost(post, { wiki: true, hashtags: false });
  const body = htmlToMarkdown(absolutizeLinks(r.html, SITE_URL));
  const url = `${SITE_URL}${getPostUrl(post)}`;
  const fm = [
    '---',
    `baslik: ${yaml(post.title)}`,
    post.subtitle ? `alt_baslik: ${yaml(post.subtitle)}` : null,
    `tur: ${post.post_type === 'kitap_tahlili' ? 'kitap_tahlili' : 'yazi'}`,
    post.book_author ? `eserin_yazari: ${yaml(post.book_author)}` : null,
    post.reading_order != null ? `okuma_sirasi: ${post.reading_order}` : null,
    post.reading_module ? `durak: ${yaml(post.reading_module)}` : null,
    post.series ? `dizi: ${yaml(post.series)}` : null,
    post.series_order != null && post.series ? `dizi_sirasi: ${post.series_order}` : null,
    `yazar: ${yaml(AUTHOR_NAME)}`,
    post.published_at ? `tarih: ${String(post.published_at).slice(0, 10)}` : null,
    post.tags?.length ? `etiketler: [${post.tags.map(yaml).join(', ')}]` : null,
    `adres: ${url}`,
    `yayinda: ${post.is_published ? 'evet' : 'hayir'}`,
    '---',
  ].filter(Boolean).join('\n');

  const parts = [fm, '', `# ${post.title}`];
  if (post.subtitle) parts.push('', `*${post.subtitle}*`);
  parts.push('', body);
  if (r.bibliography.length) {
    parts.push('', '## Kaynakça', '', ...r.bibliography.map((b) => `- ${stripHtml(b)}`));
  }
  if (r.footnotes.length) {
    parts.push('', ...r.footnotes.map((f, i) => `[^${i + 1}]: ${htmlToMarkdown(absolutizeLinks(f, SITE_URL)).replace(/\n+/g, ' ')}`));
  }
  return parts.join('\n') + '\n';
}

export async function postToDocx(post: any): Promise<Buffer> {
  const r = renderPost(post, { wiki: true, hashtags: false });
  const sections: DocxSection[] = [{ kind: 'html', html: absolutizeLinks(r.html, SITE_URL) }];
  if (r.bibliography.length) {
    sections.push({ kind: 'heading', text: 'Kaynakça', level: 2 });
    sections.push({ kind: 'list', items: r.bibliography, htmlItems: true });
  }
  const url = `${SITE_URL}${getPostUrl(post)}`;
  sections.push({ kind: 'para', text: url, small: true, muted: true });
  return buildDocx({
    title: post.title,
    subtitle: post.subtitle,
    kicker: postKicker(post),
    meta: postMetaLine(post),
    sections,
    footnotes: r.footnotes.map((f) => absolutizeLinks(f, SITE_URL)),
    footerText: `Zihin Haritası — ${post.title}`,
    siteUrl: SITE_URL,
  });
}

// ---------------------------------------------------------------- kitap notları
export type NoteRow = { id: number; kind: string; body: string; page: string | null; created_at: string };

export function sortNotes(notes: NoteRow[]): NoteRow[] {
  return notes.slice().sort((a, b) => pageNum(a.page) - pageNum(b.page) || a.created_at.localeCompare(b.created_at));
}

function bookHeaderLines(book: any): string[] {
  const out: string[] = [];
  if (book.reading_status) out.push(`Durum: ${STATUS_LABELS[book.reading_status as keyof typeof STATUS_LABELS] || book.reading_status}`);
  if (book.started_at) out.push(`Başlangıç: ${formatDate(book.started_at)}`);
  if (book.finished_at) out.push(`Bitiş: ${formatDate(book.finished_at)}`);
  if (book.reading_module) out.push(`Durak: ${book.reading_module}`);
  return out;
}

export function notesToMarkdown(book: any, notes: NoteRow[]): string {
  const sorted = sortNotes(notes);
  const parts = [
    `# ${book.title} — Okuma notları`,
    '',
    [book.book_author, book.reading_order != null ? `Okuma listesinde #${book.reading_order}` : null].filter(Boolean).join(' · '),
    '',
    ...bookHeaderLines(book).map((l) => `- ${l}`),
    `- ${notes.length} fiş`,
    '',
  ];
  for (const kind of NOTE_KINDS) {
    const list = sorted.filter((n) => n.kind === kind.value);
    if (!list.length) continue;
    parts.push(`## ${kind.label === 'Not' ? 'Notlar' : kind.label === 'Alıntı' ? 'Alıntılar' : 'Sorular'}`, '');
    for (const n of list) {
      const head = [n.page ? `s. ${n.page}` : null, formatDate(n.created_at)].filter(Boolean).join(' · ');
      const body = n.kind === 'alinti' ? n.body.split('\n').map((l) => `> ${l}`).join('\n') : n.body;
      parts.push(`**${head}**`, '', body, '');
    }
  }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

export async function notesToDocx(book: any, notes: NoteRow[]): Promise<Buffer> {
  const sorted = sortNotes(notes);
  const sections: DocxSection[] = [];
  const header = bookHeaderLines(book);
  if (header.length) sections.push({ kind: 'para', text: header.join('  ·  '), muted: true, small: true });
  for (const kind of NOTE_KINDS) {
    const list = sorted.filter((n) => n.kind === kind.value);
    if (!list.length) continue;
    sections.push({ kind: 'heading', text: kind.label === 'Not' ? 'Notlar' : kind.label === 'Alıntı' ? 'Alıntılar' : 'Sorular', level: 2 });
    for (const n of list) {
      const head = [n.page ? `s. ${n.page}` : null, formatDate(n.created_at)].filter(Boolean).join(' · ');
      sections.push({ kind: 'para', text: head, small: true, muted: true });
      const esc = n.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
      sections.push({ kind: 'html', html: n.kind === 'alinti' ? `<blockquote>${html}</blockquote>` : html });
    }
  }
  if (!notes.length) sections.push({ kind: 'para', text: 'Bu eser için henüz fiş yok.', italic: true });
  return buildDocx({
    title: `${book.title} — Okuma notları`,
    kicker: [book.book_author, book.reading_order != null ? `#${book.reading_order}` : null].filter(Boolean).join(' · '),
    meta: `${notes.length} fiş · ${AUTHOR_NAME}`,
    sections,
    footerText: `Okuma notları — ${book.title}`,
    siteUrl: SITE_URL,
  });
}

export { kindLabel };
