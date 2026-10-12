import { createClient } from '@/lib/supabase-server';
import { getCategoryName } from '@/lib/helpers';
import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Zihin Haritası';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .eq('post_type', 'yazi')
    .single();
  return ogCard({
    kicker: post?.series || (post?.category ? getCategoryName(post.category) : 'Yazı'),
    title: post?.title || 'Zihin Haritası',
    sub: post?.subtitle || undefined,
  });
}
