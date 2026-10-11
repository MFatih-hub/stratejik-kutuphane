import Link from 'next/link';
import Image from 'next/image';
import { formatDate, getCategoryColor, getCategoryName } from '@/lib/helpers';

export default function RelatedPosts({ posts, basePath = '/yazi', title = 'Bunları da okuyabilirsin' }: { posts: any[]; basePath?: string; title?: string }) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="related-posts">
      <h2 className="post-footer-title">{title}</h2>
      <div className="related-posts-grid">
        {posts.map((post) => (
          <Link key={post.id} href={`${basePath}/${post.slug}`} className="related-post-card">
            {/* Kapak yoksa boş gri kutu yerine kart sadece metinle görünür */}
            {post.cover_image_url && (
              <div className="related-post-image">
                <Image
                  src={post.cover_image_url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 700px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div className="related-post-body">
              <span
                className="post-category"
                style={{ background: `${getCategoryColor(post.category)}15`, color: getCategoryColor(post.category) }}
              >
                {getCategoryName(post.category)}
              </span>
              <h3 className="related-post-title">{post.title}</h3>
              {post.book_author && <span className="book-author">{post.book_author}</span>}
              <span className="post-date">{formatDate(post.published_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
