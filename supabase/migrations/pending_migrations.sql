-- ==============================================================================
-- PC-KINBA PENDING MIGRATIONS
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/jkooxrfapqvwmoygswjv/sql
-- ==============================================================================

-- ==============================================================================
-- PART 1: AI Agent & Best Price Views (from 20260909000000_create_ai_agent_tables.sql)
-- ==============================================================================

-- 1. Curated component knowledge
CREATE TABLE IF NOT EXISTS public.component_benchmarks (
  fingerprint   TEXT PRIMARY KEY,          -- e.g. 'rtx-4070-super-12gb', 'ryzen-7-7700'
  category      TEXT NOT NULL,             -- cpu | gpu
  display_name  TEXT NOT NULL,
  socket        TEXT,                      -- cpu (e.g. AM5, LGA1700)
  tdp_watts     INTEGER,
  vram_gb       INTEGER,                   -- gpu
  cores         INTEGER,                   -- cpu
  has_igpu      BOOLEAN DEFAULT false,     -- cpu
  score         NUMERIC(5,1) DEFAULT 0,    -- 0–100 relative performance
  generation    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.component_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read benchmarks" ON public.component_benchmarks;
CREATE POLICY "public read benchmarks" ON public.component_benchmarks
  FOR SELECT TO public USING (true);

-- 2. Best price per product Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_best_prices AS
SELECT
  l.product_id,
  min(l.price) FILTER (WHERE l.price > 0)                       AS best_price,
  (array_agg(l.retailer ORDER BY l.price) FILTER (WHERE l.price > 0))[1]    AS best_retailer,
  (array_agg(l.id       ORDER BY l.price) FILTER (WHERE l.price > 0))[1]    AS best_listing_id,
  (array_agg(l.product_url ORDER BY l.price) FILTER (WHERE l.price > 0))[1] AS best_url,
  count(*) FILTER (WHERE l.price > 0)                           AS store_count,
  max(l.last_scraped_at)                                        AS freshest_at
FROM public.listings l
WHERE l.product_id IS NOT NULL
GROUP BY l.product_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_best_prices_product_id ON public.v_best_prices (product_id);

-- Standard View fallback for dynamic reads when materialized view refresh is pending
CREATE OR REPLACE VIEW public.v_best_prices_live AS
SELECT
  l.product_id,
  min(l.price) FILTER (WHERE l.price > 0)                       AS best_price,
  (array_agg(l.retailer ORDER BY l.price) FILTER (WHERE l.price > 0))[1]    AS best_retailer,
  (array_agg(l.id       ORDER BY l.price) FILTER (WHERE l.price > 0))[1]    AS best_listing_id,
  (array_agg(l.product_url ORDER BY l.price) FILTER (WHERE l.price > 0))[1] AS best_url,
  count(*) FILTER (WHERE l.price > 0)                           AS store_count,
  max(l.last_scraped_at)                                        AS freshest_at
FROM public.listings l
WHERE l.product_id IS NOT NULL
GROUP BY l.product_id;

-- 3. AI Sessions persistence
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users (id) ON DELETE CASCADE,   -- null for guests
  request      JSONB NOT NULL,            -- latest BuildRequest
  build        JSONB,                     -- latest validated Build
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AI Messages telemetry and chat history
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES public.ai_sessions (id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content      TEXT NOT NULL,
  tokens_in    INTEGER,
  tokens_out   INTEGER,
  model        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON public.ai_messages (session_id, created_at);

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS for ai_sessions
DROP POLICY IF EXISTS "own sessions" ON public.ai_sessions;
CREATE POLICY "own sessions" ON public.ai_sessions
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "public access guest sessions" ON public.ai_sessions;
CREATE POLICY "public access guest sessions" ON public.ai_sessions
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- RLS for ai_messages
DROP POLICY IF EXISTS "own messages" ON public.ai_messages;
CREATE POLICY "own messages" ON public.ai_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "public access guest messages" ON public.ai_messages;
CREATE POLICY "public access guest messages" ON public.ai_messages
  FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id IS NULL));

-- Grant access to roles
GRANT ALL ON public.component_benchmarks TO anon, authenticated, service_role;
GRANT ALL ON public.ai_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.ai_messages TO anon, authenticated, service_role;
GRANT SELECT ON public.v_best_prices_live TO anon, authenticated, service_role;
GRANT SELECT ON public.v_best_prices TO anon, authenticated, service_role;


-- ==============================================================================
-- PART 2: Short Build Links (from 20260909000000_short_build_links.sql)
-- ==============================================================================

ALTER TABLE public.saved_builds
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- A row is either owned by a user or is a shared snapshot — never neither.
ALTER TABLE public.saved_builds
  DROP CONSTRAINT IF EXISTS saved_builds_owner_or_share_chk,
  ADD CONSTRAINT saved_builds_owner_or_share_chk
    CHECK (user_id IS NOT NULL OR short_code IS NOT NULL);

-- Identical part lists resolve to the same link (idempotent shares).
CREATE INDEX IF NOT EXISTS saved_builds_shared_part_ids_idx
  ON public.saved_builds (part_ids)
  WHERE short_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.share_build(
  p_part_ids text[],
  p_total_price integer,
  p_purpose text default null,
  p_name text default null
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF COALESCE(array_length(p_part_ids, 1), 0) NOT BETWEEN 1 AND 16 THEN
    RAISE EXCEPTION 'A build needs between 1 and 16 parts';
  END IF;

  SELECT short_code INTO v_code
    FROM saved_builds
   WHERE short_code IS NOT NULL AND part_ids = p_part_ids
   LIMIT 1;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 7);
    BEGIN
      INSERT INTO saved_builds (user_id, name, part_ids, total_price, purpose, short_code)
      VALUES (
        (SELECT auth.uid()),
        LEFT(COALESCE(NULLIF(TRIM(p_name), ''), 'Shared Build'), 120),
        p_part_ids,
        GREATEST(0, COALESCE(p_total_price, 0)),
        LEFT(p_purpose, 40),
        v_code
      );
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- code collision: try another
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.shared_build(p_code text)
RETURNS TABLE (name text, part_ids text[], total_price integer, purpose text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT name, part_ids, total_price, purpose, created_at
    FROM saved_builds
   WHERE short_code = p_code;
$$;

REVOKE ALL ON FUNCTION public.share_build(text[], integer, text, text) FROM public;
REVOKE ALL ON FUNCTION public.shared_build(text) FROM public;
GRANT EXECUTE ON FUNCTION public.share_build(text[], integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_build(text) TO anon, authenticated;
