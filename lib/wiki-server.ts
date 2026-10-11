// lib/wiki-server.ts — [[...]] bağlantılarını sunucuda veritabanından çözer.
import { resolveWikiTarget } from './reading';

export type ResolvedTarget = { id: number; slug: string; title: string; author: string | null; order: number | null };

/** Tek bir [[...]] metnini esere çevirir (bulamazsa null). */
export async function resolveLinkText(supabase: any, raw: string): Promise<ResolvedTarget | null> {
  const ad = raw.trim().slice(0, 160);
  if (!ad) return null;
  const num = /^#?\s*(\d{1,5})$/.exec(ad);
  let data: any[] = [];
  if (num) {
    const r = await supabase.from('posts').select('id, slug, title, book_author, reading_order')
      .eq('post_type', 'kitap_tahlili').eq('reading_order', parseInt(num[1], 10)).limit(1);
    data = r.data || [];
  } else {
    const comma = ad.indexOf(',');
    const clean = (s: string) => s.replace(/[,()*%\\:"]/g, ' ').trim();
    const titlePart = clean(comma > 0 ? ad.slice(comma + 1) : ad);
    const authorPart = comma > 0 ? clean(ad.slice(0, comma)) : '';
    let q = supabase.from('posts').select('id, slug, title, book_author, reading_order')
      .eq('post_type', 'kitap_tahlili').ilike('title', `%${titlePart}%`);
    if (authorPart) q = q.ilike('book_author', `%${authorPart}%`);
    const r = await q.order('reading_order', { ascending: true }).limit(60);
    data = r.data || [];
  }
  const items = data.map((c) => ({ id: c.id, slug: c.slug, title: c.title, author: c.book_author, order: c.reading_order }));
  return resolveWikiTarget(ad, items) || items[0] || null;
}
