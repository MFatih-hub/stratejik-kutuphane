import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { hasRealContent } from '@/lib/helpers';
import { newsletterEnabled, sendBatch, sendMail, serviceClient } from '@/lib/server-env';
import { postEmail } from '@/lib/newsletter';
import { SITE_URL } from '@/lib/export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Yayındaki bir yazıyı abonelere (ya da deneme olarak yöneticiye) gönderir. */
export async function POST(req: Request) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  if (!newsletterEnabled()) return NextResponse.json({ error: 'E-posta ayarları yapılmamış.' }, { status: 503 });
  const { postId, test } = await req.json().catch(() => ({}));
  const { data: post } = await supabase.from('posts').select('*').eq('id', Number(postId)).single();
  if (!post || !post.is_published || !hasRealContent(post.content)) {
    return NextResponse.json({ error: 'Yalnızca yayındaki, içeriği olan yazılar gönderilebilir.' }, { status: 400 });
  }
  const mail = postEmail(post);

  if (test) {
    const to = user.email!;
    const r = await sendMail({ to, subject: `[Deneme] ${mail.subject}`, html: mail.html.replace(/\{\{UNSUB\}\}/g, '#'), text: mail.text.replace(/\{\{UNSUB\}\}/g, '#') });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    return NextResponse.json({ ok: true, to });
  }

  const db = serviceClient()!;
  const { data: subs } = await db.from('subscribers').select('email, token').not('confirmed_at', 'is', null).is('unsubscribed_at', null).limit(5000);
  if (!subs?.length) return NextResponse.json({ error: 'Onaylı abone yok.' }, { status: 400 });

  const mails = subs.map((s: any) => {
    const unsub = `${SITE_URL}/api/abone/ayril?t=${s.token}`;
    return {
      to: s.email,
      subject: mail.subject,
      html: mail.html.replace(/\{\{UNSUB\}\}/g, unsub),
      text: mail.text.replace(/\{\{UNSUB\}\}/g, unsub),
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    };
  });
  const { sent, errors } = await sendBatch(mails);
  if (sent > 0) await supabase.from('posts').update({ newsletter_sent_at: new Date().toISOString() }).eq('id', post.id);
  if (!sent) return NextResponse.json({ error: errors[0] || 'Gönderilemedi' }, { status: 502 });
  return NextResponse.json({ ok: true, sent, errors });
}
