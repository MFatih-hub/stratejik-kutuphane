# Zihin Haritası — Blog

Muhammet Fatih Işık'ın kişisel yazı sitesi. Next.js 14 + Supabase + Vercel.

## 🚀 Hızlı Kurulum (sıfırdan)

### 1. Supabase'i Hazırla
1. https://supabase.com/dashboard projene git
2. Sol menüden **SQL Editor** → **New query**
3. `SUPABASE-SETUP.sql` dosyasının tüm içeriğini kopyala ve yapıştır, **Run** bas
4. Ardından **aynı şekilde** `SUPABASE-MIGRATION-v2.sql` dosyasını da çalıştır (yeni editör, analitik ve okuyucu takibi için gereken tablo/fonksiyonları ekler)
5. Ardından `SUPABASE-MIGRATION-v3.sql`'i çalıştır (içerik türleri için `post_type` ve kaynak alanlarını ekler)
6. Ardından `SUPABASE-MIGRATION-v4.sql`'i ve `SUPABASE-MIGRATION-v5.sql`'i çalıştır (v5: okuma durumu, fişler, okuma günleri)
   — v4: (Kitap Tahlilleri için `book_author`, `reading_order` ve `reading_module` alanlarını ekler — daha önce çalıştırdıysan tekrar çalıştırmak güvenli)
7. "...hazır" yazan mesajları görmelisin ✓

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

## 📖 Günlük Kullanım: Bugün, Fişler, Harita

Site artık okuma sürecini de taşır (önce `SUPABASE-MIGRATION-v5.sql` çalıştırılmalı):

