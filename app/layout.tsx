import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import ThemeToggle from '@/components/theme-toggle';
import { HeaderSiteSearch } from '@/components/site-search';
import { BrandMark, Glint } from '@/components/calm';
import { quoteOfTheDay } from '@/lib/quotes';
// Kur'an metni için Uthmani hattını tam destekleyen yazı tipi (siteyle birlikte
// barındırılır; tarayıcı sadece Arapça ayet gösterildiğinde indirir, ~45 KB).
import '@fontsource/amiri-quran/arabic-400.css';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zihinharitasi.org';
const SITE_NAME = 'Zihin Haritası';
const AUTHOR_NAME = 'Muhammet Fatih Işık';
const SITE_DESCRIPTION = 'Muhammet Fatih Işık\'ın denemeleri, okuma bülteni ve kitap tahlilleri.';

// Google Analytics 4 ölçüm kimliği (G-XXXXXXXXXX).
// Vercel > Project > Settings > Environment Variables > NEXT_PUBLIC_GA_ID
// Alternatif: tırnak içine doğrudan kendi kimliğini yazabilirsin.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-KSN82G3HLW';

// Sekme ikonu: metalik disk, ufuk çizgisi ve minik ışık (logo ile aynı)
const FAVICON =
  "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><defs><linearGradient id='m' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#e9ecef'/><stop offset='.42' stop-color='#9ea7af'/><stop offset='.55' stop-color='#eef1f3'/><stop offset='1' stop-color='#6d7780'/>" +
    "</linearGradient></defs><circle cx='18' cy='18' r='17' fill='url(#m)'/><path d='M5 21.5h26' stroke='#3c454e' stroke-width='1.2'/>" +
    "<path d='M10 25h16M14 28h8' stroke='#3c454e' stroke-width='.8' opacity='.5'/><circle cx='23' cy='13' r='2' fill='#fff8e6'/></svg>"
  );

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${AUTHOR_NAME}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['teknoloji', 'jeopolitik', 'bilim', 'düşünce', 'türkiye', 'yapay zeka', 'mühendislik', 'analiz', 'deneme'],
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  icons: {
    icon: FAVICON,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: `${SITE_NAME} RSS` }],
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${AUTHOR_NAME}`,
    description: SITE_DESCRIPTION,
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: SITE_NAME,
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${AUTHOR_NAME}`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
    creator: '@Yedikarat',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'Mj2Vl6gc0tRK2M15UWc6nIy3MXyhHfNGz6pAe59376A',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#16140f' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Structured Data: WebSite (Google için)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Zihin Haritasi',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    inLanguage: 'tr-TR',
  };

  // Structured Data: Person (Yazar — Google "Author" panelinde gözükür)
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: SITE_URL,
    sameAs: [
      'https://x.com/Yedikarat',
      'https://www.linkedin.com/in/muhammet-fatih-i%C5%9F%C4%B1k-096b58301/',
      // 'https://github.com/MFatih-hub',
    ],
    jobTitle: 'Yazar, Mühendis, Araştırmacı',
    description: 'Teknoloji, jeopolitik, bilim ve düşünce üzerine yazıyor.',
  };

  const quote = quoteOfTheDay();

  return (
    <html lang="tr">
      <body>
        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />

        {/* Google Analytics — GA_ID tanımlıysa yüklenir */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}

        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="site-brand">
              <BrandMark />
              <div>
                <div className="site-title">Zihin Haritası</div>
                <div className="site-title-sub">Muhammet Fatih Işık</div>
              </div>
            </Link>
            <nav className="site-nav">
              <HeaderSiteSearch />
              <ThemeToggle />
              <Link href="/"><span className="nav-text">Ana sayfa</span></Link>
              <Link href="/okuma-bulteni"><span className="nav-text">Okuma Bülteni</span></Link>
              <Link href="/kitap-tahlilleri"><span className="nav-text">Kitap Tahlilleri</span></Link>
              {user && (
                <>
                  <Link href="/admin"><span className="nav-text">Admin</span></Link>
                  <Link href="/admin/cikis"><span className="nav-text">Çıkış</span></Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="container">
            {(() => {
              const q = quote;
              return (
                <figure className={`footer-quote${q.verses ? ' footer-quote-verses' : ''}`}>
                  <Glint still className="footer-glint" />
                  {q.verses ? (
                    <>
                      <blockquote className="quote-ar" dir="rtl" lang="ar">
                        {q.verses.map((v) => (
                          <span key={v.n}>
                            {v.ar}{' '}
                            <span className="ayah-no">﴿{v.n.toLocaleString('ar-EG')}﴾</span>{' '}
                          </span>
                        ))}
                      </blockquote>
                    </>
                  ) : (
                    <blockquote>{q.text}</blockquote>
                  )}
                  {!q.verses && <figcaption>{q.who}</figcaption>}
                </figure>
              );
            })()}
            <p className="footer-meta">
              © {new Date().getFullYear()} {AUTHOR_NAME} ·{' '}
              <Link href="/feed.xml" style={{ color: 'var(--accent)' }}>RSS</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
