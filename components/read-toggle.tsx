'use client';

// components/read-toggle.tsx — yalnızca yönetici görür: tahlil yazmadan
// "Okudum" deyip esere tik atar (reading_status = 'okundu'). Okunan eser
// ilerlemeye sayılır; tahlil yazmak isteğe bağlı kalır. Tekrar basınca geri alır.
// Kayıttan sonra statik sayfalar yenilenir (refreshSite).
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { markReadingDay } from '@/lib/reading';
import { refreshSite } from '@/lib/admin-client';

export default function ReadToggle({ id, status }: { id: number; status: string | null }) {
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState(status === 'okundu' || status === 'yazildi');

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const next = !read;
    const patch = next
      ? { reading_status: 'okundu', finished_at: new Date().toISOString() }
      : { reading_status: null, finished_at: null };
    const { error } = await supabase.from('posts').update(patch).eq('id', id);
    setBusy(false);
    if (error) { console.error('[okudum]', error.message); return; }
    setRead(next);
    if (next) await markReadingDay(supabase);
    refreshSite();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`read-toggle${read ? ' is-read' : ''}`}
      aria-pressed={read}
    >
      {read ? 'Okundu' : 'Okudum'}
    </button>
  );
}
