// components/cards.tsx — Apple Store dilinin yapı taşları: sayfa başı,
// iki tonlu raf başlığı, pastel kart, yatay raf ve kart ızgarası.
import Link from 'next/link';
import { CATEGORIES, formatDate } from '@/lib/helpers';
import ShelfPaddles from './shelf-paddles';

export type CardItem = {
  key: string | number;
  href: string;
  eyebrow?: string | null;
  title: string;
  desc?: string | null;
  date?: string | null;
  /** Tarihin yerine alt satır (ör. "Tüm liste ›") */
  foot?: React.ReactNode;
  /** 1–6 arası kart rengi; yoksa düz kart */
  tone?: number | null;
};

/** Kategorinin kart rengi: her kategori kendi renginde. */
export function categoryTone(slug?: string | null) {
  const i = CATEGORIES.findIndex((c) => c.slug === slug);
  return i >= 0 ? (i % 6) + 1 : 2;
}

/** Durağın kart rengi: aynı duraktaki eserler aynı renkte. */
export function durakTone(index?: number | null) {
  return index ? ((index - 1) % 6) + 1 : 2;
}

export function Card({ item }: { item: CardItem }) {
  return (
    <Link href={item.href} className="card" data-tone={item.tone || undefined}>
      {item.eyebrow && <span className="card-eyebrow">{item.eyebrow}</span>}
      <span className="card-title">{item.title}</span>
      {item.desc && <span className="card-desc">{item.desc}</span>}
      {item.foot ? (
        <span className="card-foot">{item.foot}</span>
      ) : item.date ? (
        <time className="card-foot" dateTime={item.date}>{formatDate(item.date)}</time>
      ) : null}
    </Link>
  );
}

/** "Kitap Tahlilleri. Okuduğum eserler üzerine." — ilk kısım renkli, devamı gri. */
export function ShelfTitle({ id, main, sub }: { id?: string; main: string; sub?: string | null }) {
  return (
    <h2 className="shelf-title" id={id}>
      <span className="shelf-main">{main}</span>
      {sub ? <> {sub}</> : null}
    </h2>
  );
}

/** Yatay kaydırılan kart rafı. */
export function Shelf({ id, main, sub, items, after, more }: {
  id: string;
  main: string;
  sub?: string | null;
  items: CardItem[];
  /** Rafın sonuna eklenecek kart */
  after?: React.ReactNode;
  /** Raf başlığının altındaki "Tümü ›" bağlantısı */
  more?: React.ReactNode;
}) {
  const rail = `${id}-raf`;
  return (
    <section className="shelf" aria-labelledby={id}>
      <div className="shelf-head">
        <div>
          <ShelfTitle id={id} main={main} sub={sub} />
          {more && <p className="shelf-more">{more}</p>}
        </div>
        <ShelfPaddles target={rail} />
      </div>
      <div className="scroller" id={rail}>
        <ul className="scroller-track">
          {items.map((item) => <li key={item.key}><Card item={item} /></li>)}
          {after && <li>{after}</li>}
        </ul>
      </div>
    </section>
  );
}

/** Bütün kartların görüldüğü ızgara (liste sayfaları için). */
export function CardGrid({ items }: { items: CardItem[] }) {
  return (
    <ul className="card-grid">
      {items.map((item) => <li key={item.key}><Card item={item} /></li>)}
    </ul>
  );
}

/** Sayfa başı: solda renkli büyük başlık, sağda kısa cümle ve bağlantılar. */
export function Masthead({ title, eyebrow, lede, links, small = false, children }: {
  title: string;
  eyebrow?: React.ReactNode;
  lede?: React.ReactNode;
  links?: React.ReactNode;
  small?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className={small ? 'masthead masthead-sm' : 'masthead'}>
      <div className="masthead-main">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="masthead-title">{title}</h1>
        {children}
      </div>
      {(lede || links) && (
        <div className="masthead-side">
          {lede && <p className="masthead-lede">{lede}</p>}
          {links && <div className="masthead-links">{links}</div>}
        </div>
      )}
    </header>
  );
}
