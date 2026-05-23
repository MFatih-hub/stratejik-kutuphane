# Stratejik Kütüphane

Kişisel okuma blogu — 10 stratejik gelenek, kaynaklar, PDF arşivi ve notlar.

## Bu projenin yapısı

```
app/
├── page.tsx              → Ana sayfa (10 adım kartı)
├── adim/[slug]/page.tsx  → Adım detay sayfası (kategoriler + kaynaklar)
├── kaynak/[slug]/page.tsx → Kaynak detay sayfası (PDF + notlar)
├── admin/                → Yönetim paneli (kaynak ekle/sil)
├── giris/                → Giriş sayfası
└── layout.tsx            → Genel iskelet

lib/
├── supabase-browser.ts   → Tarayıcı tarafı Supabase istemcisi
├── supabase-server.ts    → Sunucu tarafı Supabase istemcisi
└── helpers.ts            → Yardımcı fonksiyonlar (slugify, vs.)
```

## Vercel'e nasıl deploy edilir

1. Bu klasörü GitHub'a push et
2. Vercel'de "Add New Project" → GitHub repo'yu seç
3. Environment Variables ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BUCKET_NAME` (örn: `documentspdfs`)
4. Deploy bas

## Yerel geliştirme (opsiyonel)

```bash
npm install
cp .env.local.example .env.local
# .env.local içine kendi anahtarlarını yaz
npm run dev
```

`http://localhost:3000` adresinde açılır.
