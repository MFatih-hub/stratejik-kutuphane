import type { Metadata } from 'next';
import Link from 'next/link';
import { Horizon } from '@/components/calm';
import SubscribeForm from '@/components/subscribe-form';
import { newsletterEnabled } from '@/lib/server-env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Abonelik', robots: { index: false, follow: true } };

const MESSAGES: Record<string, { title: string; text: string }> = {
  onaylandi: { title: 'Aboneliğin başladı', text: 'Yeni bir yazı ya da tahlil yayımlandığında e-postana gelecek. Her e-postanın altında tek tıkla ayrılma bağlantısı var.' },
  ayrildi: { title: 'Abonelikten ayrıldın', text: 'Artık e-posta gelmeyecek. Fikrini değiştirirsen aşağıdan yeniden abone olabilirsin.' },
  gecersiz: { title: 'Bağlantı geçersiz', text: 'Bu bağlantının süresi dolmuş ya da yanlış kopyalanmış olabilir. Aşağıdan yeniden deneyebilirsin.' },
};

export default function AbonePage({ searchParams }: { searchParams: { durum?: string } }) {
  const m = MESSAGES[searchParams?.durum || ''];
  return (
    <section className="abone-page">
      <Horizon />
      <h1 className="blog-hero-title" style={{ marginTop: 18 }}>{m ? m.title : 'E-posta aboneliği'}</h1>
      <p className="blog-hero-sub">{m ? m.text : 'Yeni yazılar ve kitap tahlilleri yayımlandığında e-postana gelsin.'}</p>
      {searchParams?.durum === 'onaylandi' ? null : newsletterEnabled() ? <SubscribeForm compact /> : <p className="form-hint">Abonelik henüz açılmadı.</p>}
      <p style={{ marginTop: 24 }}><Link href="/">← Ana sayfa</Link></p>
    </section>
  );
}
