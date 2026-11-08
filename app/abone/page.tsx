import type { Metadata } from 'next';
import AboneDurum from './durum';
import { newsletterEnabled } from '@/lib/server-env';

export const dynamic = 'force-static';
// Yönetim panelinde kayıt olunca anında yenilenir; ayrıca günde bir kendiliğinden.
export const revalidate = 86400;
export const metadata: Metadata = { title: 'Abonelik', robots: { index: false, follow: true } };

export default function AbonePage() {
  return (
    <header className="hero hero-narrow">
      <AboneDurum enabled={newsletterEnabled()} />
    </header>
  );
}
