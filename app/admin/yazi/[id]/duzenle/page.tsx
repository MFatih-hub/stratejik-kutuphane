import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import EditorClient from './editor-client';

export const revalidate = 0;

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', Number(params.id))
    .single();

  if (!post) notFound();
  return <EditorClient post={post} />;
}
