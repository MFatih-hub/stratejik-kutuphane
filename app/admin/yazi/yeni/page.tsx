import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import EditorClient from '../[id]/duzenle/editor-client';

export default async function NewPostPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  return <EditorClient post={null} />;
}
