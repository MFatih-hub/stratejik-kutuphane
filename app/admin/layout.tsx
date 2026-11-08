import type { Metadata } from 'next';
import './admin.css';

// Yönetim paneli: her sayfa kendi oturum denetimini yapar (middleware de çerezsiz
// istekleri baştan geri çevirir). Stiller yalnızca burada yüklenir.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
