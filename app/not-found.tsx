import Link from 'next/link';
import { Chevron } from '@/components/icons';

export default function NotFound() {
  return (
    <header className="hero hero-center">
      <h1 className="hero-title hero-title-md">Sayfa bulunamadı</h1>
      <p className="hero-sub"><Link href="/" className="more">Ana sayfa <Chevron /></Link></p>
    </header>
  );
}
