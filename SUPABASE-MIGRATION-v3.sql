-- ============================================================
-- ZIHIN HARITASI BLOG — MIGRATION v3
-- ============================================================
-- Bu script EKLEMELİ'dir (mevcut yazılarını SİLMEZ / bozmaz).
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run.
-- Birden fazla kez çalıştırmak güvenlidir (idempotent).
--
-- Ne ekliyor:
--   1) posts.post_type      → bir satırın "Yazı" mı, "Kitap Tahlili" mi,
--      yoksa "Okuma Bülteni" linki mi olduğunu belirtir. Mevcut tüm
--      satırlar otomatik olarak 'yazi' olur (hiçbir şey görünürde
--      değişmez, ana sayfa/kategori sayfaları eskisi gibi çalışmaya
--      devam eder).
--   2) posts.source_name / source_url / source_summary → sadece
--      post_type = 'okuma_bulteni' satırları için: paylaşılan
--      makalenin kaynağı, orijinal linki ve kısa özeti. `content`
--      alanı bu satırlarda "yazı gövdesi" değil, kullanıcının o linke
--      yazdığı YORUM için kullanılır (retweet + alıntı mantığı).
-- ============================================================

-- 1) İçerik türü (yazi | kitap_tahlili | okuma_bulteni)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'yazi';
UPDATE posts SET post_type = 'yazi' WHERE post_type IS NULL;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN ('yazi', 'kitap_tahlili', 'okuma_bulteni'));

CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type, is_published, published_at DESC);

-- 2) Okuma Bülteni linkleri için kaynak bilgisi
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_summary TEXT;

-- Kontrol
SELECT 'Migration v3 tamam: post_type + kaynak alanları hazır. Mevcut yazıların hepsi post_type=yazi oldu.' AS durum;
