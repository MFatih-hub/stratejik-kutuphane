import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/server-env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = u.searchParams.get('t') || '';
  const db = serviceClient();
  let ok = false;
  if (db && /^[0-9a-f-]{36}$/i.test(t)) {
    const { data } = await db.from('subscribers').update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null }).eq('token', t).select('id');
    ok = !!data?.length;
  }
  return NextResponse.redirect(new URL(`/abone?durum=${ok ? 'onaylandi' : 'gecersiz'}`, req.url), 303);
}
