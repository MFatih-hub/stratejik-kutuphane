// İzleme listesi satırları: okuma sırasıyla videolar ve "Sırayla izle" bağlantısı.
import { LANG_LABEL, durLabel, playlistHref, videoHref, videosFor } from '@/lib/watch';

type BookLike = { id: number; title: string; order: number | null };

export function watchItems(books: BookLike[]) {
  return books.flatMap((b) => videosFor(b.order).map((v) => ({ book: b, video: v })));
}

export default function WatchList({ books }: { books: BookLike[] }) {
  const items = watchItems(books);
  if (items.length === 0) return null;
  return (
    <>
      <div className="group">
        {items.map(({ book, video }) => (
          <a key={`${book.id}-${video.id}`} href={videoHref(video.id)} className="row row-num-start" target="_blank" rel="noopener noreferrer">
            <span className="row-num">{book.order}</span>
            <span className="row-main">
              <span className="row-title">{video.title}</span>
              <span className="row-sub">{book.title} · {video.channel} · {durLabel(video.dur)} · {LANG_LABEL[video.lang] || video.lang}</span>
            </span>
          </a>
        ))}
      </div>
      <p className="watch-play">
        <a className="btn btn-primary" href={playlistHref(items.map((i) => i.video.id))} target="_blank" rel="noopener noreferrer">YouTube'da sırayla izle</a>
      </p>
    </>
  );
}
