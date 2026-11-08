'use client';

import { useEffect } from 'react';
import { getVisitorId } from '@/lib/visitor';
import { hasAdminCookie } from '@/lib/admin-client';

/**
 * Görünmez: yazı açıldığında görüntülenmeyi kaydeder (SUPABASE-MIGRATION-v2.sql
 * içindeki record_post_view()). İstek doğrudan Supabase'e gider; Vercel'de
 * fonksiyon çalıştırmaz ve tarayıcıya Supabase kütüphanesi indirmez.
 * Yöneticinin kendi okumaları sayılmaz.
 */
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (hasAdminCookie()) return;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const visitorId = getVisitorId();
    if (!base || !key || !visitorId) return;
    fetch(`${base}/rest/v1/rpc/record_post_view`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_slug: slug,
        p_visitor_id: visitorId,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
      }),
    }).catch(() => { /* okuma deneyimini asla bozmasın */ });
  }, [slug]);

  return null;
}
