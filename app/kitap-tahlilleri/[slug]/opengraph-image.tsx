import { fetchPublishedPost } from '@/lib/og-post';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Kitap tahlili — Zihin Haritası';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Row = { title: string | null; subtitle: string | null; book_author: string | null; reading_order: number | null };

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await fetchPublishedPost<Row>(params.slug, 'kitap_tahlili', 'title,subtitle,book_author,reading_order');
  return ogCard({
    kicker: ['Kitap Tahlili', post?.reading_order != null ? `#${post.reading_order}` : null].filter(Boolean).join(' · '),
    title: post?.title || 'Kitap Tahlilleri',
    sub: post?.book_author || post?.subtitle || undefined,
  });
}
