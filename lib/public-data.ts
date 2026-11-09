// lib/public-data.ts — herkese açık sayfaların bütün verisi, tek yerden.
//
// Sayfalar statik üretilir (ISR): bu fonksiyonlar ziyaretçi başına değil,
// sayfa yenilendiğinde çalışır. Bir sorgu hata verirse boş sayfa üretmek
// yerine hata fırlatılır; böylece Vercel son sağlam sürümü sunmaya devam
// eder (derlemede ise dağıtım durur, canlıdaki sürüm yerinde kalır).
import { cache } from 'react';
import { publicClient } from './supabase-public';
import { getCategoryName, stripHtml } from './helpers';
import { extractWikiLinks, resolveWikiTarget, type LinkTarget } from './reading';
import { FOOTNOTE_RE } from './render-post';

export type PostSummary = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  category: string;
  published_at: string | null;
  updated_at: string | null;
};

export type Book = {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  order: number | null;
  module: string | null;
  status: string | null;
  /** Tahlili yazıldı */
  written: boolean;
  /** Okundu: tahlili yazıldı ya da "Okudum" ile işaretlendi */
  done: boolean;
  updatedAt: string | null;
  /** Tahlilin yazıldığı an (yoksa son güncelleme) */
  writtenAt: string | null;
};

export type Durak = {
  name: string;
  index: number;
  total: number;
  done: number;
  firstOrder: number | null;
  lastOrder: number | null;
};

export type ReadingList = {
  books: Book[];
  duraks: Durak[];
  total: number;
  done: number;
  /** Tahlili yazılanlar, en yeni önce */
  written: Book[];
  /** Şu an okunanlar; yoksa sıradaki eser */
  current: Book[];
};

function fail(where: string, error: { message: string }): never {
  throw new Error(`[veri] ${where}: ${error.message}`);
}

async function paged<T>(
  where: string,
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) fail(where, error);
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const POST_LIST_FIELDS = 'id, slug, title, subtitle, excerpt, category, published_at, updated_at';

/** Yayındaki yazılar (içerik olmadan), en yeni önce. */
export const listYazilar = cache(async (): Promise<PostSummary[]> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select(POST_LIST_FIELDS)
    .eq('is_published', true)
    .eq('post_type', 'yazi')
    .order('published_at', { ascending: false })
    .limit(1000);
  if (error) fail('yazılar', error);
  return (data || []) as PostSummary[];
});

/** Yayındaki tek bir yazı ya da tahlil (tam satır). */
export const getPublished = cache(async (type: 'yazi' | 'kitap_tahlili', slug: string): Promise<any | null> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('post_type', type)
    .eq('is_published', true)
    .limit(1);
  if (error) fail('yazı', error);
  return (data || [])[0] || null;
});

const BOOK_FIELDS = 'id, slug, title, book_author, reading_order, reading_module, reading_status, updated_at';

