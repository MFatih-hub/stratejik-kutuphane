'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    })();
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p>Çıkış yapılıyor...</p>
    </div>
  );
}
