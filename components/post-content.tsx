import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import sanitizeHtml from 'sanitize-html';
import { SANITIZE_HTML_OPTIONS, injectHeadingIds } from '@/lib/content';

/**
 * Yazı içeriğini formatına göre render eder:
 *  - 'html'    → yeni WYSIWYG editörden gelen içerik (başlıklara id eklenir,
 *                sanitize-html ile temizlenir, dangerouslySetInnerHTML ile basılır)
 *  - 'markdown' (veya boş) → eski yazılar, aynı react-markdown yolu korunur
 *
 * Not: Bu bir server component'tir, bu yüzden burada isomorphic-dompurify
 * DEĞİL sanitize-html kullanılıyor (bkz. lib/content.ts'teki açıklama).
 * Editördeki (tarayıcı/client) sanitizasyon hâlâ DOMPurify ile yapılıyor.
 */
export default function PostContent({ content, format }: { content: string; format?: string | null }) {
  if (format === 'html') {
    const withIds = injectHeadingIds(content || '');
    const clean = sanitizeHtml(withIds, SANITIZE_HTML_OPTIONS);
    // eslint-disable-next-line react/no-danger
    return <div className="post-content" dangerouslySetInnerHTML={{ __html: clean }} />;
  }

  return (
    <div className="post-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
