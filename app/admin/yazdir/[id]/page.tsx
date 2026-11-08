import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { getPostUrl, hasRealContent } from '@/lib/helpers';
import { renderPost } from '@/lib/render-post';
import { postKicker, postMetaLine, SITE_URL } from '@/lib/export';
import PrintDoc from '@/components/print-doc';
import PrintTools from '@/components/print-tools';

export const dynamic = 'force-dynamic';

// Yazdırma / PDF sayfası yalnızca yönetici için (her istek sunucuda çalışır).
async function load(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  const { data } = await supabase.from('posts').select('*').eq('id', Number(id)).maybeSingle();
  return data && hasRealContent(data.content) ? data : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await load(params.id);
  // Tarayıcı PDF'e kaydederken dosya adı olarak sayfa başlığını önerir
  return { title: { absolute: post ? post.title : 'Yazdır' }, robots: { index: false, follow: false } };
}

export default async function PrintPostPage({ params, searchParams }: { params: { id: string }; searchParams: { otomatik?: string } }) {
  const post = await load(params.id);
  if (!post) notFound();
  const rendered = renderPost(post, { wiki: true, hashtags: false });
  return (
    <>
      <PrintTools backHref={`/admin/yazi/${post.id}/duzenle`} auto={searchParams?.otomatik !== '0'} />
      <PrintDoc
        kicker={postKicker(post)}
        title={post.title}
        subtitle={post.subtitle}
        meta={postMetaLine(post)}
        rendered={rendered}
        url={`${SITE_URL}${getPostUrl(post)}`}
      />
    </>
  );
}
