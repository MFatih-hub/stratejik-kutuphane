import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate } from '@/lib/helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShareButtons from '@/components/share-buttons';

export const revalidate = 60;

export default async function PostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  let query = supabase.from('posts').select('*').eq('slug', params.slug);
  if (!isAdmin) query = query.eq('is_published', true);
  const { data: post } = await query.single();

  if (!post) notFound();

  if (post.is_published && !isAdmin) {
    await supabase.from('posts').update({ view_count: (post.view_count || 0) + 1 }).eq('id', post.id);
  }

  const category = CATEGORIES.find((c) => c.slug === post.category);
  const url = typeof window !== 'undefined' ? window.location.href : `/yazi/${post.slug}`;

  return (
    <article className="post-detail">
      <nav className="breadcrumb">
        <Link href="/">Ana sayfa</Link>
        <span className="breadcrumb-sep">›</span>
        {category && (
          <>
            <Link href={`/kategori/${category.slug}`}>{category.name}</Link>
            <span className="breadcrumb-sep">›</span>
          </>
        )}
        <span>{post.title}</span>
      </nav>

      {isAdmin && (
        <div className="admin-bar">
          <span>
            {post.is_published ? '✓ Yayında' : '⚠ Taslak'} ·{' '}
            {post.view_count || 0} görüntülenme
          </span>
          <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm">
            Düzenle
          </Link>
        </div>
      )}

      <header className="post-header">
        {category && (
          <Link href={`/kategori/${category.slug}`} className="post-category-large"
            style={{ background: `${category.color}15`, color: category.color }}>
            {category.name}
          </Link>
        )}
        <h1 className="post-title">{post.title}</h1>
        {post.subtitle && <p className="post-subtitle">{post.subtitle}</p>}
        <div className="post-byline">
          <div className="author-avatar">M</div>
          <div className="author-info">
            <span className="author-name">Muhammet Fatih Işık</span>
            <span className="post-byline-meta">
              {formatDate(post.published_at)} · {post.reading_minutes} dk okuma
            </span>
          </div>
        </div>
      </header>

      {post.cover_image_url && (
        <div className="post-cover">
          <img src={post.cover_image_url} alt={post.title} />
        </div>
      )}

      <div className="post-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag: string) => (
            <span key={tag} className="post-tag">#{tag}</span>
          ))}
        </div>
      )}

      <footer className="post-footer">
        <h3 className="post-footer-title">Bu yazıyı paylaş</h3>
        <ShareButtons url={url} title={post.title} />
      </footer>
    </article>
  );
}
