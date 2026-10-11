import type { MetadataRoute } from 'next';

// Telefonun ana ekranına eklenince uygulama gibi açılır ve doğrudan
// "Bugün" ekranından (okuduğun eser + hızlı fiş) başlar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zihin Haritası',
    short_name: 'Zihin',
    description: 'Okuma yolculuğu, fişler ve kitap tahlilleri',
    start_url: '/admin/bugun',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0c0f',
    theme_color: '#0a0c0f',
    lang: 'tr',
    icons: [
      { src: '/app-icon?s=192', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon?s=512', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon?s=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Hızlı fiş', short_name: 'Fiş', url: '/admin/bugun' },
      { name: 'Fişlerde ara', short_name: 'Ara', url: '/admin/notlar' },
    ],
  };
}
