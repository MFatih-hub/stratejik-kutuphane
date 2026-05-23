import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const { data: steps } = await supabase
    .from('steps')
    .select('*, resources(count)')
    .order('step_number');

  const stepsWithCounts = await Promise.all(
    (steps || []).map(async (step) => {
      const { count: resourceCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('step_id', step.id);

      const { count: pdfCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('step_id', step.id)
        .not('pdf_url', 'is', null);

      return { ...step, resourceCount: resourceCount || 0, pdfCount: pdfCount || 0 };
    })
  );

  return (
    <>
      <section className="hero">
        <h1>Stratejik düşüncenin haritası</h1>
        <p>
          Dünya politikasının arkasındaki on büyük geleneği — Türk devlet aklından Anglo-Amerikan
          establishment'ına, Çin parti danışmanlığından Davos sınıfına — birincil kaynaklarla,
          akademik metinlerle ve çağdaş sesleriyle inceleyen kişisel okuma günlüğüm.
        </p>
      </section>

      <div className="step-grid">
        {stepsWithCounts.map((step) => (
          <Link key={step.id} href={`/adim/${step.slug}`} className="step-card">
            <div className="step-num">Adım {String(step.step_number).padStart(2, '0')}</div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.description}</p>
            <div className="step-meta">
              <span>
                <i className="ti ti-files" style={{ fontSize: 14 }}></i>
                {step.resourceCount} kaynak
              </span>
              <span>
                <i className="ti ti-cloud-check" style={{ fontSize: 14 }}></i>
                {step.pdfCount} PDF
              </span>
            </div>
          </Link>
        ))}
      </div>

      {stepsWithCounts.length === 0 && (
        <div className="empty-state">
          <i className="ti ti-database-off" style={{ fontSize: 32 }}></i>
          <p>Henüz adım eklenmedi. Supabase tablolarını kurmayı unutmuş olabilirsin.</p>
        </div>
      )}
    </>
  );
}
