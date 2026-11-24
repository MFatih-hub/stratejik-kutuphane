import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/helpers';
import { durakHref, getReadingList, listSeriesNames, listYazilar } from '@/lib/public-data';
import { SITE_URL } from '@/lib/site';

// Saatte bir yenilenir (tek bir küçük dosya; maliyeti yok denecek kadar az).
export const revalidate = 3600;


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, list, series] = await Promise.all([listYazilar(), getReadingList(), listSeriesNames()]);
  const date = (s: string | null) => (s ? new Date(s) : undefined);

  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/yazilar`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/kitap-tahlilleri`, changeFrequency: 'weekly', priority: 0.8 },
    ...posts.map((p) => ({ url: `${SITE_URL}/yazi/${p.slug}`, lastModified: date(p.updated_at || p.published_at), changeFrequency: 'monthly' as const, priority: 0.8 })),
    // Yalnızca tahlili yazılmış eserler; diğerleri boş sayfa sayılmasın
    ...list.written.map((b) => ({ url: `${SITE_URL}/kitap-tahlilleri/${b.slug}`, lastModified: date(b.updatedAt), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...list.duraks.filter((d) => d.done > 0).map((d) => ({ url: `${SITE_URL}${durakHref(d.name)}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...series.map((name) => ({ url: `${SITE_URL}/dizi/${encodeURIComponent(name)}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/kategori/${c.path}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}
