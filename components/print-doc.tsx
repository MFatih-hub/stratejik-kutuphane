import type { RenderedPost } from '@/lib/render-post';

/** Yazdırılabilir / PDF'e uygun belge düzeni (A4). */
export default function PrintDoc({
  kicker, title, subtitle, meta, rendered, url, extra,
}: {
  kicker?: string | null;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  rendered?: RenderedPost;
  url?: string;
  extra?: React.ReactNode;
}) {
  const r = rendered;
  return (
    <article className="print-doc">
      <header className="print-head">
        {kicker && <p className="print-kicker">{kicker}</p>}
        <h1 className="print-title">{title}</h1>
        {subtitle && <p className="print-subtitle">{subtitle}</p>}
        {meta && <p className="print-meta">{meta}</p>}
      </header>

      {r && r.headings.filter((h) => h.level <= 2).length >= 3 && (
        <nav className="print-toc" aria-label="İçindekiler">
          <p className="print-section-title">İçindekiler</p>
          <ol>
            {r.headings.filter((h) => h.level <= 2).map((h) => (
              <li key={h.id} className={`print-toc-${h.level}`}><a href={`#${h.id}`}>{h.text}</a></li>
            ))}
          </ol>
        </nav>
      )}

      {r && <div className="post-content print-body" dangerouslySetInnerHTML={{ __html: r.html }} />}
      {extra}

      {r && r.bibliography.length > 0 && (
        <section className="print-biblio">
          <p className="print-section-title">Kaynakça</p>
          <ul>{r.bibliography.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: b }} />)}</ul>
        </section>
      )}
      {r && r.footnotes.length > 0 && (
        <section className="print-notes">
          <p className="print-section-title">Dipnotlar</p>
          <ol>{r.footnotes.map((f, i) => <li key={i} id={`fn-${i + 1}`} dangerouslySetInnerHTML={{ __html: f }} />)}</ol>
        </section>
      )}

      {url && <p className="print-colophon">{url}</p>}
    </article>
  );
}
