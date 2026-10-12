-- =====================================================================
-- Zihin Haritası — Migration v6
-- Supabase → SQL Editor'a yapıştır → Run. Birden fazla çalıştırmak zararsız.
--
-- Bu ek şunları kurar:
--   1) posts: yazı dizisi (series, series_order), kaynakça (bibliography),
--      durak değerlendirmesi (durak_summary), bülten gönderim zamanı
--      (newsletter_sent_at), tahlilin yazıldığı an (written_at)
--   2) post_revisions: SÜRÜM GEÇMİŞİ. Yazı her güncellendiğinde, eski hâli
--      en fazla 10 dakikada bir saklanır; metin birden belirgin kısalırsa
--      (ör. yanlışlıkla bir bölüm silinirse) beklemeden saklanır.
--      Yazı başına son 200 sürüm tutulur.
--   3) reading_log: Bugün ekranında "kaldığın sayfa" her ilerlediğinde
--      kaç sayfa okunduğu kendiliğinden kaydedilir (okuma özeti için).
--   4) subscribers: e-posta aboneleri (onaylı abonelik + tek tıkla ayrılma).
-- =====================================================================

-- 1) Yeni alanlar --------------------------------------------------------
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series_order INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS bibliography TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS durak_summary TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS newsletter_sent_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS written_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_series ON posts(series, series_order) WHERE series IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_durak_summary ON posts(durak_summary) WHERE durak_summary IS NOT NULL;

-- Daha önce yazılmış tahliller için yazılma anı: bilinen en yakın tarih
UPDATE posts
   SET written_at = COALESCE(finished_at, updated_at)
 WHERE post_type = 'kitap_tahlili'
   AND written_at IS NULL
   AND COALESCE(content, '') <> '';

-- Tahlil ilk kez yazıldığında durum + yazılma anı (v5'teki tetikleyicinin genişletilmiş hâli)
CREATE OR REPLACE FUNCTION set_reading_status_on_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_type = 'kitap_tahlili'
     AND COALESCE(NEW.content, '') <> ''
     AND COALESCE(OLD.content, '') = '' THEN
    NEW.reading_status := 'yazildi';
    NEW.finished_at := COALESCE(NEW.finished_at, NOW());
    NEW.written_at := COALESCE(NEW.written_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Sürüm geçmişi -------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_revisions (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  excerpt TEXT,
  bibliography TEXT,
  words INTEGER,
  reason TEXT NOT NULL DEFAULT 'zaman',      -- zaman | kisalma | elle
  version_at TIMESTAMPTZ,                    -- bu hâlin kaydedildiği an
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_revisions_post ON post_revisions(post_id, created_at DESC);

ALTER TABLE post_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_revisions_admin_all" ON post_revisions;
CREATE POLICY "post_revisions_admin_all" ON post_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION save_post_revision()
RETURNS TRIGGER AS $$
DECLARE
  last_at TIMESTAMPTZ;
  old_len INTEGER;
  new_len INTEGER;
  why TEXT;
BEGIN
  IF COALESCE(OLD.content, '') = COALESCE(NEW.content, '')
     AND OLD.title IS NOT DISTINCT FROM NEW.title
     AND OLD.bibliography IS NOT DISTINCT FROM NEW.bibliography THEN
    RETURN NEW;
  END IF;
  IF COALESCE(OLD.content, '') = '' THEN
    RETURN NEW; -- saklanacak bir şey yok
  END IF;

  old_len := length(OLD.content);
  new_len := length(COALESCE(NEW.content, ''));
  SELECT MAX(created_at) INTO last_at FROM post_revisions WHERE post_id = OLD.id;

  IF new_len < old_len * 0.85 AND old_len - new_len > 200 THEN
    why := 'kisalma';
  ELSIF last_at IS NULL OR last_at < NOW() - INTERVAL '10 minutes' THEN
    why := 'zaman';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO post_revisions (post_id, title, subtitle, content, excerpt, bibliography, words, reason, version_at)
  VALUES (
    OLD.id, OLD.title, OLD.subtitle, OLD.content, OLD.excerpt, OLD.bibliography,
    COALESCE(array_length(regexp_split_to_array(btrim(regexp_replace(OLD.content, '<[^>]+>', ' ', 'g')), '\s+'), 1), 0),
    why, OLD.updated_at
  );

  DELETE FROM post_revisions
   WHERE post_id = OLD.id
     AND id NOT IN (SELECT id FROM post_revisions WHERE post_id = OLD.id ORDER BY created_at DESC LIMIT 200);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_save_post_revision ON posts;
CREATE TRIGGER trg_save_post_revision
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION save_post_revision();

-- 3) Okuma kaydı (sayfa ilerlemesi) ---------------------------------------
CREATE TABLE IF NOT EXISTS reading_log (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Istanbul')::date),
  page_from INTEGER,
  page_to INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_log_day ON reading_log(day);

ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_log_admin_all" ON reading_log;
CREATE POLICY "reading_log_admin_all" ON reading_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_reading_progress()
RETURNS TRIGGER AS $$
DECLARE
  p_old INTEGER;
  p_new INTEGER;
BEGIN
  IF NEW.current_page IS NOT DISTINCT FROM OLD.current_page THEN
    RETURN NEW;
  END IF;
  p_new := NULLIF(substring(COALESCE(NEW.current_page, '') FROM '\d+'), '')::INTEGER;
  p_old := NULLIF(substring(COALESCE(OLD.current_page, '') FROM '\d+'), '')::INTEGER;
  IF p_new IS NULL THEN
    RETURN NEW;
  END IF;
  -- İlk kez sayfa girildiyse ve kitaba son iki gün içinde başlandıysa baştan say
  IF p_old IS NULL AND OLD.started_at IS NOT NULL AND OLD.started_at > NOW() - INTERVAL '2 days' THEN
    p_old := 0;
  END IF;
  IF p_old IS NULL OR p_new > p_old THEN
    INSERT INTO reading_log (post_id, page_from, page_to) VALUES (NEW.id, p_old, p_new);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_reading_progress ON posts;
CREATE TRIGGER trg_log_reading_progress
  AFTER UPDATE OF current_page ON posts
  FOR EACH ROW
  EXECUTE FUNCTION log_reading_progress();

-- 4) E-posta aboneleri -----------------------------------------------------
-- Abone ekleme/onaylama sunucuda "service role" anahtarıyla yapılır;
-- tarayıcıdan kimse bu tabloyu okuyamaz. Admin (giriş yapmış kullanıcı)
-- listeyi görebilir ve silebilir.
CREATE TABLE IF NOT EXISTS subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_mail_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscribers_admin_read" ON subscribers;
CREATE POLICY "subscribers_admin_read" ON subscribers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subscribers_admin_delete" ON subscribers;
CREATE POLICY "subscribers_admin_delete" ON subscribers FOR DELETE TO authenticated USING (true);

SELECT 'Migration v6 tamam: diziler, kaynakça, sürüm geçmişi, okuma kaydı ve aboneler hazır.' AS durum;
