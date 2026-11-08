# Zihin Haritası — Blog

Muhammet Fatih Işık'ın kişisel yazı sitesi. Next.js 14 + Supabase + Vercel.

## 🚀 Hızlı Kurulum (sıfırdan)

### 1. Supabase'i Hazırla
1. https://supabase.com/dashboard projene git
2. Sol menüden **SQL Editor** → **New query**
3. `SUPABASE-SETUP.sql` dosyasının tüm içeriğini kopyala ve yapıştır, **Run** bas
4. Ardından **aynı şekilde** `SUPABASE-MIGRATION-v2.sql` dosyasını da çalıştır (yeni editör, analitik ve okuyucu takibi için gereken tablo/fonksiyonları ekler)
5. Ardından `SUPABASE-MIGRATION-v3.sql`'i çalıştır (içerik türleri için `post_type` ve kaynak alanlarını ekler)
6. Ardından `SUPABASE-MIGRATION-v4.sql`, `SUPABASE-MIGRATION-v5.sql` ve `SUPABASE-MIGRATION-v6.sql`'i sırayla çalıştır (v5: okuma durumu, fişler, okuma günleri · v6: diziler, kaynakça, sürüm geçmişi, sayfa kaydı, aboneler)
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

Üst şeritteki büyüteç (ya da Ctrl/⌘+K): yazılar ve okuma listesindeki bütün eserler içinde arar. Arama dizini statik bir dosyadır (`/ara.json`, saatte bir yenilenir) ve arama tamamen tarayıcıda yapılır; sunucuya ya da veritabanına istek gitmez. Türkçe karakterler (İ/I, ı/i, şapkalı harfler) doğru eşleşir.

## 📖 Günlük Kullanım: Dem, Fişler, Harita

Site artık okuma sürecini de taşır (önce `SUPABASE-MIGRATION-v5.sql` çalıştırılmalı):

- **`/admin/dem` — Dem:** okuduğun eser(ler), kaldığın sayfa, hızlı fiş kutusu (Not / Alıntı / Soru, sayfa numarası, Ctrl+Enter), o esere ait fişler (düzenle/sil), "Bitirdim", "Tahlili yaz". Yanda: *Bugün hatırla* (her gün bir haftadan eski bir fiş), *Tempo* (son 30 gün, sıradaki eşik ve listenin sonu için tahmini tarih, son 120 günün okuma noktaları) ve *Tahlil bekleyenler*.
- **Okuma durumu** (`posts.reading_status`): sırada → okunuyor → okundu (tahlil bekliyor) → yazıldı. Tahlil içeriği dolunca veritabanı tetikleyicisi durumu kendiliğinden "yazıldı" yapar.
- **Fişler** (`notes` tablosu, sadece admin görür): `/admin/notlar` tam metin arama + türe göre filtre.
- **Çevrimdışı:** bağlantı yokken alınan fiş tarayıcıda saklanır, bağlantı gelince gönderilir.
- **Editör:** kitap tahlilinde sağ panelde o eserin fişleri — "Metne ekle" ile imlecin olduğu yere eklenir. "Yazma modu" (Esc ile çıkış) her şeyi karartır; yalnızca metin kalır.
- **`[[bağlantılar]]`:** fişte ya da tahlilde `[[#247]]`, `[[Etika]]`, `[[Spinoza, Etika]]` → sayfa üretilirken doğrudan eserin sayfasına bağlanır (`[[#247]]` gibi sayılı bağlantıda eserin adı yazılır). Tahlil sayfasında "Bu esere değinenler" listelenir. `/admin/harita`: bütün bağlar ufuk çizgisi üzerinde yaylar olarak.
- **Telefon:** site ana ekrana eklenebilir (manifest + ikon); açılınca doğrudan Dem gelir.
- **Admin listesi** sayfalı (50'şer), duruma göre filtre ve `#sıra` / başlık / yazar araması.
- **Tema düğmesi** varsayılan *Otomatik*: İstanbul'da gün batımından sonra Gece Denizi.

## 📦 Yazmak, saklamak, paylaşmak (v6)

`SUPABASE-MIGRATION-v6.sql` çalıştırıldıktan sonra:

- **İndir (yalnızca yönetici):** editörde *PDF · Word · Markdown*. PDF, tarayıcının yazdırma penceresinden kaydedilir (`/admin/yazdir/[id]`, A4, sayfa numaralı); Word gerçek `.docx`'tir (başlık stilleri, gerçek dipnotlar, gömülü görseller, Arapça sağdan sola); Markdown başında bilgi bloğuyla (Obsidian'a uygun). Okurlar yazıyı tarayıcıdan yazdırınca yalnızca metin çıkar.
- **Kitap notlarını indir:** editörde bir eserin bütün fişleri sayfa sırasıyla PDF / Word / Markdown.
- **Tam yedek:** Admin → *Tam yedek indir* → tek ZIP (yazılar ve notlar Markdown, bütün tablolar JSON). **Haftalık otomatik yedek:** her pazartesi 06:00'da (İstanbul) aynı ZIP e-postana gelir (`vercel.json` cron → `/api/cron/yedek`). GitHub deposu herkese açık olduğu için yedek bilerek oraya konmuyor.
- **Sürüm geçmişi:** veritabanı yazının eski hâllerini kendiliğinden saklar (en fazla 10 dakikada bir; bir bölüm silindiğinde hemen; yazı başına son 200). Editör → *Sürüm geçmişi* → önizle → *Bu sürüme dön*.
- **Dipnot:** metinde `((dipnot metni))` (editörde x¹ düğmesi) → numaralı dipnot. **Kaynakça:** editörde her satıra bir kaynak.
- **Yazı dizileri:** editörde *Dizi* + *sıra* → yazının altında dizideki yeri ve önceki/sonraki bölüm, `/dizi/[ad]` sayfası.
- **Duraklar:** `/durak/[ad]` — duraktaki eserler, önceki/sonraki durak. Bir yazıyı *Durak değerlendirmesi* olarak işaretlersen o durağın sayfasında görünür; bir durağın bütün eserleri bitince Dem değerlendirmeyi yazmayı önerir.
- **Okuma özeti:** `/admin/ozet` — yıl takvimi, ay ay okuma günü ve sayfa, bitirilen kitaplar, yazılan tahliller, fişler, en uzun seri. Sayfa sayısı, Dem ekranında "kaldığın yer" ilerledikçe kendiliğinden kaydedilir.
- **E-posta aboneliği:** onaylı abonelik (çift onay), her e-postada tek tıkla ayrılma. Editörde yayındaki yazı için *Önce bana deneme* ve *Gönder*. `/admin/aboneler`: liste, CSV.

