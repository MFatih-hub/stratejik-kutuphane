// lib/backup.ts — sitenin tamamını tek bir ZIP dosyasına koyar.
// SADECE sunucuda kullan.
//
// ZIP içeriği:
//   BENIOKU.txt
//   yazilar/…md             içeriği olan her yazı ve tahlil (taslaklar dahil)
//   notlar/…md              her eserin okuma fişleri
//   veri/*.json             tabloların ham dökümü (geri yüklemek için)
import { zipSync, strToU8 } from 'fflate';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasRealContent } from './helpers';
import { notesToMarkdown, postToMarkdown, type NoteRow } from './export';

async function fetchAll(supabase: SupabaseClient, table: string, select = '*', order = 'id'): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).order(order, { ascending: true }).range(from, from + 999);
    if (error) {
      if (from === 0) return []; // tablo yoksa (migration çalıştırılmamış) atla
      break;
    }
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const slugPart = (s: string) => (s || '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 70);

export async function buildBackupZip(supabase: SupabaseClient): Promise<{ zip: Uint8Array; summary: string }> {
  const [posts, notes, readingDays, readingLog, subscribers] = await Promise.all([
    fetchAll(supabase, 'posts'),
    fetchAll(supabase, 'notes'),
    fetchAll(supabase, 'reading_days', '*', 'day'),
    fetchAll(supabase, 'reading_log'),
    fetchAll(supabase, 'subscribers', 'email, confirmed_at, unsubscribed_at, created_at'),
  ]);

  const files: Record<string, Uint8Array> = {};
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);

  let written = 0;
  for (const p of posts) {
    if (!hasRealContent(p.content)) continue;
    written++;
    const dir = p.post_type === 'kitap_tahlili' ? 'yazilar/kitap-tahlilleri' : 'yazilar/yazilar';
    const prefix = p.post_type === 'kitap_tahlili' && p.reading_order != null ? `${String(p.reading_order).padStart(4, '0')}-` : '';
    files[`${dir}/${prefix}${slugPart(p.slug) || p.id}.md`] = strToU8(postToMarkdown(p));
  }

  const byPost = new Map<number, NoteRow[]>();
  for (const n of notes) {
    if (!byPost.has(n.post_id)) byPost.set(n.post_id, []);
    byPost.get(n.post_id)!.push(n);
  }
  const postById = new Map(posts.map((p) => [p.id, p]));
  for (const [pid, list] of byPost) {
    const book = postById.get(pid) || { title: `Eser ${pid}`, slug: String(pid) };
    const prefix = book.reading_order != null ? `${String(book.reading_order).padStart(4, '0')}-` : '';
    files[`notlar/${prefix}${slugPart(book.slug) || pid}.md`] = strToU8(notesToMarkdown(book, list));
  }

  files['veri/posts.json'] = strToU8(JSON.stringify(posts, null, 1));
  files['veri/notes.json'] = strToU8(JSON.stringify(notes, null, 1));
  files['veri/reading_days.json'] = strToU8(JSON.stringify(readingDays));
  if (readingLog.length) files['veri/reading_log.json'] = strToU8(JSON.stringify(readingLog));
  if (subscribers.length) files['veri/subscribers.json'] = strToU8(JSON.stringify(subscribers, null, 1));

  const summary = `${written} yazı/tahlil, ${notes.length} fiş, ${posts.length} kayıt (okuma listesi dahil), ${readingDays.length} okuma günü`;
  files['BENIOKU.txt'] = strToU8(
    [
      'Zihin Haritası — tam yedek',
      `Tarih: ${now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
      '',
      summary,
      '',
      'yazilar/  — içeriği olan her yazı ve kitap tahlili, Markdown olarak (taslaklar dahil).',
      '            Her dosyanın başında başlık, tarih, etiketler gibi bilgiler var.',
      'notlar/   — her eserin okuma fişleri (alıntı, not, soru), sayfa sırasıyla.',
      'veri/     — veritabanı tablolarının ham dökümü (JSON). Site bozulursa veya',
      '            başka bir yere taşınırsa her şey buradan geri yüklenebilir.',
      '',
      'Markdown dosyaları herhangi bir metin düzenleyicide, Obsidian\'da ya da',
      'Typora gibi programlarda açılabilir.',
    ].join('\n')
  );

  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [`zihin-haritasi-yedek-${stamp}/${k}`, v])), { level: 6 });
  return { zip, summary };
}
