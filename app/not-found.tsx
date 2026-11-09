import Link from 'next/link';
import { Masthead } from '@/components/cards';
import { Chevron } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="zone zone-top band">
      <Masthead
        small
        title="Sayfa bulunamadı"
        links={<Link href="/">Ana sayfa <Chevron /></Link>}
      />
    </div>
  );
}
