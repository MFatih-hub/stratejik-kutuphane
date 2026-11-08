'use client';

import { useEffect, useState } from 'react';
import SubscribeForm from '@/components/subscribe-form';

// Onay / ayrılma bağlantılarından gelen ?durum=... bilgisi tarayıcıda okunur;
// sayfa böylece statik kalır.
const TITLES: Record<string, string> = {
  onaylandi: 'Aboneliğin başladı',
  ayrildi: 'Abonelikten ayrıldın',
  gecersiz: 'Bağlantı geçersiz',
};

export default function AboneDurum({ enabled }: { enabled: boolean }) {
  const [durum, setDurum] = useState('');
  useEffect(() => setDurum(new URLSearchParams(window.location.search).get('durum') || ''), []);
  return (
    <>
      <h1 className="hero-title hero-title-md">{TITLES[durum] || 'E-posta aboneliği'}</h1>
      {enabled && durum !== 'onaylandi' && <SubscribeForm />}
    </>
  );
}
