-- ============================================================
-- ZIHIN HARITASI BLOG — MIGRATION v4
-- ============================================================
-- Bu script EKLEMELİ'dir (mevcut yazılarını SİLMEZ / bozmaz).
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run.
-- Birden fazla kez çalıştırmak güvenlidir (idempotent).
--
-- Ne ekliyor (Kitap Tahlilleri toplu ekleme için):
--   1) posts.book_author    → eserin yazarı (Excel'deki "Yazar" sütunu).
--   2) posts.reading_order  → okuma listesindeki sıra numarası (Excel'deki
--      "Sıra" sütunu). Kitap Tahlilleri sayfası bu sıraya göre listelenir.
--   3) posts.reading_module → (isteğe bağlı) eserin ait olduğu modül / durak
--      (ör. "Mantık", "Epistemoloji"). Okuma yolculuğu görünümünde eserler
--      bu duraklara ayrılır ve her durağın ilerlemesi gösterilir.
--
-- Bu dosyayı daha önce çalıştırdıysan tekrar çalıştırman güvenli — sadece
-- eksik olanı ekler.
--
-- Toplu eklenen kitap tahlili kayıtlarında `content` boş ('') başlar:
-- eser listede görünür, tahlil notu sonra editörden tek tek yazılır.
-- ============================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS book_author TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_order INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_module TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_reading_order
  ON posts(post_type, reading_order)
  WHERE post_type = 'kitap_tahlili';

-- Kontrol
SELECT 'Migration v4 tamam: book_author + reading_order + reading_module hazır.' AS durum;
