import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { TYPE_LOOKUP, STATUS_LABELS, SUBJECT_LOOKUP, formatBytes, LANGUAGES } from '@/lib/helpers';
import NotesEditor from '@/components/notes-editor';
import ShareButtons from '@/components/share-buttons';

export const revalidate = 0;

export default async function ResourcePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!resource) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user;

  const typeInfo = TYPE_LOOKUP[resource.type] || TYPE_LOOKUP.book;
  const statusInfo = STATUS_LABELS[resource.status] || STATUS_LABELS.to_read;
  const primarySubject = resource.primary_subject ? SUBJECT_LOOKUP[resource.primary_subject] : null;
  const otherSubjects = (resource.subjects || []).filter((s: string) => s !== resource.primary_subject);
  const langName = LANGUAGES.find((l) => l.code === resource.language)?.name || resource.language;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">
          <i className="ti ti-home" style={{ fontSize: 13, verticalAlign: -1 }}></i> Kütüphane
        </Link>
        {primarySubject && (
          <>
            <span className="breadcrumb-sep">›</span>
            <Link href={`/?alan=${resource.primary_subject}`}>{primarySubject.name}</Link>
          </>
        )}
        <span className="breadcrumb-sep">›</span>
        <span>{resource.title}</span>
      </div>

      <div className="detail-card">
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <Link href={`/admin/edit/${resource.id}`} className="btn btn-sm">
              <i className="ti ti-edit" style={{ fontSize: 13 }}></i> Düzenle
            </Link>
          </div>
        )}
        <div className="detail-header">
        <div
            className="detail-icon"
            style={{ background: typeInfo.color.bg, color: typeInfo.color.fg }}
          >
            <i className={`ti ${typeInfo.icon}`}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="detail-title">{resource.title}</h1>
            {resource.author && <p className="detail-author">{resource.author}</p>}
          </div>
        </div>

        <div className="detail-meta">
          {resource.year && (
            <span className="detail-meta-item">
              <i className="ti ti-calendar" style={{ fontSize: 14 }}></i>
              {resource.year}
            </span>
          )}
          {resource.publisher && (
            <span className="detail-meta-item">
              <i className="ti ti-building" style={{ fontSize: 14 }}></i>
              {resource.publisher}
            </span>
          )}
          {resource.pages && (
            <span className="detail-meta-item">
              <i className="ti ti-file" style={{ fontSize: 14 }}></i>
              {resource.pages} sayfa
            </span>
          )}
          {langName && (
            <span className="detail-meta-item">
              <i className="ti ti-language" style={{ fontSize: 14 }}></i>
              {langName}
            </span>
          )}
          <span className="detail-meta-item">
            <i className={`ti ${typeInfo.icon}`} style={{ fontSize: 14 }}></i>
            {typeInfo.name}
          </span>
          <span className="pill" style={{ background: statusInfo.color.bg, color: statusInfo.color.fg }}>
            {statusInfo.label}
          </span>
        </div>

        {(primarySubject || otherSubjects.length > 0) && (
          <div className="detail-subjects">
            {primarySubject && (
              <Link href={`/?alan=${resource.primary_subject}`} className="subject-chip subject-chip-primary">
                {primarySubject.name}
              </Link>
            )}
            {otherSubjects.map((s: string) => {
              const info = SUBJECT_LOOKUP[s];
              if (!info) return null;
              return (
                <Link key={s} href={`/?alan=${s}`} className="subject-chip">
                  {info.name}
                </Link>
              );
            })}
          </div>
        )}

        {resource.tags && resource.tags.length > 0 && (
          <div className="tag-row">
            {resource.tags.map((t: string, i: number) => (
              <span key={i} className="tag">{t}</span>
            ))}
          </div>
        )}

        {resource.description && (
          <>
            <div className="section-label">Açıklama</div>
            <p className="description-text">{resource.description}</p>
          </>
        )}

        {resource.pdf_url && (
          <>
            <div className="section-label">PDF Dosyası</div>
            <div className="pdf-preview">
              <div className="pdf-icon-square">PDF</div>
              <div className="pdf-meta">
                <p className="pdf-name">{resource.pdf_filename || 'belge.pdf'}</p>
                <p className="pdf-size">{formatBytes(resource.pdf_size_bytes)}</p>
              </div>
              <a
                href={resource.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <i className="ti ti-external-link" style={{ fontSize: 14 }}></i>
                Aç
              </a>
            </div>
          </>
        )}

        {resource.external_url && (
          <>
            <div className="section-label">Dış Bağlantı</div>
            <a
              href={resource.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              <i className="ti ti-external-link" style={{ fontSize: 14 }}></i>
              {resource.external_url.replace(/^https?:\/\//, '').substring(0, 50)}
              {resource.external_url.length > 50 ? '...' : ''}
            </a>
          </>
        )}

        <NotesEditor
          resourceId={resource.id}
          initialNotes={resource.notes}
          isAdmin={isAdmin}
        />

        <div className="section-label">Paylaş</div>
        <ShareButtons title={resource.title} author={resource.author} />
      </div>
    </>
  );
}
