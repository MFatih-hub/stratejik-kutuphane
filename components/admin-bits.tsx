'use client';

// components/admin-bits.tsx — statik sayfalarda yalnızca yöneticiye görünen
// küçük parçalar. Ziyaretçi için hiçbir şey çizmez ve ek kod indirmez:
// "Okudum" düğmesi (Supabase istemcisiyle birlikte) yalnızca yönetici
// çerezi varsa sonradan yüklenir.
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useIsAdmin } from '@/lib/admin-client';

const ReadToggle = dynamic(() => import('./read-toggle'), { ssr: false });

export function NavAdminLinks() {
  const admin = useIsAdmin();
  if (!admin) return null;
  return (
    <>
      <Link href="/admin/dem" className="nav-link nav-admin">Dem</Link>
      <Link href="/admin" className="nav-link nav-admin">Admin</Link>
    </>
  );
}

export function EditLink({ id }: { id: number }) {
  const admin = useIsAdmin();
  if (!admin) return null;
  return <Link href={`/admin/yazi/${id}/duzenle`} className="btn btn-sm">Düzenle</Link>;
}

/** Okuma listesindeki bir eserin durumu: ziyaretçiye işaret, yöneticiye "Okudum" düğmesi. */
export function BookState({ id, status, done, labeled = false }: { id: number; status: string | null; done: boolean; labeled?: boolean }) {
  const admin = useIsAdmin();
  if (admin) return <ReadToggle id={id} status={status} />;
  if (status === 'okunuyor' && !done) return <span className="row-tag">Okunuyor</span>;
  if (done) return labeled ? <span className="row-tag"><Check /> Okundu</span> : <Check />;
  return null;
}

function Check() {
  return (
    <svg className="check" width="15" height="12" viewBox="0 0 15 12" aria-label="Okundu" role="img">
      <path d="M1.5 6.5l4 4L13.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  const admin = useIsAdmin();
  if (!admin) return null;
  return <Link href={href} className="btn btn-sm">{children}</Link>;
}
