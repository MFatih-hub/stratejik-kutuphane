import Link from 'next/link';
import { Masthead } from '@/components/cards';
import { Chevron } from '@/components/icons';

export default function NotFound() {
  return (
    <Masthead
      small
      title="Sayfa bulunamadı"
      links={<Link href="/">Ana sayfa <Chevron /></Link>}
    />
  );
}
