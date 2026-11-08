import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { formatDate, getPostUrl, hasRealContent } from '@/lib/helpers';
import { bookHref, durakHref, getBacklinks, getPublished, getReadingList, wikiResolver } from '@/lib/public-data';
import { newsletterEnabled } from '@/lib/server-env';
import Article, { SeqNav } from '@/components/article';
import { BookState } from '@/components/admin-bits';
import { AUTHOR_NAME, SITE_URL, ogImages } from '@/lib/site';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;


// Tahlili yazılanlar derlemede üretilir; okuma listesindeki diğer eserlerin
// sade sayfası ilk ziyarette üretilip önbelleğe alınır.
export async function generateStaticParams() {
  const list = await getReadingList();
  return list.written.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublished('kitap_tahlili', params.slug);
  if (!post) return { title: 'Bulunamadı', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/kitap-tahlilleri/${post.slug}`;
  const written = hasRealContent(post.content);
  const description = post.excerpt || post.subtitle
    || (post.book_author ? `${post.book_author} — ${post.title} üzerine tahlil` : `${post.title} — ${AUTHOR_NAME}`);
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    // Tahlili yazılmamış eserler arama motorlarında boş sayfa olarak görünmesin
    ...(written ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: 'article', url, title: post.title, description, siteName: 'Zihin Haritası', locale: 'tr_TR',
      publishedTime: post.published_at, modifiedTime: post.updated_at, authors: [AUTHOR_NAME],
      images: ogImages(post.cover_image_url),
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: ogImages(post.cover_image_url).map((i) => i.url) },
  };
}

export default async function TahlilPage({ params }: { params: { slug: string } }) {
  const post = await getPublished('kitap_tahlili', params.slug);
  if (!post) notFound();

  const list = await getReadingList();
  const i = list.books.findIndex((b) => b.id === post.id);
  const book = list.books[i] || null;
  const prev = i > 0 ? list.books[i - 1] : null;
  const next = i >= 0 && i < list.books.length - 1 ? list.books[i + 1] : null;
  const seq = (
    <SeqNav
      label="Okuma listesinde gezin"
      prev={prev && { href: bookHref(prev.slug), title: prev.title, note: prev.order != null ? `#${prev.order}` : null }}
      next={next && { href: bookHref(next.slug), title: next.title, note: next.order != null ? `#${next.order}` : null }}
    />
  );
  const durak = post.reading_module ? (
    <Link href={`${durakHref(post.reading_module)}${post.reading_order != null ? `#eser-${post.reading_order}` : ''}`}>
      {post.reading_module}
    </Link>
  ) : null;

  if (!hasRealContent(post.content)) {
    return (
      <article className="article">
        <header className="article-head">
          <p className="eyebrow">
            <Link href="/kitap-tahlilleri">Okuma listesi</Link>
            {post.reading_order != null && <> · #{post.reading_order}</>}
            {durak && <> · {durak}</>}
          </p>
          <h1 className="article-title">{post.title}</h1>
          {post.book_author && <p className="article-byline">{post.book_author}</p>}
          {book && (
            <div className="article-state">
              <BookState id={book.id} status={book.status} done={book.done} labeled />
            </div>
          )}
        </header>
        {seq}
      </article>
    );
  }

  const url = `${SITE_URL}/kitap-tahlilleri/${post.slug}`;
  const backlinks = await getBacklinks(post, list.books);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.subtitle || undefined,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: url,
    url,
    inLanguage: 'tr-TR',
    ...(post.book_author ? { about: { '@type': 'Book', name: post.title, author: { '@type': 'Person', name: post.book_author } } } : {}),
    articleSection: 'Kitap Tahlilleri',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Article
        post={post}
        track
        shareUrl={url}
        subscribe={newsletterEnabled()}
        byline={post.book_author}
        resolveWiki={wikiResolver(list.books)}
        eyebrow={
          <>
            <Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link>
            {' · '}
            <time dateTime={post.written_at || post.published_at}>{formatDate(post.written_at || post.published_at)}</time>
          </>
        }
      >
        {backlinks.length > 0 && (
          <section className="section" aria-labelledby="degenler">
            <h2 className="section-title section-title-sm" id="degenler">Bu esere değinenler</h2>
            <div className="group">
              {backlinks.map((b) => (
                <Link key={b.id} href={getPostUrl(b)} className="row">
                  <span className="row-main">
                    <span className="row-title">{b.title}</span>
                    {b.book_author && <span className="row-sub">{b.book_author}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {(durak || post.reading_order != null) && (
          <p className="article-place">
            Okuma listesinde{post.reading_order != null && <> #{post.reading_order}</>}{durak && <> · {durak}</>}
          </p>
        )}
        {seq}
      </Article>
    </>
  );
}
