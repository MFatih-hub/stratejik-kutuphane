-- =========================================================================
-- Zihin Haritası — v7: veriler yalnızca yöneticiye açık + okuma oturumları
--
-- Supabase → SQL Editor → New query: bu dosyanın tamamını yapıştır, Run.
-- Birden fazla kez çalıştırmak güvenlidir.
--
-- Neden: önceki kurallar "giriş yapmış herkes her şeyi okuyup değiştirebilir"
-- diyordu. Supabase'de yeni üyelik açıksa herkes kendine hesap açıp yazıları
-- silebilir, abonelerin e-postalarını görebilirdi. Artık yalnızca yönetici
-- hesabı yetkili; herkese açık sayfaların okuduğu yayımlanmış yazılar ve
-- sayaç (record_post_view) eskisi gibi çalışır.
-- =========================================================================

-- 1) Yönetici kim? ----------------------------------------------------------
-- E-posta adresinin kendisi bu dosyada yok (depo herkese açık); küçük harfli
-- adresin SHA-256 özeti tutulur. Aynı özet kodda: lib/admin-identity.ts
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.lower(auth.jwt() ->> 'email'), 'UTF8')),
      'hex'
    ) = '697475100bc035613b0d398a7192dd51f52928efa9f5419b2f6d2defaab68db6',
    FALSE
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 2) Okuma oturumları ve ayarlar -------------------------------------------
-- Dem'de "Başla / Bitir" ile tutulan okuma süreleri.
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES public.posts(id) ON DELETE SET NULL,
  day DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Istanbul')::date),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 720),
  page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_day ON public.reading_sessions(day);
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_sessions_admin" ON public.reading_sessions;
CREATE POLICY "reading_sessions_admin" ON public.reading_sessions FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- Küçük ayarlar (ör. haftalık okuma hedefi).
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_admin" ON public.settings;
CREATE POLICY "settings_admin" ON public.settings FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- 3) "Giriş yapmış herkes" kurallarını "yalnızca yönetici"ye çevir ----------
-- posts, notes, reading_days, reading_log, post_revisions, page_views,
-- subscribers ve panelden eklenmiş olabilecek başka kurallar dahil.
DO $$
DECLARE
  p RECORD;
  rule TEXT := '(SELECT public.is_admin())';
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage') AND 'authenticated' = ANY (roles)
  LOOP
    BEGIN
      IF p.cmd IN ('SELECT', 'DELETE') THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', p.policyname, p.schemaname, p.tablename, rule);
      ELSIF p.cmd = 'INSERT' THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', p.policyname, p.schemaname, p.tablename, rule);
      ELSE
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', p.policyname, p.schemaname, p.tablename, rule, rule);
      END IF;
      RAISE NOTICE 'yalnızca yönetici: %.% — %', p.schemaname, p.tablename, p.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'değiştirilemedi: %.% — % (%)', p.schemaname, p.tablename, p.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4) Kontrol: hangi kurallar kimde? (sonuç tablosunda görünür) ---------------
SELECT schemaname AS sema, tablename AS tablo, policyname AS kural, cmd AS islem,
       roles AS kimler, qual AS kosul
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
