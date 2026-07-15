'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getVisitorId } from '@/lib/visitor';

/**
 * Görünmez bileşen: yazı sayfası açıldığında görüntülenmeyi güvenli şekilde
 * kaydeder (SUPABASE-MIGRATION-v2.sql içindeki record_post_view() fonksiyonu
 * üzerinden). Sadece yayınlanmış yazılarda ve admin olmayan ziyaretçiler için
 * post/page.tsx tarafından render edilir.
 */
export default function ViewTracker({ slug }: { slug: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    const supabase = createClient();
    supabase
      .rpc('record_post_view', {
        p_slug: slug,
        p_visitor_id: visitorId,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
      })
      .then(({ error }: { error: any }) => {
        if (error) {
          // Okuma deneyimini asla bozmasın — sadece geliştirici konsoluna not düş.
          console.debug('Görüntülenme kaydedilemedi:', error.message);
        }
      });
  }, [slug]);

  return null;
}
