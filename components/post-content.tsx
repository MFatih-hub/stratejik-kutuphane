import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { renderPost, parseBibliography } from '@/lib/render-post';

/**
 * Yazı içeriğini formatına göre render eder:
 *  - 'html'    → yeni WYSIWYG editörden gelen içerik. lib/render-post.ts'teki
 *                tek yoldan geçer: başlık id'leri, temizleme (sanitize-html),
 *                ((dipnot)) → numaralı dipnot, #kavram ve (istenirse) [[eser]]
 *                bağlantıları.
 *  - 'markdown' (veya boş) → eski yazılar, aynı react-markdown yolu korunur
 *
 * Not: Bu bir server component'tir, bu yüzden burada isomorphic-dompurify
 * DEĞİL sanitize-html kullanılıyor (bkz. lib/content.ts'teki açıklama).
 * Editördeki (tarayıcı/client) sanitizasyon hâlâ DOMPurify ile yapılıyor.
 */
export default function PostContent({
  content, format, bibliography, wiki = false,
}: { content: string; format?: string | null; bibliography?: string | null; wiki?: boolean }) {
  if (format === 'html') {
    const r = renderPost({ content, content_format: format, bibliography }, { wiki });
    return (
      <>
        {/* eslint-disable-next-line react/no-danger */}
        <div className="post-content" dangerouslySetInnerHTML={{ __html: r.html }} />
        <PostNotes footnotes={r.footnotes} bibliography={r.bibliography} />
      </>
    );
  }

  return (
    <>
      <div className="post-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {content}
        </ReactMarkdown>
      </div>
      <PostNotes footnotes={[]} bibliography={parseBibliography(bibliography)} />
    </>
  );
}

function PostNotes({ footnotes, bibliography }: { footnotes: string[]; bibliography: string[] }) {
  if (!footnotes.length && !bibliography.length) return null;
  return (
    <div className="post-notes">
      {footnotes.length > 0 && (
        <section className="footnotes" aria-label="Dipnotlar">
          <h2 className="post-notes-title">Dipnotlar</h2>
          <ol>
            {footnotes.map((f, i) => (
              <li key={i} id={`fn-${i + 1}`}>
                <span dangerouslySetInnerHTML={{ __html: f }} />{' '}
                <a href={`#fnref-${i + 1}`} className="fn-back" aria-label="Metne dön">↩</a>
              </li>
            ))}
          </ol>
        </section>
      )}
      {bibliography.length > 0 && (
        <section className="bibliography" aria-label="Kaynakça">
          <h2 className="post-notes-title">Kaynakça</h2>
          <ul>
            {bibliography.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: b }} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
