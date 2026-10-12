// lib/concepts-server.ts — kavram sayfaları için veri toplama (sunucuda).
import { postConcepts, extractHashtags } from './concepts';

export type ConceptPost = { id: number; slug: string; title: string; post_type: string; book_author: string | null; reading_order: number | null; excerpt: string | null; is_published: boolean; concepts: string[] };
export type ConceptNote = { id: number; post_id: number; kind: string; body: string; page: string | null; created_at: string; concepts: string[]; book: { title: string; slug: string; reading_order: number | null; book_author: string | null } | null };

async function pageAll(make: (from: number, to: number) => any, max = 20000): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** İçeriği olan yazı/tahliller (yönetici için taslaklar da) ve kavramları. */
export async function conceptPosts(supabase: any, isAdmin: boolean): Promise<ConceptPost[]> {
  const rows = await pageAll((a, b) => {
    let q = supabase.from('posts').select('id, slug, title, post_type, book_author, reading_order, excerpt, is_published, tags, content')
      .neq('content', '').in('post_type', ['yazi', 'kitap_tahlili']);
    if (!isAdmin) q = q.eq('is_published', true);
    return q.order('id', { ascending: true }).range(a, b);
  });
  return rows
    .map((r) => ({ ...r, concepts: postConcepts(r), content: undefined, tags: undefined }))
    .filter((r) => r.concepts.length);
}

/** #kavram içeren fişler (yalnızca yönetici; RLS zaten başkasına göstermez). */
export async function conceptNotes(supabase: any): Promise<ConceptNote[]> {
  const rows = await pageAll((a, b) => supabase.from('notes')
    .select('id, post_id, kind, body, page, created_at, posts(title, slug, reading_order, book_author)')
    .ilike('body', '%#%').order('created_at', { ascending: false }).range(a, b));
  return rows
    .map((r) => ({ ...r, book: r.posts || null, posts: undefined, concepts: extractHashtags(r.body) }))
    .filter((r) => r.concepts.length);
}
