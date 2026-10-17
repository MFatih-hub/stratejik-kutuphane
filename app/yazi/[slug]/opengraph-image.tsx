import { fetchPublishedPost } from '@/lib/og-post';
import { getCategoryName } from '@/lib/helpers';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Zihin Haritası';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Row = { title: string | null; subtitle: string | null; category: string | null; series: string | null };

export default async function Image({ params }: { params: { slug: string } }) {
  // '*' bilerek: series sütunu v6 göçü çalıştırılmamışsa yok; adıyla istenirse sorgu hata verir.
  const post = await fetchPublishedPost<Row>(params.slug, 'yazi', '*');
  return ogCard({
    kicker: post?.series || (post?.category ? getCategoryName(post.category) : 'Yazı'),
    title: post?.title || 'Zihin Haritası',
    sub: post?.subtitle || undefined,
  });
}
