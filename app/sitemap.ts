import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, getPostBasePath } from '@/lib/helpers';
import { fetchJourney } from '@/lib/reading-journey';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  // PostgREST tek istekte en fazla 1000 satır döndürür → sayfa sayfa çek.
  // Tahlil notu henüz yazılmamış kitap kayıtları (content = '') sitemap'e girmez.
  const posts: any[] = [];
  for (let page = 0; page < 50; page++) {
    const from = page * 1000;
    const { data, error } = await supabase
      .from('posts')
      .select('slug, updated_at, published_at, post_type')
      .eq('is_published', true)
      .neq('post_type', 'okuma_bulteni')
      .or('post_type.neq.kitap_tahlili,content.neq.""')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    posts.push(...data);
    if (data.length < 1000) break;
  }

  // Yazılar ve kitap tahlilleri, kendi URL öneklerinde
  const postUrls = posts.map((post) => ({
    url: `${SITE_URL}${getPostBasePath(post.post_type)}/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Kategori sayfaları (sadece yazılar için)
  const categoryUrls = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/kategori/${c.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Bölüm indeksleri
  const sectionUrls = [
    { url: `${SITE_URL}/kitap-tahlilleri`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${SITE_URL}/kavram`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
  ];

  // Duraklar ve yazı dizileri
  const extraUrls: MetadataRoute.Sitemap = [];
  try {
    const journey = await fetchJourney(supabase);
    for (const m of journey.modules) {
      if (m.written > 0) extraUrls.push({ url: `${SITE_URL}/durak/${encodeURIComponent(m.name)}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 });
    }
    const { data: ser, error } = await supabase.from('posts').select('series').eq('is_published', true).not('series', 'is', null).limit(1000);
    if (!error) {
      for (const name of Array.from(new Set((ser || []).map((r: any) => r.series as string)))) {
        extraUrls.push({ url: `${SITE_URL}/dizi/${encodeURIComponent(name)}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 });
      }
    }
  } catch { /* önemli değil */ }

  // Ana sayfa
  const homeUrl = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  };

  return [homeUrl, ...sectionUrls, ...extraUrls, ...categoryUrls, ...postUrls];
}
