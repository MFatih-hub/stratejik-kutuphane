# Zihin Haritası — Blog

Muhammet Fatih Işık'ın kişisel yazı sitesi. Next.js 14 + Supabase + Vercel.

## 🚀 Hızlı Kurulum (sıfırdan)

### 1. Supabase'i Hazırla
1. https://supabase.com/dashboard projene git
2. Sol menüden **SQL Editor** → **New query**
3. `SUPABASE-SETUP.sql` dosyasının tüm içeriğini kopyala ve yapıştır, **Run** bas
4. Ardından **aynı şekilde** `SUPABASE-MIGRATION-v2.sql` dosyasını da çalıştır (yeni editör, analitik ve okuyucu takibi için gereken tablo/fonksiyonları ekler)
5. Ardından `SUPABASE-MIGRATION-v3.sql`'i çalıştır (Okuma Bülteni + Kitap Tahlilleri bölümleri için `post_type` ve kaynak alanlarını ekler)
6. "...hazır" yazan mesajları görmelisin ✓

> Zaten çalışan bir siten varsa (yazıların DB'de duruyor) **sadece** eksik olan migration dosyalarını çalıştırman yeterli — hepsi eklemelidir, hiçbir yazını silmez.

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

## 🗂️ Üç İçerik Türü

Site üç ayrı, birbirine karışmayan bölümde yayın yapar. Hepsi aynı `posts` tablosunda tutulur, `post_type` ile ayrışır ve her biri kendi URL önekinde yaşar:

| Tür | `post_type` | Adres | Ne için |
|---|---|---|---|
| Yazı | `yazi` | `/yazi/…` | Kendi denemelerin/analizlerin. Ana sayfa ve kategori sayfaları sadece bunları listeler. |
| Kitap Tahlili | `kitap_tahlili` | `/kitap-tahlilleri/…` | Okuduğun kitaplar üzerine tahliller — kendi ayrı bölümü. |
| Okuma Bülteni | `okuma_bulteni` | `/okuma-bulteni/…` | Zihin Haritası Okuma Bülteni'nden paylaşılan linkler + özetleri. |

`/admin`'deki **"İçerik Türü"** seçiciyle (yeni yazı / düzenleme ekranında) bir kaydın türünü belirlersin.

### Okuma Bülteni linkleri nasıl çalışır (retweet + alıntı mantığı)

Bir Okuma Bülteni kaydının `content` alanı (normal yazılarda "yazı gövdesi" olan alan) burada **senin o linke yazdığın yorum** için kullanılır — Twitter/X'te bir şeyi retweet edip altına kendi yorumunu eklemek gibi:

1. **Kaynak Adı**, **Kaynak URL** ve **Kaynağın Özeti** alanlarını doldurup yayınla — link+özet siteye çıkar, yorum alanı boş kalabilir.
2. İstediğin zaman `/admin`'den o kaydı aç, editördeki ana metin alanına (artık "Yorumun" olarak etiketlenir) yorumunu yaz, kaydet.
3. `/okuma-bulteni/senin-linkin` sayfası artık hem alıntılanan kaynağı (kutu içinde, kaynağa link vererek) hem de altında senin yorumunu gösterir. Yorum yoksa o bölüm hiç görünmez — sayfa sade bir paylaşım gibi kalır.

### Toplu ekleme

Bülten günde birkaç kez onlarca link üretebildiği için tek tek admin formundan girmek yerine **`/admin/okuma-bulteni/toplu-ekle`** kullanılabilir: `Kategori:`, `Başlık:`, `Kaynak:`, `URL:`, `Özet:` etiketleriyle yazılmış, boş satırla ayrılmış bloklar halinde metin yapıştırılır, önizlenir (kategori otomatik tahmin edilir, elle düzeltilebilir) ve tek seferde eklenir. Bu araç otomatik bir bağlantı **kurmaz** — bülteni üreten süreç hâlâ e-posta taslağı oluşturuyor; bu sayfa sadece o çıktıyı siteye aktarmayı hızlandırır.

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
  page.tsx                          # Ana sayfa (sadece "yazi" türü + arama kutusu)
  yazi/[slug]/page.tsx              # Yazı detay (okuma çubuğu, içindekiler, ilgili yazılar)
  kategori/[slug]/page.tsx          # Kategori sayfası (sadece "yazi" türü)
  kitap-tahlilleri/
    page.tsx                        # Kitap Tahlilleri listesi
    [slug]/page.tsx                 # Kitap Tahlili detay
  okuma-bulteni/
    page.tsx                        # Okuma Bülteni listesi (kategori filtresiyle)
    [slug]/page.tsx                 # Tekil link + alıntı bloğu + yorum
  giris/page.tsx                    # Admin giriş
  admin/
    page.tsx                        # İçerik yönetim paneli (tür sekmeleriyle)
    analiz/
      page.tsx                      # Okuyucu analitiği (sunucu tarafı veri)
      analytics-client.tsx          # Canlı akış + grafikler
    cikis/page.tsx                  # Çıkış
    okuma-bulteni/
      toplu-ekle/
        page.tsx                    # Toplu ekleme (auth guard)
        bulk-add-client.tsx         # Yapıştır → ayrıştır → önizle → ekle
    yazi/
      yeni/page.tsx                 # Yeni yazı/tahlil/link (?tur= ile ön-seçili)
      [id]/duzenle/
        page.tsx                    # Düzenle (tüm türler tek editörü paylaşır)
        editor-client.tsx           # Editör mantığı: tür seçici, otomatik kaydetme, yayınlama
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
SUPABASE-MIGRATION-v2.sql           # content_format, page_views, record_post_view()
SUPABASE-MIGRATION-v3.sql           # post_type + Okuma Bülteni kaynak alanları
SEO-CHECKLIST.md                    # Yazı öncesi/sonrası SEO kontrol listesi
```

---

© Muhammet Fatih Işık
