import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import DOMPurify from 'isomorphic-dompurify';
import { SANITIZE_CONFIG, injectHeadingIds } from '@/lib/content';

/**
 * Yazı içeriğini formatına göre render eder:
 *  - 'html'    → yeni WYSIWYG editörden gelen içerik (başlıklara id eklenir,
 *                DOMPurify ile temizlenir, dangerouslySetInnerHTML ile basılır)
 *  - 'markdown' (veya boş) → eski yazılar, aynı react-markdown yolu korunur
 */
export default function PostContent({ content, format }: { content: string; format?: string | null }) {
  if (format === 'html') {
    const withIds = injectHeadingIds(content || '');
    const clean = DOMPurify.sanitize(withIds, SANITIZE_CONFIG);
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
