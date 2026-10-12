import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server-env';

export const dynamic = 'force-dynamic';

async function leave(t: string) {
  const db = serviceClient();
  if (!db || !/^[0-9a-f-]{36}$/i.test(t)) return false;
  const { data } = await db.from('subscribers').update({ unsubscribed_at: new Date().toISOString() }).eq('token', t).select('id');
  return !!data?.length;
}

/** Bağlantıdan ayrılma (e-postadaki "Abonelikten ayrıl"). */
export async function GET(req: Request) {
  const ok = await leave(new URL(req.url).searchParams.get('t') || '');
  return NextResponse.redirect(new URL(`/abone?durum=${ok ? 'ayrildi' : 'gecersiz'}`, req.url), 303);
}

/** E-posta programlarının "tek tıkla abonelikten çık" düğmesi (RFC 8058). */
export async function POST(req: Request) {
  await leave(new URL(req.url).searchParams.get('t') || '');
  return new NextResponse(null, { status: 200 });
}
