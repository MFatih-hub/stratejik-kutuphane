import Link from 'next/link';
import Image from 'next/image';
import { formatDate, getCategoryColor, getCategoryName } from '@/lib/helpers';

export default function RelatedPosts({ posts }: { posts: any[] }) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="related-posts">
      <h2 className="post-footer-title">Bunları da okuyabilirsin</h2>
      <div className="related-posts-grid">
        {posts.map((post) => (
          <Link key={post.id} href={`/yazi/${post.slug}`} className="related-post-card">
            <div className="related-post-image">
              {post.cover_image_url ? (
                <Image
                  src={post.cover_image_url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 700px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className="related-post-image-placeholder" style={{ background: `${getCategoryColor(post.category)}12` }} />
              )}
            </div>
            <div className="related-post-body">
              <span
                className="post-category"
                style={{ background: `${getCategoryColor(post.category)}15`, color: getCategoryColor(post.category) }}
              >
                {getCategoryName(post.category)}
              </span>
              <h3 className="related-post-title">{post.title}</h3>
              <span className="post-date">{formatDate(post.published_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
