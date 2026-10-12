import { NextResponse } from 'next/server';
import { buildBackupZip } from '@/lib/backup';
import { mailConfigured, sendMail, serviceClient } from '@/lib/server-env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Haftalık otomatik yedek (Vercel Cron, vercel.json). Tam yedeği ZIP olarak
 * BACKUP_EMAIL adresine e-postayla gönderir. Gerekli ayarlar (Vercel →
 * Settings → Environment Variables): CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 * RESEND_API_KEY, MAIL_FROM, BACKUP_EMAIL.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  const to = process.env.BACKUP_EMAIL;
  const supabase = serviceClient();
  if (!to || !supabase || !mailConfigured()) {
    return NextResponse.json({ error: 'Yedek ayarları eksik (BACKUP_EMAIL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM).' }, { status: 503 });
  }
  const { zip, summary } = await buildBackupZip(supabase);
  const day = new Date().toISOString().slice(0, 10);
  const r = await sendMail({
    to,
    subject: `Zihin Haritası — haftalık yedek (${day})`,
    html: `<p>Sitenin haftalık tam yedeği ekte.</p><p>${summary}.</p><p style="color:#6b7a85;font-size:13px">ZIP'in içinde yazılar ve okuma notları Markdown olarak, veritabanının tamamı da JSON olarak var.</p>`,
    text: `Sitenin haftalık tam yedeği ekte. ${summary}.`,
    attachments: [{ filename: `zihin-haritasi-yedek-${day}.zip`, content: Buffer.from(zip).toString('base64') }],
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, summary, bytes: zip.length });
}
