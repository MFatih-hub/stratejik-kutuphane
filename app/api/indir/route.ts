import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { hasRealContent } from '@/lib/helpers';
import { attachmentHeader, postToDocx, postToMarkdown } from '@/lib/export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Bir yazıyı ya da tahlili Word (.docx) veya Markdown (.md) olarak indirir. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = Number(u.searchParams.get('id'));
  const bicim = u.searchParams.get('bicim') === 'md' ? 'md' : 'docx';
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });

  // Taslaklar yalnızca giriş yapmış yöneticiye görünür (RLS)
  const supabase = createClient();
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
  if (!post || !hasRealContent(post.content)) {
    return NextResponse.json({ error: 'Bu yazı bulunamadı ya da henüz yazılmadı.' }, { status: 404 });
  }

  const base = post.slug || `yazi-${post.id}`;
  if (bicim === 'md') {
    return new NextResponse(postToMarkdown(post), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': attachmentHeader(`${base}.md`),
        'Cache-Control': 'private, no-store',
      },
    });
  }
  const buf = await postToDocx(post);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': attachmentHeader(`${base}.docx`),
      'Cache-Control': 'private, no-store',
    },
  });
}
