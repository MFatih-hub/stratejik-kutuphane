import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { buildWeekly, weeklyEmail } from '@/lib/weekly';
import { mailConfigured, sendMail } from '@/lib/server-env';

export const dynamic = 'force-dynamic';

/** Pazar özetini şimdi e-postayla gönderir (denemek için). */
export async function POST() {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const to = process.env.OZET_EMAIL || process.env.BACKUP_EMAIL || user.email;
  if (!to || !mailConfigured()) {
    return NextResponse.json({ error: 'E-posta ayarlı değil: Vercel’de RESEND_API_KEY ve MAIL_FROM gerekli.' }, { status: 503 });
  }
  const r = await sendMail({ to, ...weeklyEmail(await buildWeekly(supabase)) });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
