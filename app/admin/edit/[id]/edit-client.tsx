'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { SUBJECT_GROUPS, RESOURCE_TYPES, LANGUAGES, formatBytes } from '@/lib/helpers';

export default function EditClient({ resource, attachments: initialAttachments }: any) {
  const router = useRouter();
  const supabase = createClient();
  const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || 'documentspdfs';

  const [title, setTitle] = useState(resource.title || '');
  const [author, setAuthor] = useState(resource.author || '');
  const [publisher, setPublisher] = useState(resource.publisher || '');
  const [year, setYear] = useState(resource.year?.toString() || '');
  const [pages, setPages] = useState(resource.pages?.toString() || '');
  const [language, setLanguage] = useState(resource.language || 'EN');
  const [type, setType] = useState(resource.type || 'book');
  const [primarySubject, setPrimarySubject] = useState(resource.primary_subject || '');
  const [otherSubjects, setOtherSubjects] = useState<string[]>(
    (resource.subjects || []).filter((s: string) => s !== resource.primary_subject)
  );
  const [tags, setTags] = useState((resource.tags || []).join(', '));
  const [description, setDescription] = useState(resource.description || '');
  const [notes, setNotes] = useState(resource.notes || '');
  const [status, setStatus] = useState(resource.status || 'to_read');
  const [externalUrl, setExternalUrl] = useState(resource.external_url || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [replacePdf, setReplacePdf] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [showSubjects, setShowSubjects] = useState<Record<string, boolean>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function toggleOther(slug: string) {
    if (slug === primarySubject) return;
    setOtherSubjects((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !primarySubject || !type) {
      showToast('Başlık, ana alan ve tür zorunlu');
      return;
    }

    setSaving(true);

    let pdfUrl = resource.pdf_url;
    let pdfFilename = resource.pdf_filename;
    let pdfSize = resource.pdf_size_bytes;

    if (replacePdf && pdfFile) {
      if (resource.pdf_url) {
        const oldPath = resource.pdf_url.split(`${bucketName}/`)[1];
        if (oldPath) await supabase.storage.from(bucketName).remove([oldPath]);
      }
      const safeName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(safeName, pdfFile, { contentType: 'application/pdf' });
      if (uploadError) {
        showToast('PDF yükleme hatası: ' + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
      pdfUrl = urlData.publicUrl;
      pdfFilename = pdfFile.name;
      pdfSize = pdfFile.size;
    }

    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const allSubjects = [primarySubject, ...otherSubjects.filter((s) => s !== primarySubject)];

    const { error } = await supabase
      .from('resources')
      .update({
        title, author, publisher: publisher || null,
        year: year ? Number(year) : null,
        pages: pages ? Number(pages) : null,
        language, type, primary_subject: primarySubject,
        subjects: allSubjects, tags: tagArray,
        description: description || null,
        notes: notes || null,
        status,
        external_url: externalUrl || null,
        pdf_url: pdfUrl, pdf_filename: pdfFilename, pdf_size_bytes: pdfSize,
      })
      .eq('id', resource.id);

    if (error) {
      showToast('Kaydetme hatası: ' + error.message);
      setSaving(false);
      return;
    }

    showToast('Değişiklikler kaydedildi');
    setSaving(false);
    setReplacePdf(false);
    setPdfFile(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`"${resource.title}" kaynağını silmek istediğine emin misin? Bu geri alınamaz.`)) return;

    if (resource.pdf_url) {
      const path = resource.pdf_url.split(`${bucketName}/`)[1];
      if (path) await supabase.storage.from(bucketName).remove([path]);
    }

    for (const att of attachments) {
      const path = att.file_url.split(`${bucketName}/`)[1];
      if (path) await supabase.storage.from(bucketName).remove([path]);
    }

    await supabase.from('resources').delete().eq('id', resource.id);
    showToast('Silindi');
    setTimeout(() => router.push('/admin'), 1000);
  }

  async function uploadAttachment() {
    if (!attachmentFile) return;
    setUploading(true);
    const safeName = `att-${Date.now()}-${attachmentFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(safeName, attachmentFile);
    if (uploadError) {
      showToast('Yükleme hatası: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
    const { data: newAtt, error: insertError } = await supabase
      .from('attachments')
      .insert({
        resource_id: resource.id,
        filename: attachmentFile.name,
        file_url: urlData.publicUrl,
        file_type: attachmentFile.type,
        file_size_bytes: attachmentFile.size,
      })
      .select()
      .single();
    if (insertError) {
      showToast('Kaydetme hatası: ' + insertError.message);
      setUploading(false);
      return;
    }
    setAttachments([newAtt, ...attachments]);
    setAttachmentFile(null);
    setUploading(false);
    showToast('Dosya eklendi');
  }

  async function deleteAttachment(att: any) {
    if (!confirm(`"${att.filename}" silinsin mi?`)) return;
    const path = att.file_url.split(`${bucketName}/`)[1];
    if (path) await supabase.storage.from(bucketName).remove([path]);
    await supabase.from('attachments').delete().eq('id', att.id);
    setAttachments(attachments.filter((a: any) => a.id !== att.id));
    showToast('Silindi');
  }

  function toggleGroup(slug: string) {
    setShowSubjects((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function attIcon(type: string) {
    if (type?.startsWith('image/')) return { icon: 'ti-photo', bg: '#fdf2ee', fg: '#8b2a16' };
    if (type === 'application/pdf') return { icon: 'ti-file-text', bg: '#fcebeb', fg: '#a32d2d' };
    if (type?.startsWith('text/')) return { icon: 'ti-file-description', bg: '#e8f0eb', fg: '#2d5f3f' };
    return { icon: 'ti-file', bg: '#f3efe5', fg: '#4a4540' };
  }

  return (
    <>
      <div className="breadcrumb">
        <Link href="/admin">Admin</Link>
        <span className="breadcrumb-sep">›</span>
        <span>Düzenle: {resource.title}</span>
      </div>

      <div className="detail-card" style={{ maxWidth: 920 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500 }}>
            Kaynak Düzenle
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/kaynak/${resource.slug}`} className="btn btn-sm">
              <i className="ti ti-eye" style={{ fontSize: 13 }}></i> Görüntüle
            </Link>
            <button onClick={handleDelete} className="btn btn-danger btn-sm">
              <i className="ti ti-trash" style={{ fontSize: 13 }}></i> Sil
            </button>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Başlık *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Yazar(lar)</label>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Yayınevi</label>
              <input className="input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
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
              <input className="input" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sayfa</label>
              <input className="input" type="number" value={pages} onChange={(e) => setPages(e.target.value)} />
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

          <div className="form-group">
            <label className="form-label">Ana Alan *</label>
            <select className="select" value={primarySubject} onChange={(e) => setPrimarySubject(e.target.value)} required>
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

          <div className="form-group">
            <label className="form-label">Diğer Alanlar (isteğe bağlı)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUBJECT_GROUPS.map((g) => (
                <div key={g.slug}>
                  <button type="button" onClick={() => toggleGroup(g.slug)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 0',
                      display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`ti ti-chevron-${showSubjects[g.slug] ? 'down' : 'right'}`} style={{ fontSize: 12 }}></i>
                    {g.name}
                  </button>
                  {showSubjects[g.slug] && (
                    <div className="checkbox-list" style={{ marginTop: 6, marginBottom: 8, paddingLeft: 18 }}>
                      {g.subjects.map((s) => {
                        const isChecked = otherSubjects.includes(s.slug);
                        const isPrimary = primarySubject === s.slug;
                        return (
                          <label key={s.slug} className={`checkbox-chip ${isChecked ? 'checked' : ''}`}
                            style={{ opacity: isPrimary ? 0.4 : 1 }}>
                            <input type="checkbox" checked={isChecked} disabled={isPrimary}
                              onChange={() => toggleOther(s.slug)} />
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
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea className="textarea" value={description}
              onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 80 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Notlarım</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Dış Bağlantı (URL)</label>
            <input className="input" type="url" value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Mevcut PDF */}
          <div className="form-group">
            <label className="form-label">PDF Dosyası</label>
            {resource.pdf_url && !replacePdf && (
              <div className="pdf-preview" style={{ marginBottom: 10 }}>
                <div className="pdf-icon-square">PDF</div>
                <div className="pdf-meta">
                  <p className="pdf-name">{resource.pdf_filename}</p>
                  <p className="pdf-size">{formatBytes(resource.pdf_size_bytes)}</p>
                </div>
                <button type="button" onClick={() => setReplacePdf(true)} className="btn btn-sm">
                  Değiştir
                </button>
              </div>
            )}
            {(!resource.pdf_url || replacePdf) && (
              <div>
                <input type="file" accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                {pdfFile && (
                  <p style={{ fontSize: 12, color: 'var(--success)', margin: '6px 0 0' }}>
                    ✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
                {replacePdf && resource.pdf_url && (
                  <button type="button" onClick={() => { setReplacePdf(false); setPdfFile(null); }}
                    className="btn btn-sm" style={{ marginTop: 6 }}>
                    İptal
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', paddingTop: '1.5rem',
            borderTop: '0.5px solid var(--border)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
            <Link href="/admin" className="btn">İptal</Link>
          </div>
        </form>

        {/* EK DOSYALAR */}
        <div className="section-label" style={{ marginTop: '3rem' }}>Ek Dosyalar (görseller, PDF, metin)</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0 }}>
          Notlarınla ilgili görseller, tablolar, ek PDF'ler veya ses dosyaları ekleyebilirsin.
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input type="file"
            onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
            style={{ fontSize: 13 }} />
          <button onClick={uploadAttachment} className="btn btn-sm" disabled={!attachmentFile || uploading}>
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="attachments-list">
            {attachments.map((att: any) => {
              const ic = attIcon(att.file_type);
              return (
                <div key={att.id} className="attachment-item">
                  <div className="attachment-icon" style={{ background: ic.bg, color: ic.fg }}>
                    <i className={`ti ${ic.icon}`}></i>
                  </div>
                  <div className="attachment-info">
                    <p className="attachment-name">{att.filename}</p>
                    <p className="attachment-size">{formatBytes(att.file_size_bytes)}</p>
                  </div>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                    Aç
                  </a>
                  <button onClick={() => deleteAttachment(att)} className="btn btn-danger btn-sm">
                    Sil
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
