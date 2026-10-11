-- ============================================================
-- ZIHIN HARITASI BLOG — MIGRATION v5: Okuma süreci
-- ============================================================
-- Bu script EKLEMELİ'dir (mevcut yazılarını SİLMEZ / bozmaz).
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run.
-- Birden fazla kez çalıştırmak güvenlidir (idempotent).
-- Önce v4'ün çalıştırılmış olması gerekir.
--
-- Ne ekliyor:
--   1) posts.reading_status → eserin okuma durumu:
--        NULL / 'sirada'  : henüz başlanmadı
--        'okunuyor'       : şu an okunuyor
--        'okundu'         : okuması bitti, tahlil bekliyor
--        'yazildi'        : tahlili yazıldı
--      posts.started_at / finished_at / current_page → başlama, bitirme,
--      kaldığın sayfa.
--   2) notes → okurken alınan fişler (not / alıntı / soru), esere bağlı,
--      sayfa numaralı. SADECE admin görebilir (herkese açık değil).
--      Tam metin arama için `fts` sütunu.
--   3) reading_days → okuma yaptığın günler (tempo ve gün noktaları için).
--      Not aldığın ya da "bugün okudum" dediğin gün otomatik işaretlenir.
-- ============================================================

-- 1) Okuma durumu
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_status TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS current_page TEXT;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_reading_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_reading_status_check
  CHECK (reading_status IS NULL OR reading_status IN ('sirada', 'okunuyor', 'okundu', 'yazildi'));

CREATE INDEX IF NOT EXISTS idx_posts_reading_status
  ON posts(reading_status) WHERE post_type = 'kitap_tahlili';

-- Tahlili zaten yazılmış eserleri 'yazildi' olarak işaretle (bir kerelik)
UPDATE posts
   SET reading_status = 'yazildi',
       finished_at = COALESCE(finished_at, updated_at)
 WHERE post_type = 'kitap_tahlili'
   AND reading_status IS NULL
   AND COALESCE(content, '') <> '';

-- Tahlil yazılınca (içerik dolunca) durum kendiliğinden 'yazildi' olsun
CREATE OR REPLACE FUNCTION set_reading_status_on_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_type = 'kitap_tahlili'
     AND COALESCE(NEW.content, '') <> ''
     AND COALESCE(OLD.content, '') = '' THEN
    NEW.reading_status := 'yazildi';
    NEW.finished_at := COALESCE(NEW.finished_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reading_status_on_content ON posts;
CREATE TRIGGER trg_reading_status_on_content
  BEFORE UPDATE OF content ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_reading_status_on_content();

-- 2) Not fişleri
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'not' CHECK (kind IN ('not', 'alinti', 'soru')),
  body TEXT NOT NULL,
  page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fts TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', coalesce(body, '') || ' ' || coalesce(page, ''))) STORED
);

CREATE INDEX IF NOT EXISTS idx_notes_post ON notes(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING GIN (fts);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_admin_all" ON notes;
CREATE POLICY "notes_admin_all" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_notes_updated_at ON notes;
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3) Okuma günleri
CREATE TABLE IF NOT EXISTS reading_days (
  day DATE PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE reading_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_days_admin_all" ON reading_days;
CREATE POLICY "reading_days_admin_all" ON reading_days FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Kontrol
SELECT 'Migration v5 tamam: okuma durumu, notlar ve okuma günleri hazır.' AS durum;
