import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, formatDate, timeAgo } from '@/lib/helpers';

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });

  const allPosts = posts || [];
  const drafts = allPosts.filter((p) => !p.is_published);
  const published = allPosts.filter((p) => p.is_published);
  const totalViews = allPosts.reduce((sum, p) => sum + (p.view_count || 0), 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Yazı Yönetimi</h1>
          <p className="admin-sub">Tüm yazılarını buradan yönet</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/analiz" className="btn btn-sm">
            📊 Analiz
          </Link>
          <Link href="/admin/yazi/yeni" className="btn btn-primary">
            ✍️ Yeni Yazı
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">Toplam</span>
          <span className="stat-value">{allPosts.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Yayında</span>
          <span className="stat-value">{published.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Taslak</span>
          <span className="stat-value">{drafts.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Görüntülenme</span>
          <span className="stat-value">{totalViews}</span>
        </div>
      </div>

      {drafts.length > 0 && (
        <section className="admin-section">
          <h2 className="admin-section-title">
            Taslaklar <span className="count-badge">{drafts.length}</span>
          </h2>
          <div className="admin-posts">
            {drafts.map((post) => (
              <PostRow key={post.id} post={post} isDraft />
            ))}
          </div>
        </section>
      )}

      <section className="admin-section">
        <h2 className="admin-section-title">
          Yayındaki Yazılar <span className="count-badge">{published.length}</span>
        </h2>
        {published.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            Henüz yayınlanmış yazı yok. İlk yazını yaz ve yayınla.
          </p>
        ) : (
          <div className="admin-posts">
            {published.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PostRow({ post, isDraft }: { post: any; isDraft?: boolean }) {
  const category = CATEGORIES.find((c) => c.slug === post.category);
  return (
    <div className="admin-post-row">
      <div className="admin-post-info">
        <div className="admin-post-meta">
          {category && (
            <span className="post-category" style={{
              background: `${category.color}15`, color: category.color
            }}>
              {category.name}
            </span>
          )}
          {isDraft && <span className="draft-badge">Taslak</span>}
          <span className="admin-post-date">
            {isDraft ? `${timeAgo(post.updated_at)} düzenlendi` : formatDate(post.published_at)}
          </span>
          {!isDraft && (
            <span className="admin-post-views">
              👁 {post.view_count || 0}
            </span>
          )}
        </div>
        <h3 className="admin-post-title">{post.title}</h3>
        {post.subtitle && <p className="admin-post-subtitle">{post.subtitle}</p>}
      </div>
      <div className="admin-post-actions">
        <Link href={`/yazi/${post.slug}`} className="btn btn-sm">Önizle</Link>
        <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm btn-primary">
          Düzenle
        </Link>
      </div>
    </div>
  );
}
