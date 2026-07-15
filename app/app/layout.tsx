import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@/lib/supabase-server';
import { CATEGORIES } from '@/lib/helpers';
import ThemeToggle from '@/components/theme-toggle';
import { HeaderSiteSearch } from '@/components/site-search';
import './globals.css';

// ⚠️ Burayı kendi domain'inle değiştir (custom domain alınca)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratejik-kutuphane.vercel.app';
const SITE_NAME = 'Zihin Haritası';
const AUTHOR_NAME = 'Muhammet Fatih Işık';
const SITE_DESCRIPTION = 'Teknoloji, jeopolitik, bilim ve düşünce üzerine yazılar. Muhammet Fatih Işık tarafından.';

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
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
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
    creator: '@Yedikarat'
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
    // Google Search Console kayıt sonrası buraya kodu yapıştır:
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
      // İleride sosyal medya hesaplarını ekle:
      'https://x.com/Yedikarat',
      'https://www.linkedin.com/in/muhammet-fatih-i%C5%9F%C4%B1k-096b58301/'
      // 'https://github.com/MFatih-hub',
    ],
    jobTitle: 'Yazar, Mühendis, Araştırmacı',
    description: 'Teknoloji, jeopolitik, bilim ve düşünce üzerine yazıyor.',
  };

  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E📓%3C/text%3E%3C/svg%3E" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} RSS`} href="/feed.xml" />
        <link rel="canonical" href={SITE_URL} />
        {/* Editoryal tipografi: başlıklar için Newsreader (serif), arayüz için Inter (sans). Türkçe karakterler dahil (latin-ext). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Script
          id="schema-person"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />

        {/* Google Analytics (opsiyonel) — açmak için yorum işaretlerini kaldır */}
        {/*
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
        */}
      </head>
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="site-brand">
              <span className="site-title">Zihin Haritası</span>
              <span className="site-title-sub">Muhammet Fatih Işık</span>
            </Link>
            <nav className="site-nav">
              <div className="site-nav-links">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} href={`/kategori/${c.slug}`}>{c.name}</Link>
                ))}
              </div>
              <div className="site-nav-tools">
                <HeaderSiteSearch />
                <ThemeToggle />
                {user && (
                  <>
                    <Link href="/admin" className="nav-text-link">Admin</Link>
                    <Link href="/admin/cikis" className="nav-text-link">Çıkış</Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </header>

        <main className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="container">
            <p>
              © {new Date().getFullYear()} {AUTHOR_NAME} ·{' '}
              <Link href="/feed.xml" style={{ color: 'var(--accent)' }}>RSS</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
