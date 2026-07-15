'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { getCategoryName, getCategoryColor, timeAgo } from '@/lib/helpers';

interface PostRow {
  id: number;
  title: string;
  slug: string;
  category: string;
  is_published: boolean;
  published_at: string | null;
  view_count: number;
  views7d: number;
}

interface RecentView {
  id: number;
  created_at: string;
  referrer: string | null;
  post_id: number;
  visitor_id?: string | null;
  posts?: { title: string; slug: string } | null;
}

interface AnalyticsClientProps {
  posts: PostRow[];
  recentViews: RecentView[];
  dailyTrend: { date: string; count: number }[];
  referrerBreakdown: { domain: string; count: number }[];
  totalViews: number;
  totalViews24h: number;
  totalViews7d: number;
}

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export default function AnalyticsClient({
  posts,
  recentViews: initialRecentViews,
  dailyTrend,
  referrerBreakdown,
  totalViews,
  totalViews24h,
  totalViews7d,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [recentViews, setRecentViews] = useState<RecentView[]>(initialRecentViews);
  const [tick, setTick] = useState(0);
  const [sortKey, setSortKey] = useState<'total' | 'week'>('total');

  const postsById = useMemo(() => {
    const map = new Map<number, PostRow>();
    posts.forEach((p) => map.set(p.id, p));
    return map;
  }, [posts]);

  // "Şu an aktif" listesinin zamanla solması için periyodik olarak yeniden render tetikle.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Canlı akış: yeni bir görüntülenme kaydı eklendiğinde anında haberdar ol.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-page-views')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'page_views' },
        (payload: any) => {
          const row = payload.new;
          const post = postsById.get(row.post_id);
          setRecentViews((prev) => {
            if (prev.some((v) => v.id === row.id)) return prev;
            const next: RecentView = {
              id: row.id,
              created_at: row.created_at,
              referrer: row.referrer,
              post_id: row.post_id,
              visitor_id: row.visitor_id,
              posts: post ? { title: post.title, slug: post.slug } : null,
            };
            return [next, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsById]);

  // Realtime bağlantısı koparsa diye periyodik yedek kontrol.
  useEffect(() => {
    const supabase = createClient();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('page_views')
        .select('id, created_at, referrer, post_id, visitor_id, posts(title, slug)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setRecentViews(data as any);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const activeNow = recentViews.filter((v) => Date.now() - new Date(v.created_at).getTime() < ACTIVE_WINDOW_MS);
  const activeVisitorCount = new Set(activeNow.map((v) => v.visitor_id || `view-${v.id}`)).size;

  const sortedPosts = useMemo(() => {
    const copy = [...posts];
    copy.sort((a, b) => (sortKey === 'total' ? b.view_count - a.view_count : b.views7d - a.views7d));
    return copy;
  }, [posts, sortKey]);

  const maxTrend = Math.max(1, ...dailyTrend.map((d) => d.count));
  const maxReferrer = Math.max(1, ...referrerBreakdown.map((r) => r.count));

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Okuyucu Analitiği</h1>
          <p className="admin-sub">Kim, ne okuyor — anlık ve genel görünüm</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin" className="btn btn-sm">← Yazılara dön</Link>
          <button className="btn btn-sm" onClick={() => router.refresh()}>Yenile</button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">Toplam Görüntülenme</span>
          <span className="stat-value">{totalViews}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Son 24 Saat</span>
          <span className="stat-value">{totalViews24h}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Son 7 Gün</span>
          <span className="stat-value">{totalViews7d}</span>
        </div>
        <div className="stat-card stat-card-live">
          <span className="stat-label">
            <span className="live-dot" /> Şu An Okuyor
          </span>
          <span className="stat-value">{activeVisitorCount}</span>
        </div>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">Son 14 gün</h2>
        <div className="trend-chart" role="img" aria-label="Son 14 günün günlük görüntülenme grafiği">
          {dailyTrend.map((d) => (
            <div key={d.date} className="trend-bar-col">
              <div className="trend-bar-track">
                <div
                  className="trend-bar-fill"
                  style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}
                  title={`${d.date}: ${d.count} görüntülenme`}
                />
              </div>
              <span className="trend-bar-label">{d.date.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="analytics-grid">
        <section className="admin-section">
          <h2 className="admin-section-title">
            Yazı Bazlı Görüntülenme
            <span className="analytics-sort">
              <button
                className={`btn btn-sm ${sortKey === 'total' ? 'btn-primary' : ''}`}
                onClick={() => setSortKey('total')}
              >
                Toplam
              </button>
              <button
                className={`btn btn-sm ${sortKey === 'week' ? 'btn-primary' : ''}`}
                onClick={() => setSortKey('week')}
              >
                Son 7 gün
              </button>
            </span>
          </h2>
          <div className="analytics-table">
            {sortedPosts.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>Henüz yazı yok.</p>}
            {sortedPosts.map((p) => (
              <Link key={p.id} href={`/admin/yazi/${p.id}/duzenle`} className="analytics-row">
                <div className="analytics-row-info">
                  <span
                    className="post-category"
                    style={{ background: `${getCategoryColor(p.category)}15`, color: getCategoryColor(p.category) }}
                  >
                    {getCategoryName(p.category)}
                  </span>
                  <span className="analytics-row-title">
                    {p.title}
                    {!p.is_published && <span className="draft-badge" style={{ marginLeft: 8 }}>Taslak</span>}
                  </span>
                </div>
                <div className="analytics-row-numbers">
                  <span title="Son 7 gün">{p.views7d} / 7g</span>
                  <span className="analytics-row-total" title="Toplam">{p.view_count || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="analytics-side">
          <section className="admin-section">
            <h2 className="admin-section-title">
              <span className="live-dot" /> Şu An Okunuyor
            </h2>
            {activeNow.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                Son 5 dakikada aktif okuyucu yok. Biri bir yazını açtığında burada anında görünecek.
              </p>
            ) : (
              <ul className="live-feed">
                {activeNow.map((v) => (
                  <li key={v.id} className="live-feed-item">
                    <span className="live-dot" />
                    <div>
                      <Link href={`/yazi/${v.posts?.slug || ''}`} target="_blank" className="live-feed-title">
                        {v.posts?.title || 'Bilinmeyen yazı'}
                      </Link>
                      <span className="live-feed-meta">{timeAgo(v.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Trafik Kaynağı</h2>
            {referrerBreakdown.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Son 30 günde veri yok.</p>
            ) : (
              <ul className="referrer-list">
                {referrerBreakdown.map((r) => (
                  <li key={r.domain} className="referrer-row">
                    <span className="referrer-domain">{r.domain}</span>
                    <div className="referrer-bar-track">
                      <div className="referrer-bar-fill" style={{ width: `${Math.max(4, (r.count / maxReferrer) * 100)}%` }} />
                    </div>
                    <span className="referrer-count">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Son Görüntülenmeler</h2>
            <ul className="live-feed">
              {recentViews.slice(0, 10).map((v) => (
                <li key={v.id} className="live-feed-item">
                  <div>
                    <Link href={`/yazi/${v.posts?.slug || ''}`} target="_blank" className="live-feed-title">
                      {v.posts?.title || 'Bilinmeyen yazı'}
                    </Link>
                    <span className="live-feed-meta">
                      {timeAgo(v.created_at)}
                      {v.referrer ? ` · ${safeHost(v.referrer)}` : ' · doğrudan'}
                    </span>
                  </div>
                </li>
              ))}
              {recentViews.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Henüz kayıt yok.</p>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
