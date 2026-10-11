/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Kategori adresleri adlarıyla eşleşsin diye değişti; eski adresler kalıcı olarak yönlenir.
  async redirects() {
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
      // Okuma Bülteni bölümü kaldırıldı; eski bağlantılar ana sayfaya gider
      { source: '/okuma-bulteni', destination: '/', permanent: false },
      { source: '/okuma-bulteni/:path*', destination: '/', permanent: false },
      { source: '/admin/okuma-bulteni/:path*', destination: '/admin', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
