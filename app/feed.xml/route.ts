import { getCategoryName } from '@/lib/helpers';
import { listYazilar } from '@/lib/public-data';
import { AUTHOR_NAME, SITE_NAME, SITE_URL } from '@/lib/site';

// Statik: derlemede üretilir, CDN'den sunulur.
export const dynamic = 'force-static';
// Saatte bir yenilenir (tek bir küçük dosya; maliyeti yok denecek kadar az).
export const revalidate = 3600;


function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = (await listYazilar()).slice(0, 50);
  const last = posts[0]?.published_at ? new Date(posts[0].published_at).toUTCString() : new Date().toUTCString();

  const items = posts.map((p) => {
    const url = `${SITE_URL}/yazi/${p.slug}`;
    return `
    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ''}
      <description>${esc(p.excerpt || p.subtitle || '')}</description>
      <category>${esc(getCategoryName(p.category))}</category>
      <dc:creator>${esc(AUTHOR_NAME)}</dc:creator>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${esc(`${AUTHOR_NAME} — denemeler ve kitap tahlilleri`)}</description>
    <language>tr-TR</language>
    <lastBuildDate>${last}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(rss, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
