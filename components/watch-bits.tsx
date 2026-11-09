'use client';

// İzleme listesinin yöneticiye özel parçaları: ziyaretçide yalnızca bağlantı
// çizilir, Supabase istemcisi indirilmez.
import dynamic from 'next/dynamic';
import { useIsAdmin } from '@/lib/admin-client';
import { playlistHref } from '@/lib/watch-links';

const PLAY_LABEL = 'YouTube’da sırayla izle';

const Tick = dynamic(() => import('./watch-tick').then((m) => m.WatchTick), {
  ssr: false,
  loading: () => (
    <span className="watch-tick is-wait" aria-hidden="true"><span className="watch-tick-ring" /></span>
  ),
});
const AdminPlay = dynamic(() => import('./watch-tick').then((m) => m.AdminPlay), {
  ssr: false,
  loading: () => <span className="btn btn-primary" aria-hidden="true">{PLAY_LABEL}</span>,
});

export function WatchTickSlot({ id }: { id: string }) {
  const admin = useIsAdmin();
  return admin ? <Tick id={id} /> : null;
}

export function WatchPlay({ ids }: { ids: string[] }) {
  const admin = useIsAdmin();
  if (admin) return <AdminPlay ids={ids} />;
  return (
    <a className="btn btn-primary" href={playlistHref(ids)} target="_blank" rel="noopener noreferrer">
      {PLAY_LABEL}
    </a>
  );
}
