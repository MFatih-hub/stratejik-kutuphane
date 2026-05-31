import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin/*',
          '/giris',
          '/api/',
        ],
      },
      {
        // Google bot için özel ayar
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/admin/*', '/giris'],
      },
      {
        // AI bot'ları için - istersen engelleyebilirsin
        // (şu an izin veriyorum, Google AI Overviews'de görünmek için iyi)
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web'],
        allow: '/',
        disallow: ['/admin/', '/giris'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
