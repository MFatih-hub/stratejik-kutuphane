# SEO Kontrol Listesi — Zihin Haritası

Her yazıdan önce ve sonra okumanı tavsiye ettiğim liste.

---

## 🎯 YAZI YAZARKEN UYULACAKLAR

### ✅ Başlık (en kritik)

- **40-65 karakter** arası tut. Google ~60 karakteri gösterir, kalanı keser.
- **Soru veya tartışmalı iddia** içersin. "10 İpucu" değil, "Neden X Y'den Daha İyi?"
- **Anahtar kelime başlığın ilk yarısında** olsun. "Yapay Zeka: Türkiye İçin Ne Anlama Geliyor?" değil, "Türkiye'nin Yapay Zeka Stratejisi: 2026 Manzarası"
- **Tıklanır ama clickbait değil.** Net bir vaat olsun, ama abartma.

**İyi:**
- "Nadir Toprak Elementleri: Türkiye'nin Görünmez Şansı"
- "Davos 2026'da Schwab Yoktu: Yeni WEF'in Anlamı"
- "Quantum Bilgisayar Türkiye'de: ASELSAN-TOBB Hamlesini Anlamak"

**Kötü:**
- "Yapay Zeka Hakkında Düşüncelerim" (vague)
- "Şok! AI Her Şeyi Değiştirecek!!!" (clickbait)
- "Bugün AI ile İlgili Düşündüklerim ve Ayrıca Diğer Konular Üzerine Bazı Notlar" (uzun, dağınık)

### ✅ Alt Başlık (subtitle)

- **80-120 karakter.** Başlığın söylediğini açıkla.
- Başlığın sözünü tamamlasın. "Ne? Neden? Sonuç?" zinciri.

### ✅ İlk Paragraf

Bu **kritik**. Google ilk 150 kelimeye çok önem verir.

- **İlk cümlede konuyu net söyle.** "Bu yazıda X'i tartışacağım" değil, **direkt konunun içine gir.**
- **Anahtar kelimelerini doğal şekilde** dahil et — 2-3 kez geçsin, zorlanmadan.
- **Okuyucuya niye okumasını söyle** — bu yazıyı bitirdiğinde ne kazanacak?

### ✅ Başlıklar (H2, H3)

- **3-7 H2 başlığı** olsun. Çok kısa yazı (300 kelime altı) için 1-2 yeterli.
- H2'lerde **anahtar kelime varyasyonları** kullan. "Yapay Zeka", "AI", "Makine Öğrenmesi" gibi.
- **Hiyerarşi:** H1 (başlık) > H2 > H3. Atlama yapma.

### ✅ Yazı Uzunluğu

- **Minimum 800 kelime.** Daha kısası Google için "ince içerik" sayılır.
- **İdeal: 1500-2500 kelime.** En çok performans gösteren aralık.
- **Maximum: 4000 kelime.** Üstü çok uzun, okuyucu bırakır.

### ✅ Görseller

