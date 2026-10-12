import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { newsletterEnabled, mailConfigured } from '@/lib/server-env';
import SubscribersClient from './subscribers-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Aboneler', robots: { index: false, follow: false } };

export default async function AbonelerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');
  const { data, error } = await supabase.from('subscribers').select('id, email, confirmed_at, unsubscribed_at, created_at').order('created_at', { ascending: false }).limit(5000);
  const list = data || [];
  const active = list.filter((s: any) => s.confirmed_at && !s.unsubscribed_at).length;
  const pending = list.filter((s: any) => !s.confirmed_at && !s.unsubscribed_at).length;
  const env = {
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    MAIL_FROM: !!process.env.MAIL_FROM,
    CRON_SECRET: !!process.env.CRON_SECRET,
    BACKUP_EMAIL: !!process.env.BACKUP_EMAIL,
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Aboneler</h1>
          <p className="admin-sub">{active} onaylı · {pending} onay bekliyor · {list.length - active - pending} ayrıldı</p>
        </div>
        <Link href="/admin" className="btn btn-sm">← İçerik</Link>
      </div>

      <section className="setup-box">
        <p className="section-title">E-posta ve haftalık yedek ayarları</p>
        <ul className="setup-list">
          {Object.entries(env).map(([k, ok]) => (
            <li key={k} className={ok ? 'is-ok' : ''}><span className="setup-dot" aria-hidden="true" /> <code>{k}</code> {ok ? 'tanımlı' : 'eksik'}</li>
          ))}
        </ul>
        {!newsletterEnabled() && (
          <p className="form-hint">
            Abonelik formu, bu değerler Vercel'de tanımlanınca kendiliğinden açılır.{!mailConfigured() && ' E-posta için Resend hesabı gerekiyor (README’de adım adım).'}
          </p>
        )}
        {error && <p className="form-hint">Abone tablosu için <code>SUPABASE-MIGRATION-v6.sql</code> dosyasını çalıştır.</p>}
      </section>

      <SubscribersClient initial={list as any} />
    </div>
  );
}
