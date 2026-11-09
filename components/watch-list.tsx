// İzleme listesi satırları: okuma sırasıyla videolar, yöneticiye "izledim" tiki
// ve "Sırayla izle" bağlantısı.
import { LANG_LABEL, durLabel, totalLabel, videoHref, videosFor } from '@/lib/watch';
import { WatchPlay, WatchTickSlot } from './watch-bits';

type BookLike = { id: number; title: string; order: number | null };

export function watchItems(books: BookLike[]) {
  return books.flatMap((b) => videosFor(b.order).map((v) => ({ book: b, video: v })));
}

/** "16 video · 9 sa 12 dk" */
export function watchSummary(books: BookLike[]) {
  const items = watchItems(books);
  return `${items.length} video · ${totalLabel(items.map((i) => i.video.dur))}`;
}

export default function WatchList({ books }: { books: BookLike[] }) {
  const items = watchItems(books);
  if (items.length === 0) return null;
  return (
    <>
      <div className="group">
        {items.map(({ book, video }) => (
          <div key={`${book.id}-${video.id}`} className="row row-num-start watch-row">
            <span className="row-num">{book.order}</span>
            <a className="row-main watch-link" href={videoHref(video.id)} target="_blank" rel="noopener noreferrer">
              <span className="row-title">{video.title}</span>
              <span className="row-sub">{book.title} · {video.channel} · {durLabel(video.dur)} · {LANG_LABEL[video.lang] || video.lang}</span>
            </a>
            <WatchTickSlot id={video.id} />
          </div>
        ))}
      </div>
      <p className="watch-play">
        <WatchPlay ids={items.map((i) => i.video.id)} />
      </p>
    </>
  );
}
