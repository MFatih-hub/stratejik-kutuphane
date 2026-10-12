import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchEditorLists } from '@/lib/editor-lists';
import { newsletterEnabled } from '@/lib/server-env';
import EditorClient from './editor-client';

export const revalidate = 0;

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const [{ data: post }, lists] = await Promise.all([
    supabase.from('posts').select('*').eq('id', Number(params.id)).single(),
    fetchEditorLists(supabase),
  ]);

  if (!post) notFound();
  return <EditorClient post={post} modules={lists.modules} seriesNames={lists.series} newsletter={newsletterEnabled()} />;
}
