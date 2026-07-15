# Zihin Haritası — Blog

Muhammet Fatih Işık'ın kişisel yazı sitesi. Next.js 14 + Supabase + Vercel.

## 🚀 Hızlı Kurulum (sıfırdan)

### 1. Supabase'i Hazırla
1. https://supabase.com/dashboard projene git
2. Sol menüden **SQL Editor** → **New query**
3. `SUPABASE-SETUP.sql` dosyasının tüm içeriğini kopyala ve yapıştır, **Run** bas
4. Ardından **aynı şekilde** `SUPABASE-MIGRATION-v2.sql` dosyasını da çalıştır (yeni editör, analitik ve okuyucu takibi için gereken tablo/fonksiyonları ekler)
5. "...hazır" yazan mesajları görmelisin ✓

> Zaten çalışan bir siten varsa (yazıların DB'de duruyor) **sadece** `SUPABASE-MIGRATION-v2.sql`'i çalıştırman yeterli — eklemeli bir script, hiçbir yazını silmez.

### 2. Vercel'e Deploy Et
1. GitHub'a repo'yu push et
2. Vercel'de yeni proje oluştur → bu repo'yu seç
3. **Environment Variables** ekle (`.env.example` dosyasındaki isimlerle aynı):
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase projenin URL'i
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon key
   - `NEXT_PUBLIC_BUCKET_NAME` → `documentspdfs` (veya bucket adın)
   - `NEXT_PUBLIC_SITE_URL` → canlı site adresin (örn. `https://senin-domain.vercel.app`)
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
- Okuyucu analitiği: `https://senin-domain.vercel.app/admin/analiz`

## ✍️ Yazı Yazmak (Word/Notion tarzı editör)

1. `/giris` → e-posta + şifre
2. `/admin` → "Yeni Yazı" butonu
3. Üstteki araç çubuğuyla biçimlendir: başlıklar, **kalın**, *italik*, listeler, alıntı, kod, hizalama, bağlantı — hepsi yazarken anında göründüğü gibi kaydedilir, markdown işareti yazmana gerek yok
4. Görsel eklemek için araç çubuğundaki 📷 butonuna bas, ya da görseli doğrudan yazının içine sürükle-bırak/yapıştır
5. Sağ üstte **"Tam ekran"** ile dikkat dağıtmadan yazabilirsin
6. Yazarken birkaç saniyede bir **otomatik kaydedilir** (üstte "Kaydedildi · saat" yazısını görürsün) — internetin gitse veya sekmeyi kapatsan bile son halin Supabase'de duruyor
7. Kategori seç, etiket ekle, kapak görseli yükle (sağ panel)
8. **Taslak Kaydet** veya **Yayınla**

Eski (markdown ile yazılmış) yazıların açıldığında otomatik olarak yeni editöre uygun hale getirilir — hiçbir şey kaybolmaz, tekrar kaydettiğinde yeni formatta saklanır.

## 📊 Okuyucu Analitiği

`/admin/analiz` sayfasında:
- Toplam / son 24 saat / son 7 gün görüntülenme
- Son 14 günün günlük grafiği
- Yazı başına toplam ve son 7 günlük görüntülenme (sıralanabilir)
- **"Şu an okunuyor"** — biri bir yazını açtığı an, sayfayı yenilemene bile gerek kalmadan burada anında görünür (Supabase Realtime ile)
- Trafiğin nereden geldiği (Google, X, doğrudan, vb.)

Görüntülenme sayacı artık güvenli şekilde çalışıyor: eski sürümde sayaç güncellemesi Supabase'in güvenlik kurallarına (RLS) takılıp sessizce başarısız oluyordu — `SUPABASE-MIGRATION-v2.sql` bunu `record_post_view()` adlı bir veritabanı fonksiyonuyla düzeltiyor. Aynı ziyaretçinin 30 dakika içinde bir yazıyı yenilemesi sayacı şişirmez.

## 🔍 Arama

Header'daki 🔍 ikonu (her sayfadan erişilebilir) ve ana sayfadaki arama kutusu, başlık/özet/etiketlerde anlık arama yapar. Türkçe karakterler (İ/I, ı/i) doğru şekilde eşleşir.

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
  page.tsx                          # Ana sayfa (yazı listesi + arama kutusu)
  yazi/[slug]/page.tsx              # Yazı detay (okuma çubuğu, içindekiler, ilgili yazılar)
  kategori/[slug]/page.tsx          # Kategori sayfası
  giris/page.tsx                    # Admin giriş
  admin/
    page.tsx                        # Yazı yönetim paneli
    analiz/
      page.tsx                      # Okuyucu analitiği (sunucu tarafı veri)
      analytics-client.tsx          # Canlı akış + grafikler
    cikis/page.tsx                  # Çıkış
    yazi/
      yeni/page.tsx                 # Yeni yazı
      [id]/duzenle/
        page.tsx                    # Düzenle
        editor-client.tsx           # Editör mantığı: otomatik kaydetme, yayınlama
components/
  rich-text-editor.tsx              # Word/Notion tarzı WYSIWYG editör (Tiptap)
  post-content.tsx                  # Yazı içeriğini render eder (html + eski markdown)
  table-of-contents.tsx             # İçindekiler (uzun yazılarda)
  reading-progress.tsx              # Okuma ilerleme çubuğu
  related-posts.tsx                 # "Bunları da okuyabilirsin"
  site-search.tsx                   # Arama kutusu + modal
  view-tracker.tsx                  # Görüntülenme kaydı (görünmez bileşen)
  theme-toggle.tsx                  # 3 tema (light/dark/blue)
  share-buttons.tsx                 # Sosyal paylaşım
lib/
  helpers.ts                        # Kategoriler ve yardımcılar
  content.ts                        # Başlık çıkarma, HTML temizleme (sanitize)
  visitor.ts                        # Anonim ziyaretçi kimliği (çerez)
  supabase-browser.ts               # Client-side Supabase
  supabase-server.ts                # Server-side Supabase
SUPABASE-SETUP.sql                  # İlk kurulum (sıfırdan)
SUPABASE-MIGRATION-v2.sql           # Mevcut siteyi güncelleme (eklemeli, güvenli)
SEO-CHECKLIST.md                    # Yazı öncesi/sonrası SEO kontrol listesi
```

---

© Muhammet Fatih Işık
