import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { buildWeekly, fmtMin, verdict } from '@/lib/weekly';
import { mailConfigured } from '@/lib/server-env';
import SendButton from './send-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bu hafta', robots: { index: false, follow: false } };

const KIND: Record<string, string> = { alinti: 'Alıntı', not: 'Not', soru: 'Soru' };
const label = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

export default async function HaftaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  const w = await buildWeekly(supabase);
  const next = w.current.length ? w.current : w.core.next;

  return (
    <div className="today hafta">
      <header className="today-head">
        <p className="today-date"><Link href="/admin/dem">Dem</Link> · {label(w.start)} – {label(w.end)}</p>
        <h1 className="today-title">Bu hafta {fmtMin(w.minutes)}</h1>
        <p className="today-note">{w.readingDays} gün okudun. {verdict(w)}</p>
      </header>

      <div className="hafta-grid">
        <section className="today-card">
          <p className="today-kicker">Neyi okudun</p>
          {w.byBook.length ? (
            <ul className="hafta-list">{w.byBook.map((b) => <li key={b.title}><span>{b.title}</span><span>{fmtMin(b.minutes)}</span></li>)}</ul>
          ) : <p className="tempo-line">Bu hafta süre kaydı yok. Dem’de “Okumaya başla” ile tutulur.</p>}
          {w.finished.length > 0 && (
            <>
              <p className="today-kicker" style={{ marginTop: 16 }}>Biten</p>
              <ul className="hafta-list">{w.finished.map((b) => <li key={b.title}><span>{b.order != null && <span className="today-no">#{b.order}</span>} {b.title}</span></li>)}</ul>
            </>
          )}
          <p className="tempo-line" style={{ marginTop: 12 }}>
            {w.notes.total} fiş ({w.notes.alinti} alıntı, {w.notes.not} not, {w.notes.soru} soru) · {w.watched} video izlendi
          </p>
        </section>

        <section className="today-card">
          <p className="today-kicker">{w.current.length ? 'Gelecek hafta devam' : 'Gelecek hafta başla'}</p>
          {next.length ? (
            <ul className="hafta-list">
              {next.map((b: any) => (
                <li key={b.title}><span><span className="today-no">#{b.order}</span> {b.title}</span>{b.page && <span>s. {b.page}</span>}</li>
              ))}
            </ul>
          ) : <p className="tempo-line">—</p>}
          {w.core.total > 0 && <p className="tempo-line" style={{ marginTop: 12 }}>Çekirdek yol: {w.core.done} / {w.core.total}</p>}
        </section>

        {w.recall && (
          <section className="today-card recall">
            <p className="today-kicker">Hatırla</p>
            <p className="hafta-recall">{w.recall.body}</p>
            <p className="note-meta">{KIND[w.recall.kind] || 'Not'}{w.recall.book && <> · {w.recall.book}</>}</p>
          </section>
        )}
      </div>

      <p className="hafta-mail">
        {mailConfigured()
          ? <>Bu özet her pazar akşamı e-postayla da gelir. <SendButton /></>
          : <>Her pazar e-postayla gelmesi için Vercel’de e-posta ayarlarının (RESEND_API_KEY, MAIL_FROM, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, BACKUP_EMAIL) girilmesi gerekiyor; o zamana kadar özet burada.</>}
      </p>
    </div>
  );
}
