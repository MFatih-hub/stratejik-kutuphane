import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import ThemeToggle from '@/components/theme-toggle';
import SiteSearch from '@/components/site-search';
import { NavAdminLinks } from '@/components/admin-bits';
import { THEME_SCRIPT } from '@/lib/theme';
import { listYazilar } from '@/lib/public-data';
import { CATEGORIES } from '@/lib/helpers';
import { newsletterEnabled } from '@/lib/server-env';
import { AUTHOR_NAME, OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';
// Yazı tipi: Apple cihazlarda sistemin SF Pro'su, diğerlerinde siteyle birlikte barındırılan Inter
import '@fontsource-variable/inter/opsz.css';
import './globals.css';

// Bu düzen ve herkese açık sayfalar sunucuda çerez okumaz: hepsi statik
// üretilir ve CDN'den sunulur. Yöneticiye özel parçalar tarayıcıda çizilir.

const SITE_DESCRIPTION = 'Muhammet Fatih Işık\'ın denemeleri ve kitap tahlilleri.';

// Google Analytics 4 ölçüm kimliği (Vercel > Settings > Environment Variables > NEXT_PUBLIC_GA_ID)
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-KSN82G3HLW';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${AUTHOR_NAME}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  appleWebApp: { capable: true, title: 'Zihin', statusBarStyle: 'black-translucent' },
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: `${SITE_NAME} RSS` }] },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${AUTHOR_NAME}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${AUTHOR_NAME}`,
    description: SITE_DESCRIPTION,
    creator: '@Yedikarat',
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: { google: 'Mj2Vl6gc0tRK2M15UWc6nIy3MXyhHfNGz6pAe59376A' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Zihin Haritasi',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: SITE_URL },
    inLanguage: 'tr-TR',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: SITE_URL,
    sameAs: ['https://x.com/Yedikarat', 'https://www.linkedin.com/in/muhammet-fatih-i%C5%9F%C4%B1k-096b58301/'],
    jobTitle: 'Yazar, Mühendis, Araştırmacı',
  },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // "Yazılar" bağlantısı yalnızca yayında yazı varsa görünür (veri, sayfalarla birlikte önbellekten gelir)
  const posts = await listYazilar().catch(() => []);
  const hasPosts = posts.length > 0;
  const topics = CATEGORIES.filter((c) => posts.some((p) => p.category === c.slug));
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}

        <header className="nav">
          <nav className="nav-inner" aria-label="Site">
            <Link href="/" className="nav-brand">Zihin Haritası</Link>
            {hasPosts && <Link href="/yazilar" className="nav-link">Yazılar</Link>}
            <Link href="/kitap-tahlilleri" className="nav-link">Kitap Tahlilleri</Link>
            <NavAdminLinks />
            <SiteSearch />
            <ThemeToggle />
          </nav>
        </header>

        <main className="main">{children}</main>

        <footer className="foot">
          <div className="foot-inner">
            {/* Apple'ın sayfa sonu dizini gibi: sitenin bütün bölümleri tek bakışta */}
            <nav className="foot-index" aria-label="Site dizini">
              <p className="foot-index-title">Zihin Haritası</p>
              <div className="foot-groups">
                <div className="foot-group">
                  <p className="foot-group-title">Keşfedin</p>
                  <ul className="foot-list foot-list-big">
                    {hasPosts && <li><Link href="/yazilar">Yazılar</Link></li>}
                    <li><Link href="/kitap-tahlilleri">Kitap Tahlilleri</Link></li>
                    <li><Link href="/kitap-tahlilleri#duraklar">Okuma listesi</Link></li>
                  </ul>
                </div>
                {topics.length > 0 && (
                  <div className="foot-group">
                    <p className="foot-group-title">Konular</p>
                    <ul className="foot-list">
                      {topics.map((c) => <li key={c.slug}><Link href={`/kategori/${c.path}`}>{c.name}</Link></li>)}
                    </ul>
                  </div>
                )}
                <div className="foot-group">
                  <p className="foot-group-title">Takip edin</p>
                  <ul className="foot-list">
                    <li><Link href="/feed.xml">RSS</Link></li>
                    {newsletterEnabled() && <li><Link href="/abone">E-posta aboneliği</Link></li>}
                  </ul>
                </div>
              </div>
            </nav>
            <div className="foot-row">
              <span>Telif Hakkı © {new Date().getFullYear()} {AUTHOR_NAME}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
