import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export const metadata = {
  title: 'Stratejik Kütüphane',
  description: '10 adımda dünya politikasının iç anatomisi — kişisel okuma günlüğü',
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
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-books" style={{ fontSize: 22, color: 'var(--accent)' }}></i>
              <div>
                <div className="site-title">Stratejik Kütüphane</div>
                <div className="site-title-sub">10 adımda dünya politikası</div>
              </div>
            </Link>
            <nav className="site-nav">
              <Link href="/">Ana sayfa</Link>
              {user ? (
                <>
                  <Link href="/admin">Admin</Link>
                  <Link href="/admin/cikis">Çıkış</Link>
                </>
              ) : (
                <Link href="/giris">Giriş</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer style={{ marginTop: '5rem', padding: '2rem 0', borderTop: '0.5px solid var(--border)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          <div className="container">
            Kişisel okuma günlüğü · {new Date().getFullYear()}
          </div>
        </footer>
      </body>
    </html>
  );
}
