'use client';

// components/watch-tick.tsx — yalnızca yöneticiye yüklenir (bkz. watch-bits.tsx).
// İzlenen videolar settings tablosunda tek satırda tutulur:
//   key = 'izlenenler', value = { [youtubeId]: "izlendiği an (ISO)" }
// Tablo v7 ile geldi ve yalnızca yöneticiye açık (RLS).
import { useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { playlistHref } from '@/lib/watch-links';

const KEY = 'izlenenler';
type Watched = Record<string, string>;

const supabase = createClient();
let state: Watched | null = null; // ekranda görünen
let saved: Watched = {}; // sunucuda olduğu bilinen son hali
let loading = false;
let pending = 0;
let queue: Promise<void> = Promise.resolve();
let listening = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

async function load() {
  if (loading || pending > 0) return;
  loading = true;
  const { data, error } = await supabase.from('settings').select('value').eq('key', KEY).maybeSingle();
  loading = false;
  if (error) {
    // Okunamadıysa tikler kapalı kalır; boş liste sanıp eski işaretlerin üstüne yazmayalım.
    console.error('İzlenenler okunamadı:', error.message);
    if (!state) setTimeout(() => { if (subs.size) load(); }, 5000);
    return;
  }
  if (pending > 0) return; // bu arada tıklandıysa ekrandakini koru
  const v = data ? (data as { value: unknown }).value : null;
  saved = v && typeof v === 'object' && !Array.isArray(v) ? (v as Watched) : {};
  state = saved;
  emit();
}

function subscribe(f: () => void) {
  subs.add(f);
  if (!state) load();
  if (!listening) {
    listening = true;
    // Başka sekmede/cihazda işaretlenenler, sayfaya dönünce görünsün.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && subs.size) load();
    });
  }
  return () => { subs.delete(f); };
}

function useWatched(): Watched | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

function toggle(id: string) {
  if (!state) return;
  const next = { ...state };
  if (next[id]) delete next[id];
  else next[id] = new Date().toISOString();
  state = next;
  emit();
  pending++;
  // Kayıtlar sırayla gider ve her biri en son hali yazar: hızlı tıklamalarda
  // geç kalan bir istek yenisinin üstüne yazamaz.
  queue = queue.then(async () => {
    const value = state || next;
    let failed: string | null = null;
    try {
      const { error } = await supabase.from('settings').upsert({ key: KEY, value, updated_at: new Date().toISOString() });
      if (error) failed = error.message;
    } catch (e) {
      failed = e instanceof Error ? e.message : String(e);
    }
    if (failed) {
      console.error('İzlendi işareti kaydedilemedi:', failed);
      state = saved;
      emit();
    } else {
      saved = value;
    }
  }).finally(() => { pending--; });
}

/** Yuvarlak tik (Apple Anımsatıcılar gibi): boş halka = izlenmedi, dolu = izlendi. */
export function WatchTick({ id }: { id: string }) {
  const watched = useWatched();
  const on = !!watched?.[id];
  return (
    <button
      type="button"
      className={on ? 'watch-tick is-on' : 'watch-tick'}
      aria-pressed={on}
      aria-label={on ? 'İzlendi' : 'İzledim'}
      title={on ? 'İzlendi' : 'İzledim'}
      disabled={!watched}
      onClick={() => toggle(id)}
    >
      <span className="watch-tick-ring">
        {on && (
          <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
            <path d="M1.2 5.2l3.2 3.2L10.8 1.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

/** Yöneticiye: izlenmeyenleri sırayla açan düğme ve "3/16 izlendi". */
export function AdminPlay({ ids }: { ids: string[] }) {
  const watched = useWatched();
  const left = watched ? ids.filter((id) => !watched[id]) : ids;
  const done = ids.length - left.length;
  return (
    <>
      <a className="btn btn-primary" href={playlistHref(left.length ? left : ids)} target="_blank" rel="noopener noreferrer">
        {done > 0 && left.length > 0 ? 'Kalanı sırayla izle' : 'YouTube’da sırayla izle'}
      </a>
      {watched && <span className="watch-count">{left.length === 0 ? 'Hepsi izlendi' : `${done}/${ids.length} izlendi`}</span>}
    </>
  );
}
