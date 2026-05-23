import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { TYPE_LABELS } from '@/lib/helpers';

export const revalidate = 0;

export default async function StepPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: step } = await supabase
    .from('steps')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!step) notFound();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('step_id', step.id)
    .order('display_order');

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('step_id', step.id)
    .order('created_at', { ascending: false });

  const grouped = (categories || []).map((cat) => ({
    ...cat,
    items: (resources || []).filter((r) => r.category_id === cat.id),
  }));

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">
          <i className="ti ti-home" style={{ fontSize: 13, verticalAlign: -1 }}></i> Ana sayfa
        </Link>
        <span className="breadcrumb-sep">›</span>
        <span>{step.title}</span>
      </div>

      <section className="hero" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
        <div className="step-num" style={{ marginBottom: 8 }}>
          ADIM {String(step.step_number).padStart(2, '0')}
        </div>
        <h1>{step.title}</h1>
        <p>{step.description}</p>
      </section>

      {grouped.map((cat) => (
        <div key={cat.id} className="category-section">
          <h3 className="category-header">
            {cat.name}
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
              · {cat.items.length}
            </span>
          </h3>

          {cat.items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, padding: '12px 0' }}>
              Bu kategoride henüz kaynak yok.
            </p>
          ) : (
            <div className="resource-list">
              {cat.items.map((r) => {
                const t = TYPE_LABELS[r.type] || TYPE_LABELS.belge;
                return (
                  <Link key={r.id} href={`/kaynak/${r.slug}`} className="resource-row">
                    <div className="resource-left">
                      <div
                        className="resource-icon"
                        style={{ background: t.color.bg, color: t.color.fg }}
                      >
                        <i className={`ti ${t.icon}`}></i>
                      </div>
                      <div className="resource-info">
                        <p className="resource-title">{r.title}</p>
                        <p className="resource-author">
                          {r.author}
                          {r.year ? ` · ${r.year}` : ''}
                          {r.publisher ? ` · ${r.publisher}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="resource-right">
                      {r.pdf_url ? (
                        <span className="pill" style={{ background: '#e1f5ee', color: '#0f6e56' }}>
                          PDF var
                        </span>
                      ) : (
                        <span className="pill" style={{ background: '#f1efe8', color: '#5f5e5a' }}>
                          PDF yok
                        </span>
                      )}
                      <i
                        className="ti ti-chevron-right"
                        style={{ fontSize: 16, color: 'var(--text-tertiary)' }}
                      ></i>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
