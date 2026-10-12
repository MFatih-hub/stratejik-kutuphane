import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { buildBackupZip } from '@/lib/backup';
import { attachmentHeader } from '@/lib/export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Sitenin tam yedeği (ZIP) — yalnızca yönetici. */
export async function GET() {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const { zip } = await buildBackupZip(supabase as any);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(zip as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachmentHeader(`zihin-haritasi-yedek-${day}.zip`),
      'Cache-Control': 'no-store',
    },
  });
}
