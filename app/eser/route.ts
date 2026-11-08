import { NextResponse } from 'next/server';
import { getReadingList, wikiResolver } from '@/lib/public-data';

// Eski [[...]] bağlantılarının adresi: /eser?ad=Etika → ilgili eserin sayfası.
// Sayfalardaki bağlantılar artık doğrudan esere gider; bu adres yalnızca dışa
// aktarılmış belgelerdeki ve e-postalardaki eski bağlantılar için duruyor.
// Okuma listesi önbellekten gelir; yönlendirme CDN'de bir gün saklanır.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ad = (url.searchParams.get('ad') || '').trim().slice(0, 160);
  let target = '/kitap-tahlilleri';
  if (ad) {
    const list = await getReadingList();
    target = wikiResolver(list.books)(ad)?.href || target;
  }
  const res = NextResponse.redirect(new URL(target, url.origin), 307);
  res.headers.set('Cache-Control', 'public, s-maxage=86400');
  return res;
}
