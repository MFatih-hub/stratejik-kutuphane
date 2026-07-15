'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().then(() => {
      router.push('/');
      router.refresh();
    });
  }, [router]);

  return (
    <div className="empty-state">
      <p className="empty-state-text">Çıkış yapılıyor...</p>
    </div>
  );
}