/** Okuma listesi: bütün eserler, duraklar, ilerleme. */
export const getReadingList = cache(async (): Promise<ReadingList> => {
  const db = publicClient();
  const [rows, writtenRows] = await Promise.all([
    paged<any>('okuma listesi', (a, b) =>
      db.from('posts').select(BOOK_FIELDS)
        .eq('is_published', true).eq('post_type', 'kitap_tahlili')
        .order('reading_order', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(a, b)),
    // written_at SUPABASE-MIGRATION-v6.sql ile geldi; yoksa yalnızca kimlikler
    paged<{ id: number; written_at?: string | null }>('tahliller', (a, b) =>
      db.from('posts').select('id, written_at')
        .eq('is_published', true).eq('post_type', 'kitap_tahlili').neq('content', '')
        .order('id', { ascending: true })
        .range(a, b))
      .catch(() => paged<{ id: number }>('tahliller', (a, b) =>
        db.from('posts').select('id')
          .eq('is_published', true).eq('post_type', 'kitap_tahlili').neq('content', '')
          .order('id', { ascending: true })
          .range(a, b))),
  ]);

  const writtenAt = new Map<number, string | null>(
    writtenRows.map((r: { id: number; written_at?: string | null }) => [r.id, r.written_at ?? null] as [number, string | null]),
  );
  const books: Book[] = rows.map((r) => {
    const written = writtenAt.has(r.id);
    const status = r.reading_status ?? null;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      author: r.book_author ?? null,
      order: r.reading_order ?? null,
      module: r.reading_module ? String(r.reading_module).trim() || null : null,
      status,
      written,
      done: written || status === 'okundu' || status === 'yazildi',
      updatedAt: r.updated_at ?? null,
      writtenAt: written ? writtenAt.get(r.id) || r.updated_at || null : null,
    };
  });

  const byName = new Map<string, Durak>();
  for (const b of books) {
    if (!b.module) continue;
    let d = byName.get(b.module);
    if (!d) {
      d = { name: b.module, index: byName.size + 1, total: 0, done: 0, firstOrder: b.order, lastOrder: b.order };
      byName.set(b.module, d);
    }
    d.total++;
    if (b.done) d.done++;
    if (b.order != null) {
      if (d.firstOrder == null || b.order < d.firstOrder) d.firstOrder = b.order;
      if (d.lastOrder == null || b.order > d.lastOrder) d.lastOrder = b.order;
    }
  }

  const reading = books.filter((b) => b.status === 'okunuyor');
  const next = books.find((b) => !b.done && b.order != null) || books.find((b) => !b.done) || null;
  const written = books.filter((b) => b.written)
    .sort((a, b) => String(b.writtenAt || '').localeCompare(String(a.writtenAt || '')));

  return {
    books,
    duraks: Array.from(byName.values()),
    total: books.length,
    done: books.filter((b) => b.done).length,
    written,
    current: reading.length ? reading : next ? [next] : [],
  };
});

/** Durak adı → durak (yoksa null). */
export async function findDurak(name: string) {
  const list = await getReadingList();
  const durak = list.duraks.find((d) => d.name === name) || null;
  if (!durak) return null;
  return {
    list,
    durak,
    books: list.books.filter((b) => b.module === name),
    prev: list.duraks[durak.index - 2] || null,
    next: list.duraks[durak.index] || null,
  };
}

export const durakHref = (name: string) => `/durak/${encodeURIComponent(name)}`;
export const bookHref = (slug: string) => `/kitap-tahlilleri/${slug}`;

/**
 * [[eser]] bağlantılarını sayfa üretilirken çözer: eserin sayfasına gider,
 * bulunamazsa düz metin kalır. [[#123]] gibi sayılı bağlantılarda eserin adı yazılır.
 */
export function wikiResolver(books: Book[]) {
  const targets: LinkTarget[] = books.map((b) => ({ id: b.id, slug: b.slug, title: b.title, author: b.author, order: b.order }));
  return (label: string) => {
    const hit = resolveWikiTarget(label, targets);
    if (!hit) return null;
    return { href: bookHref(hit.slug), text: /^#?\s*\d+$/.test(label) ? hit.title : undefined };
  };
}

type WikiSource = { id: number; slug: string; title: string; post_type: string; book_author: string | null; reading_order: number | null; links: string[] };

/** [[...]] içeren yayındaki yazı ve tahliller (yalnızca bağlantıları). */
const listWikiSources = cache(async (): Promise<WikiSource[]> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select('id, slug, title, post_type, book_author, reading_order, content')
    .eq('is_published', true)
    .in('post_type', ['yazi', 'kitap_tahlili'])
    .ilike('content', '%[[%')
    .limit(300);
  if (error) fail('bağlantılar', error);
  return (data || []).map((r: any) => ({
    id: r.id, slug: r.slug, title: r.title, post_type: r.post_type,
    book_author: r.book_author ?? null, reading_order: r.reading_order ?? null,
    links: extractWikiLinks(String(r.content || '').replace(/<[^>]+>/g, ' ')),
  }));
});

/** Bu esere [[...]] ile değinen yazı ve tahliller. */
export async function getBacklinks(book: { id: number }, books: Book[]) {
  const sources = await listWikiSources();
  const targets: LinkTarget[] = books.map((b) => ({ id: b.id, slug: b.slug, title: b.title, author: b.author, order: b.order }));
  return sources.filter((s) => s.id !== book.id && s.links.some((l) => resolveWikiTarget(l, targets)?.id === book.id));
}

