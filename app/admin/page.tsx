import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES, POST_TYPES, getPostTypeInfo, getPostUrl, formatDate, timeAgo } from '@/lib/helpers';

export const revalidate = 0;

const VALID_TABS = ['tumu', 'yazi', 'kitap_tahlili', 'okuma_bulteni'];

export default async function AdminPage({ searchParams }: { searchParams: { tur?: string } }) {
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

  const activeTab = searchParams?.tur && VALID_TABS.includes(searchParams.tur) ? searchParams.tur : 'tumu';
  const filterByTab = (list: any[]) => (activeTab === 'tumu' ? list : list.filter((p) => (p.post_type || 'yazi') === activeTab));
  const visibleDrafts = filterByTab(drafts);
  const visiblePublished = filterByTab(published);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">İçerik Yönetimi</h1>
          <p className="admin-sub">Yazılarını, kitap tahlillerini ve okuma bülteni linklerini buradan yönet</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/analiz" className="btn btn-sm">📊 Analiz</Link>
          <Link href="/admin/okuma-bulteni/toplu-ekle" className="btn btn-sm">🔗 Bülten: Toplu Ekle</Link>
          <Link href="/admin/yazi/yeni?tur=kitap_tahlili" className="btn btn-sm">📚 Yeni Kitap Tahlili</Link>
          <Link href="/admin/yazi/yeni?tur=okuma_bulteni" className="btn btn-sm">🔗 Yeni Bülten Linki</Link>
          <Link href="/admin/yazi/yeni" className="btn btn-primary">✍️ Yeni Yazı</Link>
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

      <div className="admin-tabs" role="tablist" aria-label="İçerik türüne göre filtrele">
        <Link href="/admin" className={`admin-tab${activeTab === 'tumu' ? ' admin-tab-active' : ''}`}>
          Tümü <span className="count-badge">{allPosts.length}</span>
        </Link>
        {POST_TYPES.map((t) => {
          const count = allPosts.filter((p) => (p.post_type || 'yazi') === t.value).length;
          return (
            <Link key={t.value} href={`/admin?tur=${t.value}`} className={`admin-tab${activeTab === t.value ? ' admin-tab-active' : ''}`}>
              {t.pluralLabel} <span className="count-badge">{count}</span>
            </Link>
          );
        })}
      </div>

      {visibleDrafts.length > 0 && (
        <section className="admin-section">
          <h2 className="admin-section-title">
            Taslaklar <span className="count-badge">{visibleDrafts.length}</span>
          </h2>
          <div className="admin-posts">
            {visibleDrafts.map((post) => (
              <PostRow key={post.id} post={post} isDraft />
            ))}
          </div>
        </section>
      )}

      <section className="admin-section">
        <h2 className="admin-section-title">
          Yayındaki İçerikler <span className="count-badge">{visiblePublished.length}</span>
        </h2>
        {visiblePublished.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            {activeTab === 'tumu' ? 'Henüz yayınlanmış içerik yok.' : 'Bu türde henüz yayınlanmış içerik yok.'}
          </p>
        ) : (
          <div className="admin-posts">
            {visiblePublished.map((post) => (
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
  const typeInfo = getPostTypeInfo(post.post_type);
  const isBulletin = post.post_type === 'okuma_bulteni';
  const hasComment = isBulletin && post.content && post.content.replace(/<[^>]+>/g, '').trim().length > 0;
  return (
    <div className="admin-post-row">
      <div className="admin-post-info">
        <div className="admin-post-meta">
          {post.post_type && post.post_type !== 'yazi' && (
            <span className="type-badge">{typeInfo.label}</span>
          )}
          {category && (
            <span className="post-category" style={{
              background: `${category.color}15`, color: category.color
            }}>
              {category.name}
            </span>
          )}
          {isDraft && <span className="draft-badge">Taslak</span>}
          {isBulletin && !isDraft && (
            <span className="draft-badge" style={{ background: hasComment ? undefined : '#f0e6d6' }}>
              {hasComment ? '💬 Yorumlu' : 'Yorum yok'}
            </span>
          )}
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
        {isBulletin && post.source_name && (
          <p className="admin-post-subtitle">Kaynak: {post.source_name}</p>
        )}
      </div>
      <div className="admin-post-actions">
        <Link href={getPostUrl(post)} className="btn btn-sm">Önizle</Link>
        <Link href={`/admin/yazi/${post.id}/duzenle`} className="btn btn-sm btn-primary">
          {isBulletin && !hasComment ? 'Yorum ekle' : 'Düzenle'}
        </Link>
      </div>
    </div>
  );
}
