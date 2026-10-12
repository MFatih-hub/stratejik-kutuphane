import Link from 'next/link';
import { getPostUrl } from '@/lib/helpers';

/** Yazı bir dizinin parçasıysa: dizinin bütün bölümleri, bu bölüm vurgulu. */
export default async function SeriesBox({ supabase, post, isAdmin }: { supabase: any; post: any; isAdmin: boolean }) {
  if (!post.series) return null;
  let q = supabase.from('posts').select('id, slug, title, post_type, series_order, is_published').eq('series', post.series);
  if (!isAdmin) q = q.eq('is_published', true);
  const { data, error } = await q.order('series_order', { ascending: true, nullsFirst: false }).order('published_at', { ascending: true }).limit(100);
  if (error || !data || data.length < 1) return null;
  const idx = data.findIndex((p: any) => p.id === post.id);
  const prev = idx > 0 ? data[idx - 1] : null;
  const next = idx >= 0 && idx < data.length - 1 ? data[idx + 1] : null;
  return (
    <aside className="series-box" aria-label="Yazı dizisi">
      <p className="series-kicker">
        Dizi · <Link href={`/dizi/${encodeURIComponent(post.series)}`}>{post.series}</Link>
        {idx >= 0 && <span className="series-pos"> · {idx + 1}/{data.length}</span>}
      </p>
      <ol className="series-list">
        {data.map((p: any) => (
          <li key={p.id} className={p.id === post.id ? 'is-current' : ''}>
            {p.id === post.id ? <span>{p.title}</span> : <Link href={getPostUrl(p)}>{p.title}</Link>}
            {!p.is_published && <span className="series-draft"> (taslak)</span>}
          </li>
        ))}
      </ol>
      {(prev || next) && (
        <div className="series-nav">
          {prev ? <Link href={getPostUrl(prev)}>← {prev.title}</Link> : <span />}
          {next ? <Link href={getPostUrl(next)}>{next.title} →</Link> : <span />}
        </div>
      )}
    </aside>
  );
}