// Dizi ve durak değerlendirmesi alanları SUPABASE-MIGRATION-v6.sql ile geldi;
// göç çalıştırılmamışsa bu sorgular hata verir ve sessizce boş döner.

export type SeriesItem = { id: number; slug: string; title: string; subtitle: string | null; excerpt: string | null; post_type: string; published_at: string | null };

export const getSeries = cache(async (name: string): Promise<SeriesItem[]> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select('id, slug, title, subtitle, excerpt, post_type, published_at, series_order')
    .eq('series', name)
    .eq('is_published', true)
    .order('series_order', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: true })
    .limit(200);
  if (error) return [];
  return (data || []) as SeriesItem[];
});

export const listSeriesNames = cache(async (): Promise<string[]> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select('series')
    .eq('is_published', true)
    .not('series', 'is', null)
    .limit(1000);
  if (error) return [];
  return Array.from(new Set((data || []).map((r: any) => String(r.series)).filter(Boolean)));
});

export const getDurakSummaries = cache(async (name: string): Promise<PostSummary[]> => {
  const { data, error } = await publicClient()
    .from('posts')
    .select(POST_LIST_FIELDS)
    .eq('durak_summary', name)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return (data || []) as PostSummary[];
});

/** Site araması için hafif dizin: yazılar ve okuma listesindeki bütün eserler. */
export async function getSearchIndex() {
  const [posts, list] = await Promise.all([listYazilar(), getReadingList()]);
  return [
    ...posts.map((p) => ({ t: p.title, s: getCategoryName(p.category), u: `/yazi/${p.slug}` })),
    ...list.books.map((b) => ({
      t: b.title,
      s: [b.author, b.order != null ? `#${b.order}` : null, b.written ? 'Tahlil' : null].filter(Boolean).join(' · '),
      u: bookHref(b.slug),
    })),
  ];
}

// ---------- Ana sayfanın öne çıkan yazısı ----------

export type Feature = {
  kind: 'yazi' | 'tahlil';
  href: string;
  title: string;
  sub: string | null;
  date: string | null;
  excerpt: string | null;
  isNew: boolean;
};

/** HTML'nin ilk paragraflarından düz bir giriş metni (dipnot ve [[bağlantı]] işaretleri olmadan). */
function leadText(html?: string | null, max = 320): string | null {
  if (!html) return null;
  html = html.replace(FOOTNOTE_RE, '');
  const clean = (s: string) =>
    stripHtml(
      s
        .replace(/<sup[\s\S]*?<\/sup>/gi, '')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, (_m, label: string) => (/^#?\s*\d+$/.test(label.trim()) ? '' : label)),
    );
  const paras = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => clean(m[1])).filter(Boolean);
  const text = (paras.length ? paras.slice(0, 3).join(' ') : clean(html)).trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 200)).replace(/[\s,;:.\-–—(]+$/, '') + '…';
}

/** En son yayımlanan yazı ya da tahlil; giriş metniyle birlikte. */
export const getFeature = cache(async (): Promise<Feature | null> => {
  const [posts, list] = await Promise.all([listYazilar(), getReadingList()]);
  const y = posts[0] || null;
  const t = list.written[0] || null;
  if (!y && !t) return null;
  const useYazi = !!y && (!t || String(y.published_at || '') >= String(t.writtenAt || ''));
  const post = useYazi ? await getPublished('yazi', y!.slug) : await getPublished('kitap_tahlili', t!.slug);
  const date = useYazi ? y!.published_at : t!.writtenAt;
  return {
    kind: useYazi ? 'yazi' : 'tahlil',
    href: useYazi ? `/yazi/${y!.slug}` : bookHref(t!.slug),
    title: useYazi ? y!.title : t!.title,
    sub: useYazi ? y!.subtitle || null : t!.author,
    date,
    excerpt: leadText(post?.content) || post?.excerpt || null,
    isNew: !!date && Date.now() - new Date(date).getTime() < 30 * 864e5,
  };
});

