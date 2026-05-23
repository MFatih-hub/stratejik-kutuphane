'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { slugify, TYPE_LABELS } from '@/lib/helpers';

export default function AdminClient({ steps, categories, resources }: any) {
  const router = useRouter();
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('');
  const [pages, setPages] = useState('');
  const [language, setLanguage] = useState('TR');
  const [type, setType] = useState('kitap');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('to_read');
  const [externalUrl, setExternalUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  const filteredCategories = categories.filter((c: any) => c.step_id === Number(selectedStep));

  const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || 'documentspdfs';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStep || !selectedCategory || !title) {
      showToast('Adım, kategori ve başlık zorunlu');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    let pdfUrl: string | null = null;
    let pdfFilename: string | null = null;
    let pdfSize: number | null = null;

    if (pdfFile) {
      const safeName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(safeName, pdfFile, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        showToast('PDF yükleme hatası: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
      pdfUrl = urlData.publicUrl;
      pdfFilename = pdfFile.name;
      pdfSize = pdfFile.size;
    }

    const slug = slugify(title) + '-' + Date.now().toString(36);
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);

    const { error: insertError } = await supabase.from('resources').insert({
      step_id: Number(selectedStep),
      category_id: Number(selectedCategory),
      slug,
      title,
      author,
      publisher: publisher || null,
      year: year ? Number(year) : null,
      pages: pages ? Number(pages) : null,
      language,
      type,
      tags: tagArray,
      description: description || null,
      notes: notes || null,
      status,
      external_url: externalUrl || null,
      pdf_url: pdfUrl,
      pdf_filename: pdfFilename,
      pdf_size_bytes: pdfSize,
    });

    if (insertError) {
      showToast('Kaydetme hatası: ' + insertError.message);
      setUploading(false);
      return;
    }

    setTitle('');
    setAuthor('');
    setPublisher('');
    setYear('');
    setPages('');
    setTags('');
    setDescription('');
    setNotes('');
    setExternalUrl('');
    setPdfFile(null);
    setUploading(false);
    showToast('Kaynak eklendi!');
    router.refresh();
  }

  async function handleDelete(id: number, pdfUrl?: string | null) {
    if (!confirm('Silmek istediğine emin misin?')) return;
    const supabase = createClient();

    if (pdfUrl) {
      const path = pdfUrl.split(`${bucketName}/`)[1];
      if (path) await supabase.storage.from(bucketName).remove([path]);
    }

    await supabase.from('resources').delete().eq('id', id);
    showToast('Silindi');
    router.refresh();
  }

  return (
    <>
      <h1 style={{ margin: '0 0 0.5rem' }}>Yeni Kaynak Ekle</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: 14 }}>
        Kitap, makale, video — PDF varsa yükle.
      </p>

      <div className="detail-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Adım *</label>
              <select className="select" value={selectedStep} onChange={(e) => { setSelectedStep(e.target.value); setSelectedCategory(''); }} required>
                <option value="">-- Seç --</option>
                {steps.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {String(s.step_number).padStart(2, '0')} — {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kategori *</label>
              <select
                className="select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={!selectedStep}
                required
              >
                <option value="">-- Seç --</option>
                {filteredCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Başlık *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Diplomacy"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Yazar</label>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Henry Kissinger" />
            </div>
            <div className="form-group">
              <label className="form-label">Yayınevi</label>
              <input className="input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Simon & Schuster" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tür</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Durum</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="to_read">Okunacak</option>
                <option value="reading">Okuyorum</option>
                <option value="done">Bitti</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Yıl</label>
              <input className="input" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1994" />
            </div>
            <div className="form-group">
              <label className="form-label">Sayfa sayısı</label>
              <input className="input" type="number" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="912" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Dil</label>
              <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="TR">Türkçe</option>
                <option value="EN">İngilizce</option>
                <option value="FR">Fransızca</option>
                <option value="DE">Almanca</option>
                <option value="RU">Rusça</option>
                <option value="AR">Arapça</option>
                <option value="FA">Farsça</option>
                <option value="ZH">Çince</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Etiketler (virgülle ayır)</label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="realizm, klasik, kanonik" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Açıklama (kısa özet)</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu kitap neden önemli, ne anlatıyor..."
              style={{ minHeight: 80 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notlarım</label>
            <textarea
              className="textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Okurken aldığın notlar, alıntılar, düşünceler..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dış bağlantı (opsiyonel)</label>
            <input
              className="input"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://www.foreignaffairs.com/..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">PDF Dosyası (opsiyonel, max 50 MB)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              style={{ fontSize: 14 }}
            />
            {pdfFile && (
              <p style={{ fontSize: 12, color: 'var(--success)', margin: '6px 0 0' }}>
                ✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Kaydediliyor...' : 'Kaynağı Kaydet'}
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: '3rem', marginBottom: '1rem' }}>Son Eklenen Kaynaklar</h2>

      {resources.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Henüz kaynak eklenmedi.</p>
      ) : (
        <div className="resource-list">
          {resources.map((r: any) => {
            const t = TYPE_LABELS[r.type] || TYPE_LABELS.belge;
            return (
              <div key={r.id} className="resource-row">
                <div className="resource-left">
                  <div className="resource-icon" style={{ background: t.color.bg, color: t.color.fg }}>
                    <i className={`ti ${t.icon}`}></i>
                  </div>
                  <div className="resource-info">
                    <p className="resource-title">{r.title}</p>
                    <p className="resource-author">
                      {r.author} · {r.steps?.title} · {r.categories?.name}
                    </p>
                  </div>
                </div>
                <div className="resource-right">
                  {r.pdf_url && (
                    <span className="pill" style={{ background: '#e1f5ee', color: '#0f6e56' }}>
                      PDF
                    </span>
                  )}
                  <Link href={`/kaynak/${r.slug}`} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>
                    Gör
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id, r.pdf_url)}
                    className="btn btn-danger"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
