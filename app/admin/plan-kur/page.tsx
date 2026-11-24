import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import kurulum from '@/lib/plan-kurulum.json';
import PlanKurClient, { type Kurulum } from './plan-kur-client';

export const revalidate = 0;
export const metadata: Metadata = { title: 'Okuma planını kur', robots: { index: false, follow: false } };

export default async function PlanKurPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  return <PlanKurClient kurulum={kurulum as unknown as Kurulum} />;
}
