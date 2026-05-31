'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-browser';
import { CATEGORIES, slugify, calculateReadingMinutes, generateExcerpt } from '@/lib/helpers';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function EditorClient({ post }: { post: any | null }) {
  const router = useRouter();
  const supabase = createClient();
  const bucket = process.env.NEXT_PUBLIC_BUCKET_NAME || 'documentspdfs';
  const isNew = !post;

  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [content, setContent] = useState<string | undefined>(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url || '');
  const [category, setCategory] = useState(post?.category || 'teknoloji');
  const [tags, setTags] = useState((post?.tags || []).join(', '));
  const [isPublished, setIsPublished] = useState(post?.is_published || false);
  const [slug, setSlug] = useState(post?.slug || '');
  const [autoSlug, setAutoSlug] = useState(isNew);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    if (autoSlug && title) setSlug(slugify(title));
  }, [title, autoSlug]);

  const readingMinutes = calculateReadingMinutes(content || '');
  const autoExcerpt = generateExcerpt(content || '');

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const safeName = `post-${Date.now()}.${ext}`;
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
      showToast('Kapak görseli yüklendi');
    }
  }

  async function handleInsertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImage(file);
      if (url) {
        const md = `\n\n![](${url})\n\n`;
        setContent((content || '') + md);
        showToast('Görsel eklendi');
      }
    };
    input.click();
  }

  async function save(publishNow: boolean | null = null) {
    if (!title.trim()) {
      showToast('Başlık zorunlu');
      return;
    }
    if (!content || content.trim().length < 10) {
      showToast('İçerik çok kısa');
      return;
    }

    setSaving(true);
    const shouldPublish = publishNow === null ? isPublished : publishNow;
    const finalSlug = slug || slugify(title);
    const finalExcerpt = excerpt || autoExcerpt;
    const tagArray = tags.split(',').map((t: string) => t.trim()).filter(Boolean);

    const payload: any = {
      slug: finalSlug,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      content,
      excerpt: finalExcerpt,
      cover_image_url: coverUrl || null,
      category,
      tags: tagArray,
      reading_minutes: readingMinutes,
      is_published: shouldPublish,
    };

    if (shouldPublish && (!post || !post.is_published)) {
      payload.published_at = new Date().toISOString();
    }

    let result;
    if (isNew) {
      result = await supabase.from('posts').insert(payload).select().single();
    } else {
      result = await supabase.from('posts').update(payload).eq('id', post.id).select().single();
    }

    setSaving(false);

    if (result.error) {
      showToast('Hata: ' + result.error.message);
      return;
    }

    setIsPublished(shouldPublish);
    showToast(shouldPublish ? 'Yayınlandı ✓' : 'Taslak kaydedildi ✓');

    if (isNew && result.data) {
      router.push(`/admin/yazi/${result.data.id}/duzenle`);
    } else {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!confirm(`"${post.title}" yazısını silmek istediğine emin misin? Geri alınamaz.`)) return;
    await supabase.from('posts').delete().eq('id', post.id);
    showToast('Silindi');
    setTimeout(() => router.push('/admin'), 800);
  }

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="editor-header-left">
          <Link href="/admin" className="btn btn-sm">← Geri</Link>
          <span className="editor-status">
            {isNew ? 'Yeni yazı' : (isPublished ? '✓ Yayında' : '⚠ Taslak')}
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
            {saving ? '...' : (isPublished ? 'Güncelle' : 'Yayınla')}
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
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            className="editor-subtitle-input"
            placeholder="Alt başlık (opsiyonel)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />

          <div data-color-mode="light" className="md-editor-wrap">
            <MDEditor
              value={content}
              onChange={setContent}
              height={600}
              preview="live"
            />
          </div>

          <div className="editor-toolbar">
            <button onClick={handleInsertImage} className="btn btn-sm" disabled={uploading}>
              {uploading ? 'Yükleniyor...' : '📷 Yazıya görsel ekle'}
            </button>
            <span className="editor-stats">
              {readingMinutes} dk okuma · {(content || '').length} karakter
            </span>
          </div>
        </div>

        <aside className="editor-sidebar">
          <div className="sidebar-section">
            <label className="form-label">Kategori</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
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
                <button onClick={() => setCoverUrl('')} className="btn btn-sm btn-danger" style={{ marginTop: 6 }}>
                  Kaldır
                </button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ fontSize: 12, marginTop: 6 }} />
          </div>

          <div className="sidebar-section">
            <label className="form-label">URL (slug)</label>
            <input
              type="text"
              className="input"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
            />
            <p className="form-hint">/yazi/{slug || 'ornek-slug'}</p>
          </div>

          <div className="sidebar-section">
            <label className="form-label">Etiketler (virgülle)</label>
            <input
              type="text"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, türkiye, deneme"
            />
          </div>

          <div className="sidebar-section">
            <label className="form-label">Özet</label>
            <textarea
              className="textarea"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
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
