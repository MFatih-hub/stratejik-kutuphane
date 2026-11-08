import { getSearchIndex } from '@/lib/public-data';

// Site araması için dizin. Statik bir dosya gibi CDN'den sunulur; arama
// tamamen tarayıcıda yapılır, sunucuya ya da veritabanına istek gitmez.
export const dynamic = 'force-static';
// Saatte bir yenilenir (tek bir küçük dosya; maliyeti yok denecek kadar az).
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getSearchIndex());
}
