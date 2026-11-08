import { NextResponse } from 'next/server';
import { newsletterEnabled, sendMail, serviceClient } from '@/lib/server-env';
import { confirmEmail } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Kötüye kullanıma karşı: bir saatte en fazla bu kadar onay e-postası gider.
const HOURLY_LIMIT = 30;

/** Abone ol: adresi kaydeder ve onay e-postası yollar (çift onaylı abonelik). */
export async function POST(req: Request) {
  if (!newsletterEnabled()) return NextResponse.json({ error: 'Abonelik şu an kapalı.' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  // Bot tuzakları: gizli alan dolu ya da form bir saniyeden kısa sürede gönderilmiş
  if (body.website || !(Number(body.t) >= 1000)) return NextResponse.json({ ok: true, message: 'Onay e-postası gönderildi.' });
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ error: 'Geçerli bir e-posta adresi yaz.' }, { status: 400 });

  const db = serviceClient()!;
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recent } = await db.from('subscribers').select('id', { count: 'exact', head: true }).gte('last_mail_at', hourAgo);
  if ((recent || 0) >= HOURLY_LIMIT) return NextResponse.json({ error: 'Şu an çok yoğun, biraz sonra tekrar dene.' }, { status: 429 });
  const { data: existing } = await db.from('subscribers').select('*').eq('email', email).maybeSingle();
  if (existing && existing.confirmed_at && !existing.unsubscribed_at) {
    return NextResponse.json({ ok: true, message: 'Bu adres zaten abone. Yeni yazılar geldiğinde haber vereceğim.' });
  }
  // Aynı adrese 10 dakikada bir onay e-postasından fazlası gitmesin
  if (existing?.last_mail_at && Date.now() - new Date(existing.last_mail_at).getTime() < 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, message: 'Onay e-postası az önce gönderildi; gelen kutunu (ve gereksiz klasörünü) kontrol et.' });
  }
  let row = existing;
  if (!row) {
    const { data, error } = await db.from('subscribers').insert({ email }).select('*').single();
    if (error) return NextResponse.json({ error: 'Kaydedilemedi, biraz sonra tekrar dene.' }, { status: 500 });
    row = data;
  } else if (row.unsubscribed_at) {
    await db.from('subscribers').update({ unsubscribed_at: null, confirmed_at: null }).eq('id', row.id);
  }
  const mail = confirmEmail(row.token);
  const r = await sendMail({ to: email, ...mail });
  if (!r.ok) return NextResponse.json({ error: 'Onay e-postası gönderilemedi, biraz sonra tekrar dene.' }, { status: 502 });
  await db.from('subscribers').update({ last_mail_at: new Date().toISOString() }).eq('id', row.id);
  return NextResponse.json({ ok: true, message: 'Onay e-postası gönderildi. Gelen kutundaki bağlantıya tıklayınca abonelik başlar.' });
}