### E-posta ve haftalık yedek için bir kerelik kurulum

1. [resend.com](https://resend.com)'da ücretsiz hesap aç → *Domains* → `zihinharitasi.org` ekle → verdiği DNS kayıtlarını alan adı sağlayıcına gir (doğrulanınca yeşil olur) → *API Keys* → yeni anahtar.
2. Supabase → Project Settings → API → **service_role** anahtarını kopyala (gizli tut; yalnızca Vercel'e girilir).
3. Vercel → proje → Settings → Environment Variables:
   - `SUPABASE_SERVICE_ROLE_KEY` — 2. adımdaki anahtar
   - `RESEND_API_KEY` — 1. adımdaki anahtar
   - `MAIL_FROM` — `Zihin Haritası <bulten@zihinharitasi.org>`
   - `BACKUP_EMAIL` — yedeğin geleceği adres
   - `CRON_SECRET` — uzun rastgele bir metin (Vercel cron isteğini bununla imzalar)
4. Vercel → Deployments → son dağıtım → *Redeploy*. `/admin/aboneler` sayfasında hepsi yeşil görünür; abonelik formu kendiliğinden açılır.

**Okuma Bülteni bölümü kaldırıldı** (sayfalar, API, toplu ekleme). Veritabanındaki eski bülten kayıtları silinmedi; eski adresler ana sayfaya yönlenir.

## 🍎 Görünüm

Apple'ın web dilinden: sistem yazısı (Apple cihazlarda SF Pro, diğerlerinde Inter), okuma metninde Literata; ölçülü boyutlar (en büyük başlık 48 px, yazı başlığı 40 px, okuma metni 18 px / telefonda 17 px), ince ayraçlar, iOS ayarlarındaki gibi gruplu listeler. Süs, geçiş ve hareket yok; yardımcı yazılar, rozetler, günün sözü yok.

- **Görünümler:** *Otomatik* (İstanbul'da gün batımından sonra koyu), *Sis*, *Gece Denizi*, *Metalik Deniz*. Renkler `app/globals.css` başındaki değişkenlerde; seçim tarayıcıda hatırlanır, sayfa açılırken yanıp sönmez.
- **Sekme ve uygulama ikonu:** siyah zemin üzerinde "Z" (`app/icon.svg`, `app/apple-icon.png`, `public/icon-*.png`). **Paylaşım görseli:** `public/og.png`; kapak görseli olan yazıda kapak kullanılır.
- **Yönetim paneli** kendi stillerini yalnızca `/admin` altında yükler (`app/admin/admin.css`).

## 💸 Maliyet ve önbellek

Herkese açık bütün sayfalar **statik** üretilir ve Vercel'in CDN'inden sunulur: ziyaretçi başına sunucu fonksiyonu çalışmaz, veritabanına gidilmez. Sayfa milyonlarca kez açılsa da yalnızca CDN'den dosya gider.

- **Ne zaman yenilenir:** Yönetim panelinde bir şey kaydedildiğinde (yazı, tahlil, "Okudum", toplu ekleme, listeyi düzenleme) site kendiliğinden yenilenir (`/api/admin/yenile`). Supabase'de doğrudan bir değişiklik yaptıysan Admin → *Siteyi yenile*; yapmazsan sayfalar en geç bir gün içinde kendiliğinden yenilenir. RSS, site haritası ve arama dizini saatte bir.
- **Taslaklar ve son hâl:** herkese açık sayfa statik olduğu için taslakları editördeki *Önizle* (`/admin/onizle/[id]`) gösterir.
- **Sunucuda çalışan her şey yönetim tarafındadır** (`/admin`, `/api/admin/*`, Word/Markdown indirme, yazdırma). `middleware.ts` yalnızca bu adreslerde çalışır; oturum çerezi olmayan istekleri (botlar dahil) veritabanına gitmeden geri çevirir.
- **Görsel dönüştürme kapalı** (`images.unoptimized`): Vercel'in görsel servisi hiç kullanılmaz.
- **Abonelik formu** (açıksa): gizli alan + süre denetimi + saatte en fazla 30 onay e-postası.
- **Kalan tek güvence ayarı Vercel'de:** Pro plandaysan *Settings → Billing → Spend Management*'ı aç ve "Pause production deployment"ı işaretle; Hobby planda aşımda fatura çıkmaz, site durur. Saldırı olursa *Firewall → Attack Challenge Mode* ve *Bot Protection*.

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
  layout.tsx                        # Üst şerit, alt bilgi, tema betiği (statik)
  page.tsx                          # Ana sayfa: yazılar + son tahliller
  yazi/[slug]/page.tsx              # Yazı
  kategori/[slug]/page.tsx          # Kategori
  kitap-tahlilleri/page.tsx         # Okuma listesi: tahliller, şu an, duraklar
  kitap-tahlilleri/[slug]/page.tsx  # Tahlil (ya da listedeki eserin sade sayfası)
  durak/[ad]/page.tsx               # Durak: eserler, "Okudum" (yönetici)
  dizi/[ad]/page.tsx                # Yazı dizisi
  ara.json/route.ts                 # Arama dizini (statik)
  feed.xml/route.ts, sitemap.ts     # RSS, site haritası (statik)
  giris/page.tsx                    # Giriş
  admin/                            # Yönetim paneli (dinamik; kendi stili admin.css)
    onizle/[id]/page.tsx            # Taslak / son hâl önizlemesi
    yazdir/[id]/page.tsx            # PDF için yazdırma sayfası
  api/admin/yenile/route.ts         # Statik sayfaları yeniler
components/
  article.tsx                       # Yazı/tahlil gövdesi, önceki/sonraki
  post-content.tsx                  # İçerik (html + eski markdown), dipnot, kaynakça
  book-row.tsx, post-list.tsx       # Listeler
  admin-bits.tsx                    # Yalnızca yöneticiye görünen parçalar (tarayıcıda)
  site-search.tsx, theme-toggle.tsx # Arama, görünüm
  rich-text-editor.tsx              # Editör (Tiptap)
lib/
  public-data.ts                    # Herkese açık sayfaların bütün verisi
  supabase-public.ts                # Çerezsiz Supabase istemcisi (statik sayfalar için)
  admin-client.ts                   # Yönetici algılama, siteyi yenile
  render-post.ts, content.ts        # İçerik işleme, temizleme
  helpers.ts, site.ts, theme.ts     # Kategoriler, sabitler, görünüm
SUPABASE-*.sql                      # Kurulum ve göçler
```
