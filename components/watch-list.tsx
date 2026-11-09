// İzleme listesi: her eser bir kez, okuma listesindeki numarasıyla başlık olur;
// videoları altında sıralanır. Yöneticiye "izledim" tiki ve "Sırayla izle".
import { LANG_LABEL, durLabel, totalLabel, videoHref, videosFor, type Video } from '@/lib/watch';
import { WatchPlay, WatchTickSlot } from './watch-bits';

type BookLike = { id: number; title: string; order: number | null };

function watchGroups(books: BookLike[]) {
  return books
    .map((book) => ({ book, videos: videosFor(book.order) }))
    .filter((g): g is { book: BookLike; videos: Video[] } => g.videos.length > 0);
}

export function watchItems(books: BookLike[]) {
  return watchGroups(books).flatMap((g) => g.videos.map((video) => ({ book: g.book, video })));
}

/** "9 eser · 16 video · 8 sa 30 dk" */
export function watchSummary(books: BookLike[]) {
  const groups = watchGroups(books);
  const videos = groups.flatMap((g) => g.videos);
  return `${groups.length} eser · ${videos.length} video · ${totalLabel(videos.map((v) => v.dur))}`;
}

export default function WatchList({ books }: { books: BookLike[] }) {
  const groups = watchGroups(books);
  if (groups.length === 0) return null;
  return (
    <>
      <div className="group">
        {groups.map(({ book, videos }) => (
          <section key={book.id} className="watch-book" aria-label={book.title}>
            <h3 className="watch-book-head">
              <span className="row-num">{book.order}</span>
              <span className="watch-book-title">{book.title}</span>
            </h3>
            {videos.map((video) => (
              <div key={video.id} className="row row-num-start watch-row">
                <span className="row-num" aria-hidden="true" />
                <a className="row-main watch-link" href={videoHref(video.id)} target="_blank" rel="noopener noreferrer">
                  <span className="row-title">{video.title}</span>
                  <span className="row-sub">{video.channel} · {durLabel(video.dur)} · {LANG_LABEL[video.lang] || video.lang}</span>
                </a>
                <WatchTickSlot id={video.id} />
              </div>
            ))}
          </section>
        ))}
      </div>
      <p className="watch-play">
        <WatchPlay ids={groups.flatMap((g) => g.videos.map((v) => v.id))} />
      </p>
    </>
  );
}
