-- ============================================================
-- ZIHIN HARITASI BLOG — MIGRATION v2
-- ============================================================
-- Bu script EKLEMELİ'dir (mevcut yazılarını SİLMEZ / bozmaz).
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run.
-- Birden fazla kez çalıştırmak güvenlidir (idempotent).
--
-- Ne ekliyor:
--   1) posts.content_format  → yeni WYSIWYG editörün hangi yazının
--      HTML, hangisinin eski markdown olduğunu bilmesi için.
--   2) page_views tablosu    → her yazı görüntülenmesini kaydeder
--      (okuyucu analitiği ve "şu an okunuyor" canlı akış için).
--   3) record_post_view()    → görüntülenmeyi güvenli/atomik şekilde
--      kaydeden fonksiyon. Eski kod anon (giriş yapmamış) kullanıcı
--      olarak doğrudan posts tablosunu UPDATE etmeye çalışıyordu;
--      bu RLS politikaları yüzünden sessizce başarısız oluyordu ve
--      görüntülenme sayıları gerçekte hiç artmıyordu. Bu fonksiyon
--      bunu düzeltiyor.
--   4) page_views için realtime yayını → admin panelde anlık
--      "şu an okunuyor" akışı için.
-- ============================================================

-- 1) İçerik formatı (markdown | html)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'markdown';
UPDATE posts SET content_format = 'markdown' WHERE content_format IS NULL;

-- 2) Görüntülenme kayıtları
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_post_id ON page_views(post_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Sadece giriş yapan admin okuyabilir (okuyucu gizliliği için herkese açık değil).
-- Yazma işlemi hiç kimseye (anon/authenticated) doğrudan açık değil —
-- sadece aşağıdaki SECURITY DEFINER fonksiyon üzerinden yazılabilir.
DROP POLICY IF EXISTS "auth_read_page_views" ON page_views;
CREATE POLICY "auth_read_page_views" ON page_views FOR SELECT TO authenticated USING (true);

-- 3) Güvenli görüntülenme kaydı fonksiyonu
--    - Her çağrıda page_views'e bir satır ekler (canlı akış için).
--    - posts.view_count'u sadece aynı ziyaretçi aynı yazıyı son 30
--      dakikada ilk kez görüyorsa artırır (yenilemelerde şişmesin).
--    - Sadece yayınlanmış (is_published = true) yazılar için çalışır.
CREATE OR REPLACE FUNCTION record_post_view(
  p_slug TEXT,
  p_visitor_id UUID,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id INTEGER;
  v_recent_count INTEGER;
BEGIN
  SELECT id INTO v_post_id FROM posts WHERE slug = p_slug AND is_published = TRUE;
  IF v_post_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO page_views (post_id, visitor_id, referrer, user_agent)
  VALUES (v_post_id, p_visitor_id, LEFT(p_referrer, 500), LEFT(p_user_agent, 500));

  SELECT COUNT(*) INTO v_recent_count
  FROM page_views
  WHERE post_id = v_post_id
    AND visitor_id = p_visitor_id
    AND created_at > NOW() - INTERVAL '30 minutes';

  IF v_recent_count <= 1 THEN
    UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = v_post_id;
  END IF;
END;
$$;

-- Anon (ziyaretçi) ve authenticated (admin önizlerken de sorun çıkmasın) çalıştırabilsin.
GRANT EXECUTE ON FUNCTION record_post_view(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- 4) Realtime: page_views'e yeni satır eklendiğinde admin panel anlık haberdar olsun
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'page_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE page_views;
  END IF;
END $$;

-- Kontrol
SELECT 'Migration v2 tamam: content_format, page_views, record_post_view() hazır.' AS durum;
