import { renderPost } from '@/lib/render-post';

/**
 * Yazı içeriği. Hem HTML (editör) hem eski markdown yazılar lib/render-post.ts'teki
 * tek yoldan geçer: başlık kimlikleri, temizleme (sanitize-html), ((dipnot)) →
 * numaralı dipnot ve [[eser]] bağlantıları. Sunucu bileşenidir; tarayıcıya kod gitmez.
 */
export default function PostContent({
  post, resolveWiki,
}: {
  post: { content?: string | null; content_format?: string | null; bibliography?: string | null };
  resolveWiki?: (label: string) => string | { href: string; text?: string } | null;
}) {
  const r = renderPost(post, { wiki: true, resolveWiki });
  return (
    <>
      <div className="prose" dangerouslySetInnerHTML={{ __html: r.html }} />
      {(r.footnotes.length > 0 || r.bibliography.length > 0) && (
        <div className="notes">
          {r.footnotes.length > 0 && (
            <section aria-label="Dipnotlar">
              <h2 className="notes-title">Dipnotlar</h2>
              <ol>
                {r.footnotes.map((f, i) => (
                  <li key={i} id={`fn-${i + 1}`}>
                    <span dangerouslySetInnerHTML={{ __html: f }} />{' '}
                    <a href={`#fnref-${i + 1}`} className="fn-back" aria-label="Metne dön">↩</a>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {r.bibliography.length > 0 && (
            <section aria-label="Kaynakça">
              <h2 className="notes-title">Kaynakça</h2>
              <ul className="biblio">
                {r.bibliography.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: b }} />)}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
