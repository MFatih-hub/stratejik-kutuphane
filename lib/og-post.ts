/**
 * OG görselleri için yayımlanmış bir yazıyı Supabase REST ile okur.
 * Supabase istemci kütüphanesini edge paketine katmamak için düz fetch kullanılır:
 * kitaplıkla birlikte paket Vercel Hobby'nin 1 MB edge sınırını aşıyor ve dağıtım düşüyordu.
 */
export async function fetchPublishedPost<T extends Record<string, unknown>>(
  slug: string,
  postType: 'yazi' | 'kitap_tahlili',
  columns: string,
): Promise<T | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const q = new URLSearchParams({
    slug: `eq.${slug}`,
    is_published: 'eq.true',
    post_type: `eq.${postType}`,
    select: columns,
    limit: '1',
  });
  try {
    const res = await fetch(`${base}/rest/v1/posts?${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as T[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
