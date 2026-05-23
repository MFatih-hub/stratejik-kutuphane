import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { TYPE_LABELS, STATUS_LABELS, formatBytes } from '@/lib/helpers';

export const revalidate = 0;

export default async function ResourcePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: resource } = await supabase
    .from('resources')
    .select('*, steps(*), categories(*)')
    .eq('slug', params.slug)
    .single();

  if (!resource) notFound();

  const step = resource.steps;
  const category = resource.categories;
  const typeInfo = TYPE_LABELS[resource.type] || TYPE_LABELS.belge;
  const statusInfo = STATUS_LABELS[resource.status] || STATUS_LABELS.to_read;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">
          <i className="ti ti-home" style={{ fontSize: 13, verticalAlign: -1 }}></i> Ana sayfa
        </Link>
        <span className="breadcrumb-sep">›</span>
        <Link href={`/adim/${step.slug}`}>{step.title}</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{resource.title}</span>
      </div>

      <div className="detail-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
          <div
            className="resource-icon"
            style={{ background: typeInfo.color.bg, color: typeInfo.color.fg, width: 48, height: 48, fontSize: 22, flexShrink: 0 }}
          >
            <i className={`ti ${typeInfo.icon}`}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>{resource.title}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: 15 }}>
              {resource.author}
            </p>
          </div>
        </div>

        <div className="detail-meta">
          {resource.year && (
            <span>
              <i className="ti ti-calendar" style={{ fontSize: 14, marginRight: 4 }}></i>
              {resource.year}
            </span>
          )}
          {resource.publisher && (
            <span>
              <i className="ti ti-building" style={{ fontSize: 14, marginRight: 4 }}></i>
              {resource.publisher}
            </span>
          )}
          {resource.pages && (
            <span>
              <i className="ti ti-file" style={{ fontSize: 14, marginRight: 4 }}></i>
              {resource.pages} sayfa
            </span>
          )}
          {resource.language && (
            <span>
              <i className="ti ti-language" style={{ fontSize: 14, marginRight: 4 }}></i>
              {resource.language}
            </span>
          )}
          <span>
            <i className={`ti ${typeInfo.icon}`} style={{ fontSize: 14, marginRight: 4 }}></i>
            {typeInfo.label}
          </span>
          <span className="pill" style={{ background: statusInfo.color.bg, color: statusInfo.color.fg }}>
            {statusInfo.label}
          </span>
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="tag-row">
            {resource.tags.map((t: string, i: number) => (
              <span key={i} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        {resource.description && (
          <>
            <div className="section-label">Açıklama</div>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.7 }}>
              {resource.description}
            </p>
          </>
        )}

        {resource.pdf_url && (
          <>
            <div className="section-label">PDF Dosyası</div>
            <div className="pdf-preview">
              <div className="pdf-icon-square">PDF</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {resource.pdf_filename || 'belge.pdf'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formatBytes(resource.pdf_size_bytes)}
                </p>
              </div>
              <a
                href={resource.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <i className="ti ti-external-link"></i>
              {resource.external_url.replace(/^https?:\/\//, '').substring(0, 40)}...
            </a>
          </>
        )}

        {resource.notes && (
          <>
            <div className="section-label">Notlarım</div>
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              {resource.notes}
            </div>
          </>
        )}
      </div>
    </>
  );
}
