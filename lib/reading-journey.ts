// lib/reading-journey.ts — Kitap Tahlilleri "okuma yolculuğu" verisi.
//
// Okuma listesindeki tüm eserleri (yayındaki kitap_tahlili kayıtları) sıra
// numarasıyla çeker, hangilerinin tahlili yazıldığını işaretler ve özet
// çıkarır: toplam/yazılan, sıradaki eser ("şu an buradayım"), son yazılan
// tahliller ve modül (durak) bazında ilerleme.
//
// Migration v4 çalıştırılmamışsa (reading_order / book_author / reading_module
// yoksa) sessizce daha az alanla çalışır.


export type JourneyItem = {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  order: number | null;
  module: string | null;
  written: boolean;
  updatedAt: string | null;
};

export type JourneyModule = {
  name: string;
  total: number;
  written: number;
  firstOrder: number | null;
  lastOrder: number | null;
};

export type Journey = {
  items: JourneyItem[];
  total: number;
  written: number;
  next: JourneyItem | null;
  lastWritten: JourneyItem | null;
  modules: JourneyModule[];
};

const PAGE = 1000;
const MAX_PAGES = 20;

async function fetchPaged(build: (from: number, to: number) => any): Promise<{ rows: any[]; error: any }> {
  const rows: any[] = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const from = p * PAGE;
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) return { rows, error };
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows, error: null };
}

const FIELD_SETS = [
  'id, slug, title, updated_at, book_author, reading_order, reading_module',
  'id, slug, title, updated_at, book_author, reading_order',
  'id, slug, title, updated_at',
];

export async function fetchJourney(supabase: any): Promise<Journey> {
  let rows: any[] = [];
  for (const fields of FIELD_SETS) {
    const hasOrder = fields.includes('reading_order');
    const res = await fetchPaged((from, to) => {
      let q = supabase.from('posts').select(fields).eq('is_published', true).eq('post_type', 'kitap_tahlili');
      q = hasOrder ? q.order('reading_order', { ascending: true, nullsFirst: false }) : q.order('published_at', { ascending: true });
      return q.order('id', { ascending: true }).range(from, to);
    });
    if (!res.error) { rows = res.rows; break; }
  }

  // Tahlili yazılanlar (içerik boş değil) — içeriği çekmeden sadece id'ler
  const writtenRes = await fetchPaged((from, to) =>
    supabase.from('posts').select('id').eq('is_published', true).eq('post_type', 'kitap_tahlili')
      .neq('content', '').order('id', { ascending: true }).range(from, to)
  );
  const writtenIds = new Set<number>(writtenRes.rows.map((r: any) => r.id));

  const items: JourneyItem[] = rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    author: r.book_author ?? null,
    order: r.reading_order ?? null,
    module: r.reading_module ? String(r.reading_module).trim() || null : null,
    written: writtenIds.has(r.id),
    updatedAt: r.updated_at ?? null,
  }));

  const written = items.filter((i) => i.written).length;
  const next = items.find((i) => !i.written && i.order !== null) || items.find((i) => !i.written) || null;

  // Modüller listede ilk görüldükleri sırayla
  const modMap = new Map<string, JourneyModule>();
  for (const it of items) {
    if (!it.module) continue;
    let m = modMap.get(it.module);
    if (!m) { m = { name: it.module, total: 0, written: 0, firstOrder: it.order, lastOrder: it.order }; modMap.set(it.module, m); }
    m.total++;
    if (it.written) m.written++;
    if (it.order !== null) {
      if (m.firstOrder === null || it.order < m.firstOrder) m.firstOrder = it.order;
      if (m.lastOrder === null || it.order > m.lastOrder) m.lastOrder = it.order;
    }
  }

  // En son tamamlanan: tahlili yazılanlar arasında en son güncellenen
  const lastWritten = items.filter((i) => i.written)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;

  return { items, total: items.length, written, next, lastWritten, modules: Array.from(modMap.values()) };
}

/** Ana sayfa için hafif özet: sayılar, sıradaki eser, son yazılan tahliller. */
export async function fetchJourneySummary(supabase: any) {
  const base = () => supabase.from('posts').select('id', { count: 'exact', head: true })
    .eq('is_published', true).eq('post_type', 'kitap_tahlili');

  const [totalRes, writtenRes] = await Promise.all([base(), base().neq('content', '')]);

  let nextRes: any = await supabase.from('posts')
    .select('slug, title, book_author, reading_order')
    .eq('is_published', true).eq('post_type', 'kitap_tahlili').eq('content', '')
    .order('reading_order', { ascending: true, nullsFirst: false }).limit(1);
  if (nextRes.error) nextRes = { data: [] };

  let recentRes: any = await supabase.from('posts')
    .select('slug, title, book_author, reading_order, updated_at')
    .eq('is_published', true).eq('post_type', 'kitap_tahlili').neq('content', '')
    .order('updated_at', { ascending: false }).limit(3);
  if (recentRes.error) {
    recentRes = await supabase.from('posts')
      .select('slug, title, updated_at')
      .eq('is_published', true).eq('post_type', 'kitap_tahlili').neq('content', '')
      .order('updated_at', { ascending: false }).limit(3);
  }

  return {
    total: totalRes.count || 0,
    written: writtenRes.count || 0,
    next: (nextRes.data || [])[0] || null,
    recent: recentRes.data || [],
  };
}
