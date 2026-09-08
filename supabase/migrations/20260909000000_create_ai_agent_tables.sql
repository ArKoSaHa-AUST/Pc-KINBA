-- Migration: 20260909000000_create_ai_agent_tables.sql
-- Description: AI Agent benchmarks, best price view, conversation sessions and telemetry

-- 1. Curated component knowledge (seeded from open spec/benchmark datasets — no prices)
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
