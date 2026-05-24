import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminClient from './admin-client';

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/giris');

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
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

      <AdminClient resources={resources || []} />
    </>
  );
}
