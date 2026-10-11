import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import BookBulkAddClient from './bulk-add-client';

export const revalidate = 0;

export default async function BookBulkAddPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  return <BookBulkAddClient />;
}
