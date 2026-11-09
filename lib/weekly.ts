// lib/weekly.ts — Pazar özeti: haftanın okuma süresi, bitenler, fişler, çekirdek
// yol ilerlemesi, gelecek haftanın önerisi ve eski bir fiş. SADECE sunucuda.
// Hem /admin/hafta sayfası hem de pazar akşamı giden e-posta bunu kullanır.
import { istanbulDay } from './reading';
import { fetchJourney } from './reading-journey';
import { isCore } from './core';
import { SITE_URL } from './site';

export type Weekly = {
  start: string; // pazartesi (YYYY-AA-GG)
  end: string; // bugün
  minutes: number;
  prevMinutes: number;
  goal: number | null;
  readingDays: number;
  byBook: { title: string; minutes: number }[];
  finished: { title: string; order: number | null }[];
  notes: { total: number; alinti: number; not: number; soru: number };
  watched: number;
  current: { title: string; order: number | null; page: string | null }[];
  core: { total: number; done: number; next: { title: string; order: number; author: string | null }[] };
  recall: { body: string; kind: string; book: string | null } | null;
};

function shiftDay(day: string, n: number) {
  const d = new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5);
  return d.toISOString().slice(0, 10);
}

function mondayOf(day: string) {
  const d = new Date(Date.parse(day + 'T00:00:00Z'));
  return shiftDay(day, -((d.getUTCDay() + 6) % 7));
}

export function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (h === 0) return `${r} dk`;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
}

export async function buildWeekly(supabase: any, now = new Date()): Promise<Weekly> {
  const end = istanbulDay(now);
  const start = mondayOf(end);
  const prevStart = shiftDay(start, -7);
  const startTs = `${start}T00:00:00+03:00`;
  const month = new Date(now.getTime() - 30 * 864e5).toISOString();

  const [sessions, days, finished, notes, goal, watched, current, oldCount] = await Promise.all([
    supabase.from('reading_sessions').select('day, minutes, post_id, posts(title)').gte('day', prevStart).limit(5000),
    supabase.from('reading_days').select('day').gte('day', start),
    supabase.from('posts').select('title, reading_order').eq('post_type', 'kitap_tahlili').gte('finished_at', startTs).order('finished_at'),
    supabase.from('notes').select('kind').gte('created_at', startTs).limit(5000),
    supabase.from('settings').select('value').eq('key', 'haftalik_hedef_dk').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'izlenenler').maybeSingle(),
    supabase.from('posts').select('title, reading_order, current_page').eq('post_type', 'kitap_tahlili').eq('reading_status', 'okunuyor').order('reading_order').limit(5),
    supabase.from('notes').select('id', { count: 'exact', head: true }).lt('created_at', month),
  ]);

  const sRows: any[] = sessions.error ? [] : sessions.data || [];
  const thisWeek = sRows.filter((r) => r.day >= start);
  const byBookMap = new Map<string, number>();
  for (const r of thisWeek) {
    const t = r.posts?.title || 'Diğer';
    byBookMap.set(t, (byBookMap.get(t) || 0) + (r.minutes || 0));
  }
  const dayset = new Set<string>([...(days.data || []).map((d: any) => d.day), ...thisWeek.map((r) => r.day)]);
  const nRows: any[] = notes.data || [];
  const w = watched.data?.value && typeof watched.data.value === 'object' ? (watched.data.value as Record<string, string>) : {};

  let core: Weekly['core'] = { total: 0, done: 0, next: [] };
  try {
    const j = await fetchJourney(supabase);
    const items = j.items.filter((i) => isCore(i.order)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    core = {
      total: items.length,
      done: items.filter((i) => i.done).length,
      next: items.filter((i) => !i.done && i.status !== 'okunuyor').slice(0, 3).map((i) => ({ title: i.title, order: i.order as number, author: i.author })),
    };
  } catch { /* önemli değil */ }

  let recall: Weekly['recall'] = null;
  const oc = oldCount.count || 0;
  if (oc > 0) {
    const off = Math.floor(Math.random() * oc);
    const { data } = await supabase.from('notes').select('body, kind, posts(title)').lt('created_at', month).order('id').range(off, off);
    const n = (data || [])[0];
    if (n) recall = { body: n.body, kind: n.kind, book: n.posts?.title || null };
  }

  return {
    start,
    end,
    minutes: thisWeek.reduce((a, r) => a + (r.minutes || 0), 0),
    prevMinutes: sRows.filter((r) => r.day < start).reduce((a, r) => a + (r.minutes || 0), 0),
    goal: typeof goal.data?.value === 'number' ? goal.data.value : null,
    readingDays: Array.from(dayset).filter((d) => d >= start && d <= end).length,
    byBook: Array.from(byBookMap, ([title, minutes]) => ({ title, minutes })).sort((a, b) => b.minutes - a.minutes),
    finished: (finished.data || []).map((p: any) => ({ title: p.title, order: p.reading_order })),
    notes: {
      total: nRows.length,
      alinti: nRows.filter((n) => n.kind === 'alinti').length,
      not: nRows.filter((n) => n.kind === 'not').length,
      soru: nRows.filter((n) => n.kind === 'soru').length,
    },
    watched: Object.values(w).filter((iso) => typeof iso === 'string' && iso >= startTs.slice(0, 10)).length,
    current: (current.data || []).map((p: any) => ({ title: p.title, order: p.reading_order, page: p.current_page })),
    core,
    recall,
  };
}

