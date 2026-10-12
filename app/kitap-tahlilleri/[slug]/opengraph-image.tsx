import { createClient } from '@/lib/supabase-server';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Kitap tahlili — Zihin Haritası';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, subtitle, book_author, reading_order')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .eq('post_type', 'kitap_tahlili')
    .single();
  return ogCard({
    kicker: ['Kitap Tahlili', post?.reading_order != null ? `#${post.reading_order}` : null].filter(Boolean).join(' · '),
    title: post?.title || 'Kitap Tahlilleri',
    sub: post?.book_author || post?.subtitle || undefined,
  });
}
