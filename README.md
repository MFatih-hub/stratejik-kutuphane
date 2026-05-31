# Zihin Haritası — Blog

Muhammet Fatih Işık'ın kişisel yazı sitesi. Next.js 14 + Supabase + Vercel.

## 🚀 Hızlı Kurulum

### 1. Supabase'i Hazırla
1. https://supabase.com/dashboard projene git
2. Sol menüden **SQL Editor** → **New query**
3. `SUPABASE-SETUP.sql` dosyasının tüm içeriğini kopyala ve yapıştır
4. **Run** bas
5. "Posts tablosu hazır" yazısını görmelisin ✓

### 2. Vercel'e Deploy Et
1. GitHub'a repo'yu push et
2. Vercel'de yeni proje oluştur → bu repo'yu seç
3. **Environment Variables** ekle:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase projenin URL'i
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon key
   - `NEXT_PUBLIC_BUCKET_NAME` → `documentspdfs` (veya bucket adın)
4. **Deploy** bas

### 3. Storage Bucket'ı Hazırla (Görseller için)
1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `documentspdfs` (veya istediğin)
3. **Public bucket** toggle'ını AÇ
4. Save

### 4. Admin Kullanıcısı Oluştur
1. Supabase Dashboard → **Authentication** → **Users**
2. **Add user** → **Create new user**
3. E-posta ve şifre gir
4. **Confirm email** OPSİYONEL — emin değilsen tıkla
5. **Authentication** → **Providers**: "Allow new users to sign up" → **KAPAT**
   (Sadece sen giriş yapabil)

### 5. Siteni Aç
- Ana sayfa: `https://senin-domain.vercel.app`
- Admin giriş (gizli): `https://senin-domain.vercel.app/giris`
- Admin panel: `https://senin-domain.vercel.app/admin`

## 📝 Yazı Yazmak

1. `/giris` → e-posta + şifre
2. `/admin` → "Yeni Yazı" butonu
3. Markdown editöründe yaz
4. Kategori seç, etiket ekle, kapak görseli yükle
5. **Taslak Kaydet** veya **Yayınla**

## 📋 Markdown Hızlı Rehber

```markdown
# Başlık
## Alt başlık

**kalın** *italik* ~~üstü çizili~~

- liste
- öğeleri

1. Sıralı
2. Liste

> Alıntı

[link metni](https://url.com)

![görsel](https://url.com/img.jpg)

`kod parçası`

```kod bloğu```
```

## 🎨 Kategoriler

- Teknoloji & Mühendislik
- Jeopolitik & Strateji
- Bilim & Doğa
- Ekonomi & Finans
- Düşünce & Felsefe
- Türkiye

Kategorileri değiştirmek için: `lib/helpers.ts` → `CATEGORIES` array'ini düzenle.

## 🛠️ Yerel Geliştirme

```bash
npm install
cp .env.example .env.local
# .env.local'i kendi Supabase bilgilerinle doldur
npm run dev
```

http://localhost:3000

## 📁 Dosya Yapısı

```
app/
  page.tsx                          # Ana sayfa (yazı listesi)
  yazi/[slug]/page.tsx              # Yazı detay
  kategori/[slug]/page.tsx          # Kategori sayfası
  giris/page.tsx                    # Admin giriş
  admin/
    page.tsx                        # Yazı yönetim paneli
    cikis/page.tsx                  # Çıkış
    yazi/
      yeni/page.tsx                 # Yeni yazı
      [id]/duzenle/
        page.tsx                    # Düzenle
        editor-client.tsx           # Markdown editör
components/
  theme-toggle.tsx                  # 3 tema (light/dark/blue)
  share-buttons.tsx                 # Sosyal paylaşım
lib/
  helpers.ts                        # Kategoriler ve yardımcılar
  supabase-browser.ts               # Client-side Supabase
  supabase-server.ts                # Server-side Supabase
```

---

© Muhammet Fatih Işık
