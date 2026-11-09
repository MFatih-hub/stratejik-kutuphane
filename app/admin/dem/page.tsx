import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { istanbulDay } from '@/lib/reading';
import DemClient from './dem-client';
import { fetchJourney } from '@/lib/reading-journey';

export const revalidate = 0;
export const metadata: Metadata = { title: 'Dem', robots: { index: false, follow: false } };

const BOOK_FIELDS = 'id, slug, title, book_author, reading_order, reading_module, current_page, started_at, reading_status';

/** Haftanın başı (pazartesi), YYYY-AA-GG. */
function weekStartDay(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Gün string'inden (YYYY-AA-GG) kararlı bir sayı — "Bugün hatırla" her gün başka bir fiş seçsin. */
function dayHash(day: string): number {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default async function BugunPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const today = istanbulDay();
  const now = Date.now();
  const d30 = new Date(now - 30 * 86400_000).toISOString();
  const d120 = istanbulDay(new Date(now - 119 * 86400_000));
  const week = new Date(now - 7 * 86400_000).toISOString();
  const weekStart = weekStartDay(today);
  const d28 = istanbulDay(new Date(now - 27 * 86400_000));
  const d90 = new Date(now - 90 * 86400_000).toISOString();

  // Okunmakta olanlar; şema henüz güncellenmemişse (migration v5) hata döner
  const currentRes = await supabase.from('posts').select(BOOK_FIELDS)
    .eq('post_type', 'kitap_tahlili').eq('reading_status', 'okunuyor')
    .order('reading_order', { ascending: true, nullsFirst: false }).limit(5);
  const schemaReady = !currentRes.error;
  const current = currentRes.data || [];

  let suggestion: any = null;
  if (schemaReady && current.length === 0) {
    const { data } = await supabase.from('posts').select(BOOK_FIELDS)
      .eq('post_type', 'kitap_tahlili').eq('content', '').is('reading_status', null)
      .order('reading_order', { ascending: true, nullsFirst: false }).limit(1);
    suggestion = (data || [])[0] || null;
  }

  const ids = current.map((c: any) => c.id);
  const [notesRes, waitingRes, daysRes, total, finishedAll, finished30, todayNotes, oldCount, sessionsRes, goalRes, finished90] = await Promise.all([
    ids.length
      ? supabase.from('notes').select('*').in('post_id', ids).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
    schemaReady
      ? supabase.from('posts').select('id, slug, title, book_author, reading_order, finished_at')
          .eq('post_type', 'kitap_tahlili').eq('reading_status', 'okundu')
          .order('finished_at', { ascending: true }).limit(12)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('reading_days').select('day').gte('day', d120).order('day', { ascending: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('post_type', 'kitap_tahlili'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('post_type', 'kitap_tahlili').in('reading_status', ['okundu', 'yazildi']),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('post_type', 'kitap_tahlili').in('reading_status', ['okundu', 'yazildi']).gte('finished_at', d30),
    supabase.from('notes').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00+03:00`),
    supabase.from('notes').select('id', { count: 'exact', head: true }).lt('created_at', week),
    // Okuma süreleri (migration v7); tablo yoksa hata döner, ekran süresiz çalışır
    supabase.from('reading_sessions').select('day, minutes').gte('day', weekStart < d28 ? weekStart : d28).limit(5000),
    supabase.from('settings').select('value').eq('key', 'haftalik_hedef_dk').maybeSingle(),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('post_type', 'kitap_tahlili').in('reading_status', ['okundu', 'yazildi']).gte('finished_at', d90),
  ]);

  const sessionRows: { day: string; minutes: number }[] = sessionsRes.error ? [] : (sessionsRes.data as any[]) || [];
  const sum = (rows: { minutes: number }[]) => rows.reduce((a, r) => a + (r.minutes || 0), 0);
  const time = {
    ready: !sessionsRes.error,
    week: sum(sessionRows.filter((r) => r.day >= weekStart)),
    today: sum(sessionRows.filter((r) => r.day === today)),
    avg4: Math.round(sum(sessionRows.filter((r) => r.day >= d28)) / 4),
    goal: typeof (goalRes.data as any)?.value === 'number' ? ((goalRes.data as any).value as number) : null,
  };

  // Bugün hatırla: bir haftadan eski fişlerden biri, her gün başka
  let recall: any = null;
  const oc = oldCount.count || 0;
  if (oc > 0) {
    const off = dayHash(today) % oc;
    const { data } = await supabase.from('notes')
      .select('*, posts(id, slug, title, book_author, reading_order)')
      .lt('created_at', week).order('id', { ascending: true }).range(off, off);
    recall = (data || [])[0] || null;
  }

  // Okunması biten ama henüz değerlendirmesi yazılmamış duraklar; şu anki durakta kalan eser sayısı
  let durakPrompts: string[] = [];
  let durakLeft: { name: string; left: number } | null = null;
  try {
    const [journey, sums] = await Promise.all([
      fetchJourney(supabase),
      supabase.from('posts').select('durak_summary').not('durak_summary', 'is', null),
    ]);
    const here = (current[0] || suggestion)?.reading_module || null;
    if (here) {
      const left = journey.items.filter((i) => i.module === here && !i.done).length;
      durakLeft = { name: here, left };
    }
    if (!sums.error) {
      const have = new Set((sums.data || []).map((r: any) => r.durak_summary));
      durakPrompts = journey.modules
        .filter((m) => m.total > 0 && !have.has(m.name))
        .filter((m) => journey.items.filter((i) => i.module === m.name).every((i) => i.written || i.status === 'okundu' || i.status === 'yazildi'))
        .map((m) => m.name)
        .slice(0, 2);
    }
  } catch { /* önemli değil */ }

  return (
    <DemClient
      durakPrompts={durakPrompts}
      schemaReady={schemaReady}
      today={today}
      current={current}
      suggestion={suggestion}
      notes={notesRes.data || []}
      waiting={waitingRes.data || []}
      days={(daysRes.data || []).map((d: any) => d.day)}
      stats={{
        total: total.count || 0,
        finished: finishedAll.count || 0,
        finished30: finished30.count || 0,
        todayNotes: todayNotes.count || 0,
      }}
      recall={recall}
      time={time}
      pace={{ finished90: finished90.count || 0 }}
      durakLeft={durakLeft}
    />
  );
}
