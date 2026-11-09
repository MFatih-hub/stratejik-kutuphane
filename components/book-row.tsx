import Link from 'next/link';
import type { Book } from '@/lib/public-data';
import { bookHref } from '@/lib/public-data';
import { BookState } from './admin-bits';
import { isCore } from '@/lib/core';

/** Okuma listesinde bir satır: sıra no, eser, yazar; tahlili varsa sayfasına gider. */
export default function BookRow({ book }: { book: Book }) {
  const inner = (
    <>
      <span className="row-num">{book.order ?? ''}</span>
      <span className="row-main">
        <span className="row-title">
          {isCore(book.order) && <span className="core-star" title="Çekirdek yol" aria-label="Çekirdek yol">★ </span>}
          {book.title}
        </span>
        {book.author && <span className="row-sub">{book.author}</span>}
      </span>
      <span className="row-end">
        {book.written ? (
          <span className="row-tag">Tahlil</span>
        ) : (
          <BookState id={book.id} status={book.status} done={book.done} />
        )}
      </span>
    </>
  );
  const id = book.order != null ? `eser-${book.order}` : undefined;
  return book.written ? (
    <Link href={bookHref(book.slug)} className="row row-num-start" id={id}>{inner}</Link>
  ) : (
    <div className="row row-num-start" id={id}>{inner}</div>
  );
}
