import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import ThemeToggle from '@/components/theme-toggle';
import SearchBar from '@/components/search-bar';

export const metadata = {
  title: 'Zihin Haritası',
  description: 'Muhammet Fatih Işık — akademik kişisel kütüphane',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="tr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="site-brand">
              <div className="site-brand-mark">Z</div>
              <div>
                <div className="site-title">Zihin Haritası</div>
                <div className="site-title-sub">Muhammet Fatih Işık</div>
              </div>
            </Link>
            <nav className="site-nav">
              <SearchBar />
              <ThemeToggle />
              <Link href="/"><span className="nav-text">Ana sayfa</span></Link>
              {user ? (
                <>
                  <Link href="/admin"><span className="nav-text">Admin</span></Link>
                  <Link href="/admin/cikis"><span className="nav-text">Çıkış</span></Link>
                </>
              ) : (
                <Link href="/giris"><span className="nav-text">Giriş</span></Link>
              )}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            Kişisel okuma günlüğü · {new Date().getFullYear()}
          </div>
        </footer>
      </body>
    </html>
  );
}
