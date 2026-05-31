-- ============================================================
-- ZIHIN HARITASI BLOG — DATABASE SETUP
-- ============================================================
-- Bu SQL'i Supabase SQL Editor'a yapıştırıp Run bas.
-- Eski tabloları (varsa) silip, blog için temiz yapıyı kurar.
-- ============================================================

-- Eski tabloları temizle (varsa)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Posts tablosu (yazılar)
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  reading_minutes INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_published ON posts(is_published, published_at DESC);

-- RLS aktif
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "public_read_published" ON posts FOR SELECT USING (is_published = TRUE);
CREATE POLICY "auth_read_all" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON posts FOR DELETE TO authenticated USING (true);

-- Otomatik updated_at güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_posts_updated_at ON posts;
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Kontrol: tablo oluştu mu?
SELECT 'Posts tablosu hazır. Şimdi ilk yazını yazabilirsin.' AS durum;
