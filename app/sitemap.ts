import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, getPostBasePath } from '@/lib/helpers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at, post_type')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  // Her türden yazı: kendi URL önekinde (/yazi, /kitap-tahlilleri, /okuma-bulteni)
  const postUrls = (posts || []).map((post) => ({
    url: `${SITE_URL}${getPostBasePath(post.post_type)}/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly' as const,
    priority: post.post_type === 'okuma_bulteni' ? 0.5 : 0.8,
  }));

  // Kategori sayfaları (sadece yazılar için)
  const categoryUrls = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/kategori/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Bölüm indeksleri
  const sectionUrls = [
    { url: `${SITE_URL}/okuma-bulteni`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${SITE_URL}/kitap-tahlilleri`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
  ];

  // Ana sayfa
  const homeUrl = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  };

  return [homeUrl, ...sectionUrls, ...categoryUrls, ...postUrls];
}
