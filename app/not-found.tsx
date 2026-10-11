import Link from 'next/link';
import { Horizon } from '@/components/calm';

export default function NotFound() {
  return (
    <section className="not-found">
      <Horizon width={220} />
      <p className="not-found-code">404</p>
      <h1 className="not-found-title">Burada yalnızca durgun su var</h1>
      <p className="not-found-text">
        Aradığın sayfa bu kıyıda değil. Belki adresi değişti, belki hiç yazılmadı.
      </p>
      <div className="not-found-actions">
        <Link href="/" className="btn btn-primary">Ana sayfaya dön</Link>
        <Link href="/kitap-tahlilleri" className="btn">Okuma yolculuğu</Link>
      </div>
    </section>
  );
}
