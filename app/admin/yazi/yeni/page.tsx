import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchEditorLists } from '@/lib/editor-lists';
import EditorClient from '../[id]/duzenle/editor-client';

const VALID_TYPES = ['yazi', 'kitap_tahlili', 'okuma_bulteni'];

export default async function NewPostPage({ searchParams }: { searchParams: { tur?: string; durak?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const initialType = searchParams?.tur && VALID_TYPES.includes(searchParams.tur) ? searchParams.tur : undefined;
  const lists = await fetchEditorLists(supabase);
  const durak = (searchParams?.durak || '').slice(0, 120) || undefined;

  return <EditorClient post={null} initialType={durak ? 'yazi' : initialType} initialDurak={durak} modules={lists.modules} seriesNames={lists.series} />;
}
