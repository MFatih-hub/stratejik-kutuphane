// lib/helpers.ts — Zihin Haritası Blog

export const CATEGORIES = [
  { slug: 'teknoloji', name: 'Mühendislik', description: 'Mühendislik', color: '#8b2a16' },
  { slug: 'jeopolitik', name: 'Politika', description: 'Politika', color: '#2d5f3f' },
  { slug: 'bilim', name: 'Sosyoloji', description: 'Sosyoloji', color: '#1d3d5c' },
  { slug: 'ekonomi', name: 'Finans', description: 'Finans', color: '#a3691e' },
  { slug: 'dusunce', name: 'Felsefe', description: 'Felsefe', color: '#5e3d8c' },
  { slug: 'turkiye', name: 'Tarih', description: 'Tarih', color: '#a32d2d' },
];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export function getCategoryName(slug: string) {
  return getCategoryBySlug(slug)?.name || slug;
}

export function getCategoryColor(slug: string) {
  return getCategoryBySlug(slug)?.color || '#1a1814';
}

// ============== İÇERİK TÜRLERİ ==============
// Site üç ayrı bölümde yayın yapar: kendi yazıları, kitap tahlilleri ve
// okuma bülteni linkleri. Hepsi aynı `posts` tablosunda tutulur ama
// `post_type` ile ayrışır ve her biri kendi URL önekinde (ayrı sayfalarda)
// yaşar — böylece hiçbiri birbirine karışmaz.
export const POST_TYPES = [
  { value: 'yazi', label: 'Yazı', pluralLabel: 'Yazılar', basePath: '/yazi' },
  { value: 'kitap_tahlili', label: 'Kitap Tahlili', pluralLabel: 'Kitap Tahlilleri', basePath: '/kitap-tahlilleri' },
  { value: 'okuma_bulteni', label: 'Okuma Bülteni Linki', pluralLabel: 'Okuma Bülteni', basePath: '/okuma-bulteni' },
] as const;

export type PostType = (typeof POST_TYPES)[number]['value'];

export function getPostTypeInfo(type?: string | null) {
  return POST_TYPES.find((t) => t.value === type) || POST_TYPES[0];
}

export function getPostBasePath(type?: string | null): string {
  return getPostTypeInfo(type).basePath;
}

/** Bir yazının (herhangi bir türden) doğru site-içi adresini üretir. */
export function getPostUrl(post: { slug: string; post_type?: string | null }): string {
  return `${getPostBasePath(post.post_type)}/${post.slug}`;
}

// ============== TOPLU EKLEME İÇİN KATEGORİ EŞLEŞTİRME ==============
// Okuma Bülteni toplu-ekleme aracına yapıştırılan metindeki kategori
// isimleri (bültenin kendi kategori adları, eski site kategorileri veya
// serbest yazım) site kategorisine eşlenir. Birebir slug/isim eşleşmezse
// bu sözlükte en uzun eşleşen anahtar kazanır.
const CATEGORY_ALIASES: Record<string, string> = {
  'jeopolitik': 'jeopolitik', 'politika': 'jeopolitik', 'güvenlik': 'jeopolitik', 'guvenlik': 'jeopolitik',
  'teknoloji': 'teknoloji', 'mühendislik': 'teknoloji', 'muhendislik': 'teknoloji',
  'ekonomi': 'ekonomi', 'finans': 'ekonomi',
  'sosyoloji': 'bilim', 'bilim': 'bilim',
  'felsefe': 'dusunce', 'düşünce': 'dusunce', 'dusunce': 'dusunce',
  'stratejik kültür': 'turkiye', 'stratejik kultur': 'turkiye', 'tarih': 'turkiye', 'türkiye': 'turkiye', 'turkiye': 'turkiye',
};

/** Serbest metindeki bir kategori adını site kategori slug'ına çevirir; bulamazsa null döner. */
export function resolveCategorySlug(input: string): string | null {
  if (!input) return null;
  const norm = turkishLower(input.trim()).replace(/[&/]/g, ' ');
  const bySlug = CATEGORIES.find((c) => c.slug === norm || turkishLower(c.name) === norm);
  if (bySlug) return bySlug.slug;
  const keys = Object.keys(CATEGORY_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (norm.includes(key)) return CATEGORY_ALIASES[key];
  }
  return null;
}

export function calculateReadingMinutes(content: string): number {
  if (!content) return 1;
  const text = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_~`>]/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function generateExcerpt(content: string, maxLength = 180): string {
  if (!content) return '';
  const plain = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_~`>]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 70);
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeAgo(date: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'az önce';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} hafta önce`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} ay önce`;
  return `${Math.floor(seconds / 31536000)} yıl önce`;
}

// ============== ZENGİN METİN (HTML) İÇERİK YARDIMCILARI ==============
// Yeni WYSIWYG editör içeriği HTML olarak saklar (content_format = 'html').
// Eski yazılar markdown olarak kalır (content_format = 'markdown').
// Aşağıdaki fonksiyonlar her iki formatı da destekler.

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateReadingMinutesFromHtml(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function generateExcerptFromHtml(html: string, maxLength = 180): string {
  const plain = stripHtml(html);
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

/** content_format'a göre doğru okuma süresi hesaplayıcısını çağırır. */
export function getReadingMinutes(content: string, format?: string | null): number {
  return format === 'html' ? calculateReadingMinutesFromHtml(content) : calculateReadingMinutes(content);
}

/** content_format'a göre doğru özet üreticisini çağırır. */
export function getExcerpt(content: string, format?: string | null, maxLength = 180): string {
  return format === 'html' ? generateExcerptFromHtml(content, maxLength) : generateExcerpt(content, maxLength);
}

// ============== TÜRKÇE ARAMA YARDIMCISI ==============
// JS'in varsayılan toLowerCase() metodu Türkçe İ/I harflerini yanlış çevirir
// (İstanbul → "i̇stanbul" gibi). Arama kutusu için bunu düzeltiyoruz.
const TR_UPPER_TO_LOWER: Record<string, string> = { İ: 'i', I: 'ı' };
export function turkishLower(text: string): string {
  if (!text) return '';
  return text.replace(/[İI]/g, (ch) => TR_UPPER_TO_LOWER[ch] || ch).toLowerCase();
}
