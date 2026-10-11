import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { resolveLinkText } from '@/lib/wiki-server';

// [[...]] bağlantılarının gittiği adres: /eser?ad=Etika  →  ilgili eserin sayfası.
// Bulunamazsa Kitap Tahlilleri listesinde o kelimeyle arama yapılır.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ad = (url.searchParams.get('ad') || '').trim().slice(0, 160);
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!ad) return back('/kitap-tahlilleri');

  const supabase = createClient();
  const hit = await resolveLinkText(supabase, ad);
  if (hit) return back(`/kitap-tahlilleri/${hit.slug}`);
  return back(`/kitap-tahlilleri?q=${encodeURIComponent(ad.replace(/^#/, ''))}`);
}
