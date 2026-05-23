import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminClient from './admin-client';

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/giris');

  const { data: steps } = await supabase.from('steps').select('*').order('step_number');
  const { data: categories } = await supabase
    .from('categories')
    .select('*, steps(title)')
    .order('display_order');
  const { data: resources } = await supabase
    .from('resources')
    .select('*, steps(title, slug), categories(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <div className="admin-bar">
        <span>
          <i className="ti ti-user-circle" style={{ verticalAlign: -2, marginRight: 6 }}></i>
          Giriş yapıldı: {user.email}
        </span>
        <Link href="/admin/cikis" style={{ color: 'var(--accent)' }}>
          Çıkış
        </Link>
      </div>

      <AdminClient
        steps={steps || []}
        categories={categories || []}
        resources={resources || []}
      />
    </>
  );
}
