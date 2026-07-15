import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES } from '@/lib/helpers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  // Yazı sayfaları
  const postUrls = (posts || []).map((post) => ({
    url: `${SITE_URL}/yazi/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Kategori sayfaları
  const categoryUrls = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/kategori/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Ana sayfa
  const homeUrl = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  };

  return [homeUrl, ...categoryUrls, ...postUrls];
}
