import { NextResponse } from 'next/server';
import { buildWeekly, weeklyEmail } from '@/lib/weekly';
import { mailConfigured, sendMail, serviceClient } from '@/lib/server-env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Pazar özeti (Vercel Cron, vercel.json — pazar 20.00, İstanbul). Haftanın
 * okuma özetini OZET_EMAIL (yoksa BACKUP_EMAIL) adresine gönderir. Gerekli
 * ayarlar haftalık yedekle aynı: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 * RESEND_API_KEY, MAIL_FROM ve adres.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  const to = process.env.OZET_EMAIL || process.env.BACKUP_EMAIL;
  const supabase = serviceClient();
  if (!to || !supabase || !mailConfigured()) {
    return NextResponse.json({ error: 'Özet ayarları eksik (OZET_EMAIL ya da BACKUP_EMAIL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM).' }, { status: 503 });
  }
  const mail = weeklyEmail(await buildWeekly(supabase));
  const r = await sendMail({ to, ...mail });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
