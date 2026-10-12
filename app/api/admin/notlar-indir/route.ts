import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { attachmentHeader, notesToDocx, notesToMarkdown } from '@/lib/export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Bir eserin tüm okuma fişlerini Word ya da Markdown olarak indirir (yalnızca yönetici). */
export async function GET(req: Request) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const u = new URL(req.url);
  const id = Number(u.searchParams.get('post'));
  const bicim = u.searchParams.get('bicim') === 'md' ? 'md' : 'docx';
  const [{ data: book }, { data: notes }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.from('notes').select('id, kind, body, page, created_at').eq('post_id', id).order('created_at', { ascending: true }).limit(5000),
  ]);
  if (!book) return NextResponse.json({ error: 'Eser bulunamadı' }, { status: 404 });
  const base = `${book.slug || `eser-${id}`}-notlar`;
  if (bicim === 'md') {
    return new NextResponse(notesToMarkdown(book, (notes || []) as any), {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': attachmentHeader(`${base}.md`), 'Cache-Control': 'no-store' },
    });
  }
  const buf = await notesToDocx(book, (notes || []) as any);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': attachmentHeader(`${base}.docx`),
      'Cache-Control': 'no-store',
    },
  });
}
