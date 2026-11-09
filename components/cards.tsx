// components/cards.tsx — Apple'ın web dilinin yapı taşları: sayfa başı,
// öne çıkan büyük karo, iki tonlu raf başlığı, pastel kart, yatay raf ve
// kart ızgarası.
import Link from 'next/link';
import { CATEGORIES, formatDate } from '@/lib/helpers';
import type { Feature } from '@/lib/public-data';
import ShelfPaddles from './shelf-paddles';
import { Chevron } from './icons';

export type CardItem = {
  key: string | number;
  href: string;
  eyebrow?: string | null;
  title: string;
  desc?: string | null;
  date?: string | null;
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

/** Kartın sağ altındaki yuvarlak ok (Apple'ın karo düğmesi). */
export function CardButton() {
  return <span className="card-button" aria-hidden="true"><Chevron /></span>;
}

export function Card({ item }: { item: CardItem }) {
  return (
    <Link href={item.href} className="card" data-tone={item.tone || undefined}>
      {item.eyebrow && <span className="card-eyebrow">{item.eyebrow}</span>}
      <span className="card-title">{item.title}</span>
      {item.desc && <span className="card-desc">{item.desc}</span>}
      {item.date ? (
        <time className="card-foot" dateTime={item.date}>{formatDate(item.date)}</time>
      ) : (
        <span className="card-foot" />
      )}
      <CardButton />
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

/** Raf başlığı ve sağında tek bir bağlantı (Apple'daki "Tüm modelleri karşılaştırın ›" gibi). */
export function ShelfHead({ id, main, sub, cta }: {
  id?: string;
  main: string;
  sub?: string | null;
  cta?: { href: string; label: string } | null;
}) {
  return (
    <div className="shelf-head">
      <ShelfTitle id={id} main={main} sub={sub} />
      {cta && <Link href={cta.href} className="shelf-cta">{cta.label} <Chevron /></Link>}
    </div>
  );
}

/** Yatay kaydırılan kart rafı; oklar rafın altında, sağda. */
export function Shelf({ id, main, sub, cta, items, after }: {
  id: string;
  main: string;
  sub?: string | null;
  cta?: { href: string; label: string } | null;
  items: CardItem[];
  /** Rafın sonuna eklenecek kart */
  after?: React.ReactNode;
}) {
  const rail = `${id}-raf`;
  return (
    <section className="shelf" aria-labelledby={id}>
      <ShelfHead id={id} main={main} sub={sub} cta={cta} />
      <div className="scroller" id={rail}>
        <ul className="scroller-track">
          {items.map((item) => <li key={item.key}><Card item={item} /></li>)}
          {after && <li>{after}</li>}
        </ul>
      </div>
      <ShelfPaddles target={rail} />
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

/** Öne çıkan büyük karo: başlık ve alt başlık solda, düğmeler sağda, altta giriş metni. */
export function FeatureTile({ feature }: { feature: Feature }) {
  const all = feature.kind === 'yazi' ? { href: '/yazilar', label: 'Tüm yazılar' } : { href: '/kitap-tahlilleri', label: 'Tüm tahliller' };
  return (
    <article className="feature">
      <div className="feature-copy">
        {feature.isNew && <p className="feature-new">Yeni</p>}
        <h2 className="feature-title"><Link href={feature.href}>{feature.title}</Link></h2>
        {feature.sub && <p className="feature-sub">{feature.sub}</p>}
      </div>
      <div className="feature-ctas">
        <Link href={feature.href} className="btn btn-primary btn-lg">Oku</Link>
        <Link href={all.href} className="feature-link">{all.label} <Chevron /></Link>
      </div>
      {feature.excerpt && <p className="feature-excerpt">{feature.excerpt}</p>}
    </article>
  );
}
