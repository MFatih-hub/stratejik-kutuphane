import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import plan from '@/lib/liste-duzenleme-plani.json';
import ListeDuzenleClient, { type Plan } from './liste-duzenle-client';

export const revalidate = 0;
export const metadata: Metadata = { title: 'Okuma listesini düzenle', robots: { index: false, follow: false } };

export default async function ListeDuzenlePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  return <ListeDuzenleClient plan={plan as unknown as Plan} />;
}
