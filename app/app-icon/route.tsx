import { ImageResponse } from 'next/og';
import { IconArt } from '@/lib/icon-art';

export const runtime = 'edge';

// /app-icon?s=192 ya da /app-icon?s=512 — PWA manifest ikonları
export function GET(request: Request) {
  const s = Number(new URL(request.url).searchParams.get('s')) === 192 ? 192 : 512;
  return new ImageResponse(<IconArt size={s} />, { width: s, height: s });
}
