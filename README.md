# Zihin Haritası — Akademik Kişisel Kütüphane

Modern akademik kaynak yönetim sistemi. Journal, kitap, handbook ve referans çalışmalarını alan/tür/dil filtreleriyle organize eden, PDF yükleyip notlar tutulabilen kişisel kütüphane.

## Özellikler

- 📚 27 akademik alan (Elsevier subject areas yapısı)
- 📖 6 kaynak türü: Journal, Book, Textbook, Handbook, Reference Work, Whitepaper
- 🔍 ⌘K ile hızlı arama
- 🌗 Açık/Koyu tema
- ✏️ Inline notlar düzenleme
- 🔗 Sosyal paylaşım
- 📱 Mobile-responsive
- 🎨 Edebi-akademik tasarım

## Yapı

```
app/
├── page.tsx              → Ana sayfa (kütüphane listesi, filtreler)
├── library-client.tsx    → Filtre ve liste UI
├── kaynak/[slug]/page.tsx → Kaynak detay sayfası
├── admin/                → Yönetim paneli
├── giris/                → Giriş sayfası
└── layout.tsx            → Header, footer

components/
├── filter-sidebar.tsx    → Hiyerarşik filtre sidebar
├── search-bar.tsx        → ⌘K arama
├── theme-toggle.tsx      → Tema değiştirici
├── notes-editor.tsx      → Inline not düzenleme
└── share-buttons.tsx     → Paylaşım butonları

lib/
├── supabase-browser.ts
├── supabase-server.ts
└── helpers.ts            → Alanlar, türler, diller, slugify
```

## Deployment

Environment Variables (Vercel'de):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BUCKET_NAME` (örn: `documentspdfs`)
