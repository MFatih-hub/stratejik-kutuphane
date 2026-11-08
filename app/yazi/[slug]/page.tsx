import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { formatDate, getCategoryBySlug, getPostUrl } from '@/lib/helpers';
import { getPublished, getReadingList, getSeries, listYazilar, wikiResolver } from '@/lib/public-data';
import { newsletterEnabled } from '@/lib/server-env';
import Article, { SeqNav } from '@/components/article';
import { AUTHOR_NAME, SITE_URL, ogImages } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;


export async function generateStaticParams() {
  const posts = await listYazilar();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublished('yazi', params.slug);
  if (!post) return { title: 'Bulunamadı', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/yazi/${post.slug}`;
  const description = post.excerpt || post.subtitle || `${post.title} — ${AUTHOR_NAME}`;
  const images = ogImages(post.cover_image_url);
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', url, title: post.title, description, siteName: 'Zihin Haritası', locale: 'tr_TR',
      publishedTime: post.published_at, modifiedTime: post.updated_at, authors: [AUTHOR_NAME],
      images,
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: images.map((i) => i.url) },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPublished('yazi', params.slug);
  if (!post) notFound();

  const [list, series] = await Promise.all([getReadingList(), post.series ? getSeries(post.series) : Promise.resolve([])]);
  const category = getCategoryBySlug(post.category);
  const url = `${SITE_URL}/yazi/${post.slug}`;

  const idx = series.findIndex((s) => s.id === post.id);
  const prev = idx > 0 ? series[idx - 1] : null;
  const next = idx >= 0 && idx < series.length - 1 ? series[idx + 1] : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.subtitle || undefined,
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: url,
    url,
    inLanguage: 'tr-TR',
    articleSection: category?.name || post.category,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Article
        post={post}
        track
        shareUrl={url}
        subscribe={newsletterEnabled()}
        resolveWiki={wikiResolver(list.books)}
        eyebrow={
          <>
            {category && <Link href={`/kategori/${category.path}`}>{category.name}</Link>}
            {category && ' · '}
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          </>
        }
      >
        {series.length > 1 && idx >= 0 && (
          <section className="series" aria-label="Yazı dizisi">
            <p className="series-name">
              <Link href={`/dizi/${encodeURIComponent(post.series)}`}>{post.series}</Link>
              <span> · {idx + 1}/{series.length}</span>
            </p>
            <SeqNav
              label="Dizide gezin"
              prev={prev && { href: getPostUrl(prev), title: prev.title }}
              next={next && { href: getPostUrl(next), title: next.title }}
            />
          </section>
        )}
      </Article>
    </>
  );
}
