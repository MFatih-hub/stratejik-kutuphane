'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { slugify, SUBJECT_GROUPS, SUBJECT_LOOKUP, RESOURCE_TYPES, TYPE_LOOKUP, LANGUAGES } from '@/lib/helpers';

export default function AdminClient({ resources }: any) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('');
  const [pages, setPages] = useState('');
  const [language, setLanguage] = useState('EN');
  const [type, setType] = useState('book');
  const [primarySubject, setPrimarySubject] = useState('');
  const [otherSubjects, setOtherSubjects] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('to_read');
  const [externalUrl, setExternalUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [showSubjects, setShowSubjects] = useState<Record<string, boolean>>({});

  const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || 'documentspdfs';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function toggleOtherSubject(slug: string) {
    if (slug === primarySubject) return;
    setOtherSubjects((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !primarySubject || !type) {
      showToast('Başlık, ana alan ve tür zorunlu');
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
    const allSubjects = [primarySubject, ...otherSubjects.filter((s) => s !== primarySubject)];

    const { error: insertError } = await supabase.from('resources').insert({
      slug,
      title,
      author,
      publisher: publisher || null,
      year: year ? Number(year) : null,
      pages: pages ? Number(pages) : null,
      language,
      type,
      primary_subject: primarySubject,
      subjects: allSubjects,
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
    setPrimarySubject('');
    setOtherSubjects([]);
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

  function toggleGroup(slug: string) {
    setShowSubjects((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  return (
    <>
      <h1 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500 }}>
        Yeni Kaynak Ekle
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: 14 }}>
        Kütüphaneye journal, kitap, handbook, whitepaper veya başka bir akademik kaynak ekle.
      </p>

      <div className="detail-card" style={{ maxWidth: '100%' }}>
        <form onSubmit={handleSubmit}>
          {/* Temel Bilgiler */}
          <div className="form-group">
            <label className="form-label">Başlık *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Principles of Neural Science"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Yazar(lar)</label>
              <input
                className="input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Kandel, Schwartz, Jessell"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Yayınevi</label>
              <input
                className="input"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="McGraw-Hill"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tür *</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)} required>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
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
              <input
                className="input"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2021"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sayfa</label>
              <input
                className="input"
                type="number"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="1760"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dil</label>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Ana alan */}
          <div className="form-group">
            <label className="form-label">Ana Alan *</label>
            <select
              className="select"
              value={primarySubject}
              onChange={(e) => setPrimarySubject(e.target.value)}
              required
            >
              <option value="">-- Seç --</option>
              {SUBJECT_GROUPS.map((g) => (
                <optgroup key={g.slug} label={g.name}>
                  {g.subjects.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Diğer alanlar (çoklu seçim) */}
          <div className="form-group">
            <label className="form-label">Diğer Alanlar (isteğe bağlı, birden fazla seçebilirsin)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUBJECT_GROUPS.map((g) => (
                <div key={g.slug}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.slug)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <i className={`ti ti-chevron-${showSubjects[g.slug] ? 'down' : 'right'}`} style={{ fontSize: 12 }}></i>
                    {g.name}
                  </button>
                  {showSubjects[g.slug] && (
                    <div className="checkbox-list" style={{ marginTop: 6, marginBottom: 8, paddingLeft: 18 }}>
                      {g.subjects.map((s) => {
                        const isChecked = otherSubjects.includes(s.slug);
                        const isPrimary = primarySubject === s.slug;
                        return (
                          <label
                            key={s.slug}
                            className={`checkbox-chip ${isChecked ? 'checked' : ''}`}
                            style={{ opacity: isPrimary ? 0.4 : 1 }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isPrimary}
                              onChange={() => toggleOtherSubject(s.slug)}
                            />
                            {s.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Etiketler (virgülle ayır)</label>
            <input
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="neuroscience, textbook, kanonik"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu kaynak neden önemli, ne anlatıyor..."
              style={{ minHeight: 80 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notlarım (sonra detay sayfasında da düzenleyebilirsin)</label>
            <textarea
              className="textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Okurken aldığın notlar..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dış Bağlantı (DOI, ScienceDirect URL, vs.)</label>
            <input
              className="input"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://doi.org/..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">PDF Dosyası (max 50 MB)</label>
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

      <h2 style={{ marginTop: '3rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500 }}>
        Son Eklenen Kaynaklar
      </h2>

      {resources.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Henüz kaynak eklenmedi.</p>
      ) : (
        <div className="resource-list">
          {resources.map((r: any) => {
            const t = TYPE_LOOKUP[r.type] || TYPE_LOOKUP.book;
            const subj = r.primary_subject ? SUBJECT_LOOKUP[r.primary_subject] : null;
            return (
              <div key={r.id} className="resource-row">
                <div className="resource-left">
                  <div className="resource-icon" style={{ background: t.color.bg, color: t.color.fg }}>
                    <i className={`ti ${t.icon}`}></i>
                  </div>
                  <div className="resource-info">
                    <p className="resource-title">{r.title}</p>
                    <p className="resource-author">
                      {r.author}
                      {subj ? <span className="resource-author-meta"> · {subj.name}</span> : null}
                    </p>
                  </div>
                </div>
                <div className="resource-right">
                  {r.pdf_url && (
                    <span className="pill pill-have">PDF</span>
                  )}
                  <Link href={`/kaynak/${r.slug}`} className="btn btn-sm">Gör</Link>
                  <Link href={`/admin/edit/${r.id}`} className="btn btn-sm">
                    <i className="ti ti-edit" style={{ fontSize: 13 }}></i> Düzenle
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id, r.pdf_url)}
                    className="btn btn-danger btn-sm"
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