- **Her yazıya kapak görseli koy.** Sosyal medyada paylaşılırken çok fark eder.
- **Görsellere `alt` text yaz** (Markdown'da `![](url)` yerine `![Açıklama metni](url)`)
- **Görsel boyutu max 200KB.** Daha büyükse TinyPNG ile sıkıştır.
- **Mümkünse 1200x630 boyut.** Sosyal medya kartı için ideal.

### ✅ Linkler

- **Dış linkler:** Otorite sitelere ver. Wikipedia, akademik makaleler, kurumsal raporlar.
- **İç linkler:** Eski yazılarına link ver. "Daha önce X üzerine yazmıştım" gibi.
- **Anchor text:** "Buraya tıkla" değil, **link içeriğini anlatan metin** olsun.

İyi: "Daha önce [Türkiye'nin yarı iletken stratejisi](link) üzerine yazmıştım"  
Kötü: "Daha önce de yazmıştım [buraya](link)"

### ✅ Etiketler (Tags)

- **5-10 etiket** ekle, daha fazla değil.
- **Spesifik ol.** "Teknoloji" çok geniş, "Yapay zeka regülasyonu" daha iyi.
- **Türkçe ve İngilizce karışık** kullanabilirsin (uluslararası okur için).

### ✅ Özet (Excerpt)

- **150-160 karakter.** Google arama sonuçlarında görünür.
- **Yazının vaadini** özetlesin. "Bu yazıda X'in Y için neden Z olduğunu inceliyorum."
- Boş bırakırsan otomatik üretilir, ama manuel daha iyi.

---

## 🚀 YAZIYI YAYINLADIKTAN SONRA

### Hemen (yayın günü)

1. **Google Search Console'a sitemap'i bildir** (ilk kurulumda bir kez)
2. **X/Twitter'da paylaş** — yazı linkini, başlığı, ilk paragrafı
3. **LinkedIn'de paylaş** (varsa) — uzun makale formatı
4. **WhatsApp/E-posta** — yakın çevrene, tartışma için

### 1 Hafta Sonra

5. **Hangi anahtar kelime ile bulundun?** Google Search Console → Performance
6. **Hangi yazılarına bağlanabilir** önceki/sonraki — iç linkleme ekle

### 1 Ay Sonra

7. **En çok ziyaret eden 3 yazıyı belirle.** Onların derinleştirici devamlarını yaz.
8. **Hangi anahtar kelimelerde sayfa 2'desin?** Onları sayfa 1'e çıkarmaya çalış.

---

## 🛠️ GOOGLE SEARCH CONSOLE KURULUM (TEK SEFERLİK, 10 DAKİKA)

Bu en kritik adım. Google'ın siteni "tanıyabilmesi" için.

### Adım 1: Search Console'a Git

https://search.google.com/search-console → Google hesabınla giriş

### Adım 2: Property Ekle

- **"URL prefix"** sekmesi
- Domain'ini yaz: `https://stratejik-kutuphane.vercel.app` (veya custom domain)
- **Continue**

### Adım 3: Doğrula

Birkaç doğrulama yöntemi var. **En kolayı:**

- **"HTML tag"** yöntemi seç
- `<meta name="google-site-verification" content="ABC123..." />` benzeri bir kod verir
- Bu kodun `content` değerini kopyala (örn: `ABC123xyz`)
- `app/layout.tsx`'te `verification` bölümünü bul:

```typescript
verification: {
  // google: 'xxxxxxxxxxxxx',
},
```

Yorum işaretini kaldır ve kodu yapıştır:

```typescript
verification: {
  google: 'ABC123xyz',
},
```

- GitHub'a commit, Vercel deploy etsin
- Search Console'da **"Verify"** bas → ✅

### Adım 4: Sitemap Bildir

- Sol menüde **"Sitemaps"**
- "Add a new sitemap" kutusuna: `sitemap.xml`
- **Submit** ✅

Google 1-3 gün içinde sitenin tüm sayfalarını tararken.

### Adım 5: Performans İzle

3-4 hafta sonra **"Performance"** sekmesinde:
- Hangi aramalardan geliyorsun?
- Hangi sayfaların en çok tıklanıyor?
- Sayfa 1-2'de hangi anahtar kelimelerdesin?

Bu veriler senin **içerik stratejine yön verir**.

---

## 📊 GOOGLE ANALYTICS KURULUM (OPSİYONEL)

Detaylı ziyaretçi analizi istiyorsan:

1. https://analytics.google.com → "Set up for free"
2. Property oluştur: "Zihin Haritası"
3. Web stream ekle: Senin URL
4. **Measurement ID** alacaksın: `G-XXXXXXXXXX` formatında

5. `app/layout.tsx`'te şu bölümü bul:

```typescript
{/*
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"...
*/}
```

6. Yorum işaretlerini (`{/*` ve `*/}`) kaldır, `G-XXXXXXXXXX` yerine senin ID'ni yaz.
7. Commit & deploy.

> Not: Artık sitede kendi okuyucu analitiğin de var (bkz. `/admin/analiz`) — Google Analytics olmadan da hangi yazının ne kadar okunduğunu, trafiğin nereden geldiğini ve o an kimin ne okuduğunu görebilirsin. Google Analytics'i sadece daha derin/üçüncü taraf karşılaştırma istersen ekle.

---

## 🇹🇷 TÜRKÇE SEO İPUÇLARI

### Anahtar Kelime Araştırması

- **Ücretsiz araç:** Google Keyword Planner (Google Ads içinde ücretsiz)
- **Türkçe trendler:** https://trends.google.com/trends/?geo=TR
- **Otokomplet:** Google'a "yapay zeka" yazınca öne çıkan tamamlamalar = popüler aramalar

### Türkçe Özellikleri

- **Türkçe karakter ı, ğ, ü, ş, ö, ç** Google'da problem değil — kullan. Ama URL slug'ında otomatik latinleşir (helpers.ts).
- **Türkçe noktalama:** Tire (-) yerine **kısa çizgi** (–) kullan, daha profesyonel görünür.
- **Bağlaç kuralı:** "ve", "ile", "de" Google için "stop word" değil — kullanırken doğal Türkçe yaz.

### Niş Konular = Hızlı Sıralanma

Türkçe içerikte bu konularda **çok rakip yok**:
- Yarı iletken stratejisi Türkiye
- Yapay zeka regülasyonu Türkiye
- Kritik mineraller Türkiye
- Savunma sanayi teknolojisi
- Türkiye-Avrupa-NATO analizi

Bu alanlarda 3 ay içinde sayfa 1'e çıkabilirsin.

---

## ⚠️ KAÇINMAN GEREKENLER

❌ **Anahtar kelime stuffing** — Aynı kelimeyi 20 kez tekrarlamak  
❌ **Cookie-cutter içerik** — Başka sitelerden çevrilmiş, kopyalanmış metin  
❌ **Yapay yorum/abone** — Algoritma yakalar, ceza yer  
❌ **Bozuk link** — 404 veren sayfalar siteyi geriler  
❌ **Yavaş site** — Mobilde 3 saniyeden geç açılmasın (zaten Next.js çabuk)  
❌ **Reklam paneli** — Henüz reklam koyma, okuyucu kalitesi düşer  

---

## 📈 BEKLENEN SONUÇ TAKVİMİ

| Süre | Beklenen |
|------|----------|
| **İlk hafta** | Search Console aktif, 0-50 ziyaretçi |
| **1 ay** | Google sitenin yapısını öğrendi, 100-300 ziyaretçi |
| **3 ay** | 10+ yazı varsa, 500-2000 ziyaretçi/ay |
| **6 ay** | Niş anahtar kelimelerde sayfa 1, 2000-5000 ziyaretçi/ay |
| **1 yıl** | Türkçe niş otoritesi, 5000-20000 ziyaretçi/ay |

Bu sayılar **düzenli yazarsan** (ayda 2-4 yazı, ortalama 1500 kelime). Sürekliliği koru, sonuç gelir.

---

## 🎯 SON HATIRLATMA

**SEO %20 teknik, %80 içerik.** Bu doküman teknik tarafı veriyor. İçerik tarafı **sana kalmış**:

- Özgün düşünce
- Derin araştırma
- Türkçe edebi dil
- Düzenli yayın

Bunlar olmadan SEO en iyi haliyle bile **boş bir gemi**. Bunlar varsa SEO **rüzgar**.

Yazmaya başla.
