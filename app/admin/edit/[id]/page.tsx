import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import EditClient from './edit-client';

export const revalidate = 0;

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', Number(params.id))
    .single();

  if (!resource) notFound();

  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('resource_id', resource.id)
    .order('uploaded_at', { ascending: false });

  return <EditClient resource={resource} attachments={attachments || []} />;
}
