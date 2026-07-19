import { createClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';
const SITE_NAME = 'Zihin Haritası';
const AUTHOR_NAME = 'Muhammet Fatih Işık';
const SITE_DESCRIPTION = 'Teknoloji, jeopolitik, bilim ve düşünce üzerine yazılar.';

export const revalidate = 3600; // 1 saat cache

function escapeXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .eq('post_type', 'yazi')
    .order('published_at', { ascending: false })
    .limit(50);

  const lastBuildDate = new Date().toUTCString();
  const latestPostDate = posts?.[0]?.published_at
    ? new Date(posts[0].published_at).toUTCString()
    : lastBuildDate;

  const items = (posts || [])
    .map((post) => {
      const url = `${SITE_URL}/yazi/${post.slug}`;
      const pubDate = new Date(post.published_at).toUTCString();
      const description = escapeXml(post.excerpt || post.subtitle || '');
      const category = escapeXml(post.category);
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      <category>${category}</category>
      <dc:creator><![CDATA[${AUTHOR_NAME}]]></dc:creator>
      ${post.cover_image_url ? `<enclosure url="${escapeXml(post.cover_image_url)}" type="image/jpeg" />` : ''}
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>tr-TR</language>
    <copyright>© ${new Date().getFullYear()} ${AUTHOR_NAME}</copyright>
    <lastBuildDate>${latestPostDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>Zihin Haritası</generator>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