const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KIND: Record<string, string> = { alinti: 'Alıntı', not: 'Not', soru: 'Soru' };

function dateLabel(day: string) {
  return new Date(day + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

/** Tek satırlık hüküm: hedefe göre ya da geçen haftaya göre. */
export function verdict(w: Weekly): string {
  if (w.goal) {
    const pct = Math.round((w.minutes / w.goal) * 100);
    if (pct >= 100) return `Hedefin ${fmtMin(w.goal)} idi; tamamladın (%${pct}).`;
    return `Hedefin ${fmtMin(w.goal)} idi; %${pct}'ine ulaştın. Eksik: ${fmtMin(w.goal - w.minutes)}.`;
  }
  if (w.prevMinutes > 0) {
    const diff = w.minutes - w.prevMinutes;
    return diff >= 0 ? `Geçen haftadan ${fmtMin(diff)} fazla.` : `Geçen haftadan ${fmtMin(-diff)} az.`;
  }
  return w.minutes > 0 ? 'İyi bir başlangıç.' : 'Bu hafta okuma süresi kaydedilmedi.';
}

export function weeklyEmail(w: Weekly) {
  const p = (s: string) => `<p style="font-size:16px;line-height:1.6;margin:0 0 12px">${s}</p>`;
  const h = (s: string) => `<p style="margin:26px 0 8px;font-family:-apple-system,Segoe UI,sans-serif;font-size:12px;letter-spacing:.08em;color:#6e6e73;text-transform:uppercase">${s}</p>`;
  const li = (items: string[]) => `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.6">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const parts: string[] = [];
  parts.push(`<h1 style="font-family:-apple-system,Segoe UI,sans-serif;font-weight:600;font-size:28px;margin:0 0 6px">${fmtMin(w.minutes)}</h1>`);
  parts.push(p(`${dateLabel(w.start)} – ${dateLabel(w.end)} · ${w.readingDays} gün okudun. ${esc(verdict(w))}`));
  if (w.byBook.length) { parts.push(h('Neyi okudun')); parts.push(li(w.byBook.map((b) => `${esc(b.title)} · ${fmtMin(b.minutes)}`))); }
  if (w.finished.length) { parts.push(h('Biten')); parts.push(li(w.finished.map((b) => `${b.order != null ? `#${b.order} ` : ''}${esc(b.title)}`))); }
  const extra: string[] = [];
  if (w.notes.total) extra.push(`${w.notes.total} fiş (${w.notes.alinti} alıntı, ${w.notes.not} not, ${w.notes.soru} soru)`);
  if (w.watched) extra.push(`${w.watched} video izlendi`);
  if (extra.length) parts.push(p(extra.join(' · ')));
  if (w.core.total) {
    parts.push(h('Çekirdek yol'));
    parts.push(p(`${w.core.done} / ${w.core.total} eser.`));
  }
  const next = w.current.length
    ? w.current.map((b) => `${b.order != null ? `#${b.order} ` : ''}${esc(b.title)}${b.page ? ` · s. ${esc(b.page)}` : ''}`)
    : w.core.next.map((b) => `#${b.order} ${esc(b.title)}${b.author ? ` · ${esc(b.author)}` : ''}`);
  if (next.length) { parts.push(h(w.current.length ? 'Gelecek hafta devam' : 'Gelecek hafta başla')); parts.push(li(next)); }
  if (w.recall) {
    parts.push(h('Hatırla'));
    parts.push(`<blockquote style="margin:0 0 8px;padding:2px 0 2px 14px;border-left:2px solid #d2d2d7;font-size:15px;line-height:1.6;color:#1d1d1f">${esc(w.recall.body).replace(/\n/g, '<br>')}</blockquote>`);
    parts.push(`<p style="margin:0;font-size:13px;color:#6e6e73">${KIND[w.recall.kind] || 'Not'}${w.recall.book ? ` · ${esc(w.recall.book)}` : ''}</p>`);
  }
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f5f5f7;padding:28px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d1f">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:32px 30px 24px">
<p style="margin:0 0 20px;font-size:12px;letter-spacing:.08em;color:#6e6e73">ZİHİN HARİTASI · BU HAFTA</p>
${parts.join('\n')}
<p style="margin:28px 0 0"><a href="${SITE_URL}/admin/dem" style="background:#0071e3;color:#fff;text-decoration:none;padding:10px 18px;border-radius:980px;font-size:15px">Dem'i aç</a></p>
</div></body></html>`;
  const text = [
    `Bu hafta: ${fmtMin(w.minutes)} · ${w.readingDays} gün. ${verdict(w)}`,
    ...w.byBook.map((b) => `- ${b.title}: ${fmtMin(b.minutes)}`),
    w.finished.length ? `Biten: ${w.finished.map((b) => b.title).join(', ')}` : '',
    w.core.total ? `Çekirdek yol: ${w.core.done}/${w.core.total}` : '',
    `${SITE_URL}/admin/dem`,
  ].filter(Boolean).join('\n');
  return { subject: `Bu hafta ${fmtMin(w.minutes)} okudun — Zihin Haritası`, html, text };
}