- **`/admin/bugun` — Bugün:** okuduğun eser(ler), kaldığın sayfa, hızlı fiş kutusu (Not / Alıntı / Soru, sayfa numarası, Ctrl+Enter), o esere ait fişler (düzenle/sil), "Bitirdim", "Tahlili yaz". Yanda: *Bugün hatırla* (her gün bir haftadan eski bir fiş), *Tempo* (son 30 gün, sıradaki eşik ve listenin sonu için tahmini tarih, son 120 günün okuma noktaları) ve *Tahlil bekleyenler*.
- **Okuma durumu** (`posts.reading_status`): sırada → okunuyor → okundu (tahlil bekliyor) → yazıldı. Tahlil içeriği dolunca veritabanı tetikleyicisi durumu kendiliğinden "yazıldı" yapar.
- **Fişler** (`notes` tablosu, sadece admin görür): `/admin/notlar` tam metin arama + türe göre filtre.
- **Çevrimdışı:** bağlantı yokken alınan fiş tarayıcıda saklanır, bağlantı gelince gönderilir.
- **Editör:** kitap tahlilinde sağ panelde o eserin fişleri — "Metne ekle" ile imlecin olduğu yere eklenir. "Yazma modu" (Esc ile çıkış) her şeyi karartır; sadece metin, ufuk ve ışıltı kalır.
- **`[[bağlantılar]]`:** fişte ya da tahlilde `[[#247]]`, `[[Etika]]`, `[[Spinoza, Etika]]` → `/eser?ad=…` esere yönlendirir. Tahlil sayfasında "Bu esere değinen tahliller" listelenir. `/admin/harita`: bütün bağlar ufuk çizgisi üzerinde yaylar olarak.
- **Telefon:** site ana ekrana eklenebilir (manifest + ikon); açılınca doğrudan Bugün gelir.
- **Admin listesi** sayfalı (50'şer), duruma göre filtre ve `#sıra` / başlık / yazar araması.
- **Dokunuşlar:** ışıltı tahlil sayısıyla çok yavaş güçlenir; bir durak bitince bir kerelik parlar. Tema düğmesi varsayılan *Otomatik*: İstanbul'da gün batımından sonra Gece Denizi. Uzun metinlerde yazı boyu / satır aralığı ayarı.

**Okuma Bülteni bölümü kaldırıldı** (sayfalar, API, toplu ekleme). Veritabanındaki eski bülten kayıtları silinmedi; eski adresler ana sayfaya yönlenir.

## 🌊 Görsel Dil: Durgun Deniz

Sakin, metalik ve yormayan bir görünüm: hiçlik içinde tek bir küçük ışıltı.

- **Temalar** (`app/globals.css` sonundaki "DURGUN DENİZ" katmanı): açık = *Sis*, koyu = *Gece Denizi*, mavi = *Metalik Deniz*. Tüm renkler CSS değişkenleri (`--metal-*`, `--glint-*`, `--sea-*`).
- **Arka plan:** üstte açık gök, ortada sönük bir ufuk parıltısı, altta deniz tonu (sabit, hareketsiz).
- **Işıltı** (`components/calm.tsx` → `Glint`): sitedeki tek hareket, 7 saniyede bir yavaşça nefes alır; okuma yolculuğunda "sıradaki eser" odur. `prefers-reduced-motion` açıksa durur.
- **Logo ve sekme ikonu:** metalik disk + ufuk çizgisi + minik ışık. Ana sayfa hero'sunda durgun deniz çizimi (`SeaHorizon`).
- **Rozetler** (`components/milestones.tsx`): ince bir çizgi üstünde yıldızlar — kazanılanlar ışıldar.
- **Sayfa altı:** her gün değişen kısa bir söz (`lib/quotes.ts`). **404:** "Burada yalnızca durgun su var".

## 🎨 Kategoriler

- Teknoloji & Mühendislik
- Jeopolitik & Strateji
- Bilim & Doğa
- Ekonomi & Finans
- Düşünce & Felsefe
- Türkiye

Kategorileri değiştirmek için: `lib/helpers.ts` → `CATEGORIES` array'ini düzenle. Her kategorinin iki kimliği var: `slug` veritabanında saklanan iç değerdir (değiştirme — mevcut kayıtlar bu değerle duruyor), `path` ise adreste görünendir (`/kategori/felsefe`). Eski adresler (`/kategori/dusunce` gibi) `next.config.js`'teki yönlendirmelerle yenisine gider.

## 🗂️ Üç İçerik Türü

Site üç ayrı, birbirine karışmayan bölümde yayın yapar. Hepsi aynı `posts` tablosunda tutulur, `post_type` ile ayrışır ve her biri kendi URL önekinde yaşar:

| Tür | `post_type` | Adres | Ne için |
|---|---|---|---|
| Yazı | `yazi` | `/yazi/…` | Kendi denemelerin/analizlerin. Ana sayfa ve kategori sayfaları sadece bunları listeler. |
| Kitap Tahlili | `kitap_tahlili` | `/kitap-tahlilleri/…` | Okuduğun kitaplar üzerine tahliller — kendi ayrı bölümü. |

`/admin`'deki **"İçerik Türü"** seçiciyle (yeni yazı / düzenleme ekranında) bir kaydın türünü belirlersin.

### Kitap Tahlilleri toplu ekleme (okuma listesi → site)

**`/admin/kitap-tahlilleri/toplu-ekle`** (admin panelde "📚 Tahlil: Toplu Ekle"): okuma listesini tek seferde siteye aktarır. Önce `SUPABASE-MIGRATION-v4.sql` çalıştırılmış olmalı.

1. Excel'de **Sıra · Yazar · Metin** sütunlarını seç (başlık satırıyla ya da onsuz), kopyala, kutuya yapıştır. İsteğe bağlı sütunlar: **Kategori** ve **Durak** (modül, ör. "Mantık"). Başlık satırı varsa sütun sırası önemli değil (Sıra/No, Yazar/Author, Metin/Başlık/Eser/Kitap, Kategori/Alan tanınır). Etiketli bloklar da çalışır (`Sıra:`, `Yazar:`, `Metin:`, `Kategori:`; bloklar boş satırla ayrılır).
2. Önizlemede "Kontrol edilecekler" sekmesi eksik yazar/başlık, tekrarlanan sıra numarası ve sitede zaten olan eserleri gösterir. Sitede zaten olan eserler (aynı sıra + başlık) otomatik olarak işaretsiz gelir — aynı listeyi ikinci kez yapıştırmak kopya oluşturmaz.
3. Sitede aynı sıra numarasıyla zaten olan eserler varsayılan olarak **güncellenir** (başlık, yazar, durak; tahlil notu, kategori ve yayın durumu değişmez) — böylece listeyi düzeltilmiş hâliyle ya da durak sütunu eklenmiş hâliyle tekrar yapıştırmak kopya oluşturmaz. Kutunun işareti kaldırılırsa sitede olanlar atlanır.
4. "Ekle" yenileri 100'erli partilerle yazar. Her eser `post_type = 'kitap_tahlili'`, boş `content` ile oluşur; adresi `/kitap-tahlilleri/<sıra>-<başlık>` olur.

Sonra `/admin?tur=kitap_tahlili` sekmesinde (okuma sırasına göre dizili) bir esere "Not yaz" deyip tahlil notunu editörde yazarsın. Editörün sağ panelinde **Yazar** ve **Okuma listesindeki sıra** alanları da düzenlenebilir.

**Okuma yolculuğu:** `/kitap-tahlilleri` sayfasının başında her eser bir kare olarak görünür (tahlili yazılan dolu, sıradaki eser yanıp sönen çerçeveli). "Şu an buradayım" = tahlili yazılmamış en küçük sıra numaralı eser; "En son tamamlanan" = en son güncellenen tahlil. Eserlere Durak verilmişse kareler duraklara ayrılır (16'dan fazla durak varsa kompakt görünüm: sadece içinde bulunulan durağın kareleri, altında tüm yolculuğu gösteren durak şeridi ve açılır durak listesi) ve her durağın ilerleme çubuğu görünür (durak adına tıklayınca liste o durağa süzülür, `?modul=`). Tahlil sayfasında okuma listesindeki önceki/sonraki eser bağlantıları vardır. Ana sayfada son tahliller ve bu yolculuğun özeti gösterilir.

`/kitap-tahlilleri` sayfası eserleri okuma sırasına göre, 100'erli sayfalar halinde listeler; "Tüm liste / Tahlili yazılanlar / Sırada bekleyenler" filtresi, alan filtresi, eser/yazar araması ve ilerleme çubuğu vardır. Tahlili yazılmış eserler bağlantılıdır; notu henüz yazılmamış eserlerin sayfası "tahlil henüz yazılmadı" der, arama motorlarına kapalıdır (noindex) ve sitemap'e ve site aramasına girmez.

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
  api/
  giris/page.tsx                    # Admin giriş
  admin/
    page.tsx                        # İçerik yönetim paneli (tür sekmeleriyle)
    analiz/
      page.tsx                      # Okuyucu analitiği (sunucu tarafı veri)
      analytics-client.tsx          # Canlı akış + grafikler
    cikis/page.tsx                  # Çıkış
    kitap-tahlilleri/
      toplu-ekle/
        page.tsx                    # Kitap tahlili toplu ekleme (auth guard)
        bulk-add-client.tsx         # Excel'den yapıştır → önizle → 100'erli partilerle ekle
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
  book-import.ts                    # Excel/etiketli metinden eser listesi ayrıştırıcı
  content.ts                        # Başlık çıkarma, HTML temizleme (sanitize)
  visitor.ts                        # Anonim ziyaretçi kimliği (çerez)
  supabase-browser.ts               # Client-side Supabase
  supabase-server.ts                # Server-side Supabase
SUPABASE-SETUP.sql                  # İlk kurulum (sıfırdan)
SUPABASE-MIGRATION-v2.sql           # content_format, page_views, record_post_view()
SUPABASE-MIGRATION-v3.sql           # post_type + Okuma Bülteni kaynak alanları
SUPABASE-MIGRATION-v4.sql           # book_author + reading_order (Kitap Tahlilleri)
SEO-CHECKLIST.md                    # Yazı öncesi/sonrası SEO kontrol listesi
```

---

© Muhammet Fatih Işık
