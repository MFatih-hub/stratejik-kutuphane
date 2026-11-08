import Link from 'next/link';
import PostContent from './post-content';
import ShareButton from './share-button';
import SubscribeForm from './subscribe-form';
import ViewTracker from './view-tracker';
import { EditLink } from './admin-bits';
import { Chevron } from './icons';

/** Yazı ve tahlil sayfalarının ortak gövdesi: başlık, metin, notlar, alt kısım. */
export default function Article({
  post, eyebrow, byline, resolveWiki, shareUrl, subscribe = false, track = false, children,
}: {
  post: any;
  eyebrow: React.ReactNode;
  byline?: string | null;
  resolveWiki?: (label: string) => string | { href: string; text?: string } | null;
  shareUrl?: string | null;
  subscribe?: boolean;
  track?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className="article">
      {track && <ViewTracker slug={post.slug} />}
      <header className="article-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="article-title">{post.title}</h1>
        {post.subtitle && <p className="article-sub">{post.subtitle}</p>}
        {byline && <p className="article-byline">{byline}</p>}
      </header>

      {post.cover_image_url && (
        <figure className="article-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_image_url} alt="" />
        </figure>
      )}

      <PostContent post={post} resolveWiki={resolveWiki} />

      {children}

      {shareUrl && (
        <footer className="article-foot">
          <ShareButton url={shareUrl} title={post.title} />
          <EditLink id={post.id} />
        </footer>
      )}

      {subscribe && <SubscribeForm />}
    </article>
  );
}

/** Önceki / sonraki bağlantıları (dizide, okuma listesinde, duraklar arasında). */
export function SeqNav({ label, prev, next }: {
  label: string;
  prev?: { href: string; title: string; note?: string | null } | null;
  next?: { href: string; title: string; note?: string | null } | null;
}) {
  if (!prev && !next) return null;
  return (
    <nav className="seq" aria-label={label}>
      {prev ? (
        <Link href={prev.href} className="seq-link">
          <span className="seq-dir"><Chevron dir="left" /> Önceki{prev.note ? ` · ${prev.note}` : ''}</span>
          <span className="seq-title">{prev.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={next.href} className="seq-link seq-next">
          <span className="seq-dir">{next.note ? `${next.note} · ` : ''}Sonraki <Chevron /></span>
          <span className="seq-title">{next.title}</span>
        </Link>
      ) : <span />}
    </nav>
  );
}
