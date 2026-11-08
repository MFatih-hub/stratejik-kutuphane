import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { CONTENT_TAG } from '@/lib/supabase-public';

export const dynamic = 'force-dynamic';

/**
 * Herkese açık statik sayfaları yeniler. Yönetim panelinde bir şey
 * kaydedilince (yazı, tahlil, "Okudum", toplu ekleme…) tarayıcıdan çağrılır;
 * sayfalar, RSS, site haritası ve arama dizini bir sonraki ziyarette güncel
 * veriyle yeniden üretilir.
 */
export async function POST() {
  const { user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  revalidateTag(CONTENT_TAG);
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
