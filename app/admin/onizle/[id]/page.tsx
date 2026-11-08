import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { formatDate, getCategoryBySlug, getPostUrl, hasRealContent } from '@/lib/helpers';
import { getReadingList, wikiResolver } from '@/lib/public-data';
import Article from '@/components/article';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Önizleme', robots: { index: false, follow: false } };

// Yazının veritabanındaki son hâli (taslaklar dahil). Herkese açık sayfalar
// statik olduğu için taslaklar ve henüz yenilenmemiş değişiklikler burada görülür.
export default async function OnizlePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: post } = await supabase.from('posts').select('*').eq('id', Number(params.id)).maybeSingle();
  if (!post) notFound();

  let books: Awaited<ReturnType<typeof getReadingList>>['books'] = [];
  try { books = (await getReadingList()).books; } catch { /* bağlantılar düz kalır */ }
  const isBook = post.post_type === 'kitap_tahlili';
  const category = getCategoryBySlug(post.category);

  return (
    <>
      <div className="preview-bar">
        <span>{post.is_published ? 'Yayında' : 'Taslak'} · önizleme</span>
        <span className="preview-actions">
          {post.is_published && <Link href={getPostUrl(post)} className="btn btn-sm">Sayfası</Link>}
          <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm btn-primary">Düzenle</Link>
        </span>
      </div>
      {isBook && !hasRealContent(post.content) ? (
        <article className="article">
          <header className="article-head">
            <p className="eyebrow">Okuma listesi{post.reading_order != null && <> · #{post.reading_order}</>}</p>
            <h1 className="article-title">{post.title}</h1>
            {post.book_author && <p className="article-byline">{post.book_author}</p>}
          </header>
        </article>
      ) : (
        <Article
          post={post}
          byline={isBook ? post.book_author : null}
          resolveWiki={wikiResolver(books)}
          eyebrow={
            <>
              {isBook ? 'Kitap Tahlilleri' : category?.name}
              {post.published_at && <> · {formatDate(post.published_at)}</>}
            </>
          }
        />
      )}
    </>
  );
}
