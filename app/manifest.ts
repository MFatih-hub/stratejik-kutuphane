import type { MetadataRoute } from 'next';

// Telefonun ana ekranına eklenince uygulama gibi açılır ve doğrudan Dem'den başlar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zihin Haritası',
    short_name: 'Zihin',
    description: 'Okuma listesi, fişler ve kitap tahlilleri',
    start_url: '/admin/dem',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    lang: 'tr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Hızlı fiş', short_name: 'Fiş', url: '/admin/dem' },
      { name: 'Fişlerde ara', short_name: 'Ara', url: '/admin/notlar' },
    ],
  };
}
