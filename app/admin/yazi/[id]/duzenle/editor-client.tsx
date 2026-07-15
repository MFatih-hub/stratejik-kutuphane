'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { createClient } from '@/lib/supabase-browser';
import { CATEGORIES, slugify, stripHtml, generateExcerptFromHtml } from '@/lib/helpers';
import { SANITIZE_CONFIG } from '@/lib/content';
import type { RichTextEditorStats } from '@/components/rich-text-editor';

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="rte-wrap rte-loading">Editör yükleniyor…</div>,
});

/** Eski yazılar markdown olarak saklanıyordu; yeni editörde açılınca bir kereliğine HTML'e çevrilir. */
function toInitialHtml(post: any | null): string {
  if (!post?.content) return '';
  if (post.content_format === 'markdown') {
    try {
      return marked.parse(post.content, { async: false, gfm: true, breaks: false }) as string;
    } catch {
      return post.content;
    }
  }
  return post.content;
}

function formatSavedTime(d: Date): string {
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function EditorClient({ post }: { post: any | null }) {
  const router = useRouter();
  const supabase = createClient();
  const bucket = process.env.NEXT_PUBLIC_BUCKET_NAME || 'documentspdfs';

  const [postId, setPostId] = useState<number | null>(post?.id ?? null);
  const isNew = postId === null;

  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [content, setContent] = useState<string>(() => toInitialHtml(post));
  const [stats, setStats] = useState<RichTextEditorStats>({ words: 0, characters: 0 });
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url || '');
  const [category, setCategory] = useState(post?.category || 'teknoloji');
  const [tags, setTags] = useState((post?.tags || []).join(', '));
  const [isPublished, setIsPublished] = useState(post?.is_published || false);
  const [slug, setSlug] = useState(post?.slug || '');
  const [autoSlug, setAutoSlug] = useState(!post?.slug);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // save() aşağıda tanımlı, ama en güncel state'i her zaman görmesi için ref'te tutuyoruz
  // (setTimeout ile tetiklenen otomatik kaydetmenin bayat state yakalamaması için).
  const latestRef = useRef<any>(null);
  latestRef.current = { postId, title, subtitle, content, excerpt, coverUrl, category, tags, isPublished, slug, stats };

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    if (autoSlug && title) setSlug(slugify(title));
  }, [title, autoSlug]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const readingMinutes = Math.max(1, Math.round((stats.words || 0) / 220));
  const autoExcerpt = generateExcerptFromHtml(content);

  function markDirty() {
    isDirtyRef.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      save(null, { silent: true });
    }, 2500);
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const safeName = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(safeName, file, { contentType: file.type });
    setUploading(false);
    if (error) {
      showToast('Yükleme hatası: ' + error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      setCoverUrl(url);
      markDirty();
      showToast('Kapak görseli yüklendi');
    }
  }

  async function save(publishNow: boolean | null = null, opts: { silent?: boolean } = {}) {
    const { silent = false } = opts;
    const s = latestRef.current;

    if (!s.title.trim()) {
      if (!silent) showToast('Başlık zorunlu');
      return;
    }
    if (!s.content || stripHtml(s.content).length < 10) {
      if (!silent) showToast('İçerik çok kısa');
      return;
    }
    // Otomatik kaydetme ile manuel kaydetme aynı anda çakışırsa (ör. otomatik
    // kaydetme tam ağ isteği atarken kullanıcı "Yayınla"ya basarsa) iki ayrı
    // INSERT oluşup yazının kopyalanmasını önlemek için basit bir kilit.
    if (savingRef.current) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    savingRef.current = true;
    setSaving(true);

    const shouldPublish = publishNow === null ? s.isPublished : publishNow;
    const finalSlug = s.slug || slugify(s.title);
    const cleanContent = DOMPurify.sanitize(s.content, SANITIZE_CONFIG);
    const finalExcerpt = s.excerpt || generateExcerptFromHtml(cleanContent);
    const tagArray = s.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    const minutes = Math.max(1, Math.round((s.stats.words || 0) / 220));

    const payload: any = {
      slug: finalSlug,
      title: s.title.trim(),
      subtitle: s.subtitle.trim() || null,
      content: cleanContent,
      content_format: 'html',
      excerpt: finalExcerpt,
      cover_image_url: s.coverUrl || null,
      category: s.category,
      tags: tagArray,
      reading_minutes: minutes,
      is_published: shouldPublish,
    };

    if (shouldPublish && !s.isPublished) {
      payload.published_at = new Date().toISOString();
    }

    let result;
    try {
      if (s.postId === null) {
        result = await supabase.from('posts').insert(payload).select().single();
      } else {
        result = await supabase.from('posts').update(payload).eq('id', s.postId).select().single();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    if (result.error) {
      showToast('Hata: ' + result.error.message);
      return;
    }

    isDirtyRef.current = false;
    setLastSavedAt(new Date());
    setIsPublished(shouldPublish);
    if (finalSlug !== s.slug) setSlug(finalSlug);

    if (s.postId === null && result.data) {
      setPostId(result.data.id);
      // Sayfayı yeniden yüklemeden adres çubuğunu doğru düzenleme URL'ine güncelle
      // (Next.js router push kullanmıyoruz çünkü bu editörü yeniden monte edip
      // yazarken imleci/odaklanmayı bozardı).
      window.history.replaceState(null, '', `/admin/yazi/${result.data.id}/duzenle`);
    }

    if (!silent) {
      showToast(shouldPublish ? 'Yayınlandı ✓' : 'Taslak kaydedildi ✓');
    }
  }

  async function handleDelete() {
    if (postId === null) return;
    if (!confirm(`"${title || 'Bu yazı'}" yazısını silmek istediğine emin misin? Geri alınamaz.`)) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      showToast('Silme hatası: ' + error.message);
      return;
    }
    showToast('Silindi');
    setTimeout(() => router.push('/admin'), 800);
  }

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="editor-header-left">
          <Link href="/admin" className="btn btn-sm">← Geri</Link>
          <span className="editor-status">
            {isNew ? 'Yeni yazı' : isPublished ? '✓ Yayında' : '⚠ Taslak'}
          </span>
          <span className="editor-autosave">
            {saving ? 'Kaydediliyor…' : lastSavedAt ? `Kaydedildi · ${formatSavedTime(lastSavedAt)}` : ''}
          </span>
        </div>
        <div className="editor-header-right">
          {!isNew && (
            <Link href={`/yazi/${slug}`} target="_blank" className="btn btn-sm">
              Önizle
            </Link>
          )}
          <button onClick={() => save(false)} className="btn" disabled={saving}>
            {saving ? '...' : 'Taslak Kaydet'}
          </button>
          <button onClick={() => save(true)} className="btn btn-primary" disabled={saving}>
            {saving ? '...' : isPublished ? 'Güncelle' : 'Yayınla'}
          </button>
          {!isNew && (
            <button onClick={handleDelete} className="btn btn-sm btn-danger">Sil</button>
          )}
        </div>
      </header>

      <div className="editor-main">
        <div className="editor-content">
          <input
            type="text"
            className="editor-title-input"
            placeholder="Başlık"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          />
          <input
            type="text"
            className="editor-subtitle-input"
            placeholder="Alt başlık (opsiyonel)"
            value={subtitle}
            onChange={(e) => { setSubtitle(e.target.value); markDirty(); }}
          />

          <RichTextEditor
            content={content}
            placeholder="Yazmaya başla…"
            onChange={(html) => { setContent(html); markDirty(); }}
            onStatsChange={setStats}
            onImageUpload={uploadImage}
          />
          <p className="editor-reading-time">~{readingMinutes} dakika okuma süresi</p>
        </div>

        <aside className="editor-sidebar">
          <div className="sidebar-section">
            <label className="form-label">Kategori</label>
            <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); markDirty(); }}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sidebar-section">
            <label className="form-label">Kapak Görseli</label>
            {coverUrl && (
              <div className="cover-preview">
                <img src={coverUrl} alt="Kapak" />
                <button onClick={() => { setCoverUrl(''); markDirty(); }} className="btn btn-sm btn-danger" style={{ marginTop: 6 }}>
                  Kaldır
                </button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ fontSize: 12, marginTop: 6 }} disabled={uploading} />
          </div>

          <div className="sidebar-section">
            <label className="form-label">URL (slug)</label>
            <input
              type="text"
              className="input"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); markDirty(); }}
            />
            <p className="form-hint">/yazi/{slug || 'ornek-slug'}</p>
          </div>

          <div className="sidebar-section">
            <label className="form-label">Etiketler (virgülle)</label>
            <input
              type="text"
              className="input"
              value={tags}
              onChange={(e) => { setTags(e.target.value); markDirty(); }}
              placeholder="ai, türkiye, deneme"
            />
          </div>

          <div className="sidebar-section">
            <label className="form-label">Özet</label>
            <textarea
              className="textarea"
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); markDirty(); }}
              placeholder={autoExcerpt || 'Otomatik üretilecek'}
              style={{ minHeight: 80 }}
            />
            <p className="form-hint">Boş bırakırsan otomatik üretilir</p>
          </div>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
