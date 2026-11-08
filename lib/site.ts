// lib/site.ts — sitenin sabitleri.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org';
export const SITE_NAME = 'Zihin Haritası';
export const AUTHOR_NAME = 'Muhammet Fatih Işık';

/** Paylaşım görseli (public/og.png). Kapak görseli olan yazılarda kapak kullanılır. */
export const OG_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: SITE_NAME };

export function ogImages(cover?: string | null) {
  return cover ? [{ url: cover }] : [OG_IMAGE];
}
