/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Görsel dönüştürme kapalı: görseller doğrudan Supabase'den gelir. Vercel'in
  // /_next/image servisi hiç kullanılmaz (dışarıdan kötüye kullanılamaz, ücret yazmaz).
  images: { unoptimized: true },
  async redirects() {
    // Kategori adresleri adlarıyla eşleşsin diye değişti; eski adresler kalıcı olarak yönlenir.
    const map = {
      teknoloji: 'muhendislik', jeopolitik: 'politika', bilim: 'sosyoloji',
      ekonomi: 'finans', dusunce: 'felsefe', turkiye: 'tarih',
    };
    return [
      ...Object.entries(map).map(([from, to]) => ({
        source: `/kategori/${from}`,
        destination: `/kategori/${to}`,
        permanent: true,
      })),
      // Kaldırılan bölümler: eski bağlantılar boşa düşmesin
      { source: '/okuma-bulteni', destination: '/', permanent: false },
      { source: '/okuma-bulteni/:path*', destination: '/', permanent: false },
      { source: '/admin/okuma-bulteni/:path*', destination: '/admin', permanent: false },
      { source: '/kavram', destination: '/', permanent: false },
      { source: '/kavram/:path*', destination: '/', permanent: false },
      { source: '/admin/bugun', destination: '/admin/dem', permanent: true },
      // Eski okuma listesine bağlı sayfalar (Kasım 2026'da yeni okuma planıyla kaldırıldı)
      { source: '/izleme-listesi', destination: '/kitap-tahlilleri', permanent: false },
      { source: '/admin/liste-duzenle', destination: '/admin', permanent: false },
      // Yazdırma sayfası yönetim paneline taşındı
      { source: '/yazdir/:id', destination: '/admin/yazdir/:id', permanent: true },
    ];
  },
};

module.exports = nextConfig;
