import Link from 'next/link';
import { formatDate } from '@/lib/helpers';

export type PostListItem = { key: string | number; href: string; title: string; text?: string | null; date?: string | null };

/** Yazılar ve tahliller için sade liste: başlık, tek satır açıklama, tarih. */
export default function PostList({ items }: { items: PostListItem[] }) {
  return (
    <ul className="posts">
      {items.map((p) => (
        <li key={p.key}>
          <Link href={p.href} className="post">
            <span className="post-title">{p.title}</span>
            {p.text && <span className="post-text">{p.text}</span>}
            {p.date && <time className="post-date" dateTime={p.date}>{formatDate(p.date)}</time>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
