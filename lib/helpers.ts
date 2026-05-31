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
