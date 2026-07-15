import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AnalyticsClient from './analytics-client';

export const revalidate = 0;

function getSiteHost(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: posts }, { data: recentViews }, { data: last30dViews }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, slug, category, is_published, published_at, view_count')
      .order('view_count', { ascending: false }),
    supabase
      .from('page_views')
      .select('id, created_at, referrer, post_id, visitor_id, posts(title, slug)')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('page_views')
      .select('post_id, created_at, referrer')
      .gte('created_at', since30d)
      .limit(5000),
  ]);

  const allPosts = posts || [];
  const views30d = last30dViews || [];
  const siteHost = getSiteHost();

  // Günlük trend (son 14 gün)
  const dayBuckets: Record<string, number> = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  views30d.forEach((v: any) => {
    const day = String(v.created_at).slice(0, 10);
    if (day in dayBuckets) dayBuckets[day]++;
  });
  const dailyTrend = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  // Referrer kırılımı (son 30 gün)
  const referrerCounts: Record<string, number> = {};
  views30d.forEach((v: any) => {
    let key = 'Doğrudan / bilinmiyor';
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, '');
        if (host && host !== siteHost) key = host;
      } catch {
        // geçersiz referrer, "Doğrudan" say
      }
    }
    referrerCounts[key] = (referrerCounts[key] || 0) + 1;
  });
  const referrerBreakdown = Object.entries(referrerCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Yazı başına son 7 gün
  const sevenDaysAgoMs = Date.now() - 7 * 86400000;
  const last7dByPost: Record<number, number> = {};
  views30d.forEach((v: any) => {
    if (new Date(v.created_at).getTime() >= sevenDaysAgoMs) {
      last7dByPost[v.post_id] = (last7dByPost[v.post_id] || 0) + 1;
    }
  });

  const totalViews = allPosts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0);
  const totalViews24h = views30d.filter((v: any) => Date.now() - new Date(v.created_at).getTime() < 86400000).length;
  const totalViews7d = views30d.filter((v: any) => Date.now() - new Date(v.created_at).getTime() < 7 * 86400000).length;

  return (
    <AnalyticsClient
      posts={allPosts.map((p: any) => ({ ...p, views7d: last7dByPost[p.id] || 0 }))}
      recentViews={recentViews || []}
      dailyTrend={dailyTrend}
      referrerBreakdown={referrerBreakdown}
      totalViews={totalViews}
      totalViews24h={totalViews24h}
      totalViews7d={totalViews7d}
    />
  );
}
