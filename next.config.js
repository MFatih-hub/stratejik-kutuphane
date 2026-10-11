/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Kategori adresleri adlarıyla eşleşsin diye değişti; eski adresler kalıcı olarak yönlenir.
  async redirects() {
    const map = {
      teknoloji: 'muhendislik', jeopolitik: 'politika', bilim: 'sosyoloji',
      ekonomi: 'finans', dusunce: 'felsefe', turkiye: 'tarih',
    };
    return Object.entries(map).map(([from, to]) => ({
      source: `/kategori/${from}`,
      destination: `/kategori/${to}`,
      permanent: true,
    }));
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
