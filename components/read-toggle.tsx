'use client';

// components/read-toggle.tsx — yalnızca yönetici görür: tahlil yazmadan
// "Okudum" deyip esere tik atar (reading_status = 'okundu'). Okunan eser
// ilerlemeye sayılır; tahlil yazmak isteğe bağlı kalır. Tekrar basınca geri alır.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { markReadingDay } from '@/lib/reading';

export default function ReadToggle({ id, status }: { id: number; status: string | null }) {
  const router = useRouter();
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
    if (error) { alertless(error.message); return; }
    setRead(next);
    if (next) await markReadingDay(supabase);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`read-toggle${read ? ' is-read' : ''}`}
      title={read ? 'Okundu — geri almak için tıkla' : 'Okudum olarak işaretle'}
      aria-pressed={read}
    >
      {read ? '✓ Okundu' : 'Okudum'}
    </button>
  );
}

function alertless(msg: string) {
  // Tarayıcı diyaloğu açmadan hatayı konsola yaz
  console.error('[okudum]', msg);
}
