import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import ThemeToggle from '@/components/theme-toggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zihin Haritası — Muhammet Fatih Işık',
  description: 'Teknoloji, jeopolitik, bilim ve düşünce üzerine yazılar.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E📓%3C/text%3E%3C/svg%3E" />
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
              <ThemeToggle />
              <Link href="/"><span className="nav-text">Ana sayfa</span></Link>
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
            <p>© {new Date().getFullYear()} Muhammet Fatih Işık · Tüm yazılar yazara aittir</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
