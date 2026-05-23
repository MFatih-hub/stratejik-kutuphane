export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(1) + ' MB';
}

export const TYPE_LABELS: Record<string, { label: string; icon: string; color: { bg: string; fg: string } }> = {
  kitap: { label: 'Kitap', icon: 'ti-book-2', color: { bg: '#E6F1FB', fg: '#0C447C' } },
  makale: { label: 'Makale', icon: 'ti-file-text', color: { bg: '#EEEDFE', fg: '#3C3489' } },
  tez: { label: 'Tez', icon: 'ti-school', color: { bg: '#FAEEDA', fg: '#854F0B' } },
  video: { label: 'Video', icon: 'ti-player-play', color: { bg: '#FCEBEB', fg: '#A32D2D' } },
  podcast: { label: 'Podcast', icon: 'ti-microphone', color: { bg: '#E1F5EE', fg: '#085041' } },
  belge: { label: 'Belge', icon: 'ti-file', color: { bg: '#F1EFE8', fg: '#444441' } },
};

export const STATUS_LABELS: Record<string, { label: string; color: { bg: string; fg: string } }> = {
  to_read: { label: 'Okunacak', color: { bg: '#F1EFE8', fg: '#5F5E5A' } },
  reading: { label: 'Okuyorum', color: { bg: '#FAEEDA', fg: '#854F0B' } },
  done: { label: 'Bitti', color: { bg: '#E1F5EE', fg: '#0F6E56' } },
};
