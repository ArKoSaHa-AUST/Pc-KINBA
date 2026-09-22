-- ==============================================================================
-- Migration: 20260920000300_scraper_health.sql
-- Description: Scraper observability, per-store runs audit trail & health status tracking
-- ==============================================================================

-- 1. Scraper Runs Log Table
-- Records every individual scraper query execution across all 12 stores
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        TEXT NOT NULL,
  query           TEXT NOT NULL,
  ok              BOOLEAN NOT NULL,
  item_count      INTEGER NOT NULL DEFAULT 0,
  priced_count    INTEGER NOT NULL DEFAULT 0,
  http_status     INTEGER,
  duration_ms     INTEGER,
  failure_reason  TEXT,                      -- 'http_error' | 'container_missing' | 'all_unpriced' | 'low_yield' | 'blocked' | 'exception'
  selector_hits   JSONB,                     -- field -> which fallback selector matched
  sample_titles   JSONB,                     -- first 3 titles for visual inspection of garbage
  error           TEXT,
  run_id          UUID NOT NULL,             -- groups one invocation across all stores
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_store_time ON public.scraper_runs (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_run ON public.scraper_runs (run_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_created_at ON public.scraper_runs (created_at DESC);

-- 2. Scraper Health State Table
-- Persistent roll-up tracking health, consecutive failures, and rolling baselines per store
CREATE TABLE IF NOT EXISTS public.scraper_health (
  store_id              TEXT PRIMARY KEY,
  display_name          TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'broken', 'unknown')),
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  last_success_at       TIMESTAMPTZ,
  last_failure_at       TIMESTAMPTZ,
  last_failure_reason   TEXT,
  baseline_item_count   NUMERIC,             -- rolling median of recent healthy runs
  alerted_at            TIMESTAMPTZ,         -- timestamp of last emitted alert to prevent spamming
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial records for all 12 known retailers
INSERT INTO public.scraper_health (store_id, display_name, status, consecutive_failures, baseline_item_count, updated_at)
VALUES
  ('startech', 'StarTech BD', 'unknown', 0, 10, now()),
  ('ryans', 'Ryans Computers', 'unknown', 0, 10, now()),
  ('globalbrand', 'Global Brand', 'unknown', 0, 8, now()),
  ('techland', 'Techland BD', 'unknown', 0, 10, now()),
  ('skyland', 'Skyland BD', 'unknown', 0, 8, now()),
  ('pcbstore', 'PCB Store', 'unknown', 0, 6, now()),
  ('computermania', 'Computer Mania BD', 'unknown', 0, 6, now()),
  ('binarylogic', 'Binary Logic', 'unknown', 0, 6, now()),
  ('selltech', 'Sell Tech BD', 'unknown', 0, 8, now()),
  ('computervillage', 'Computer Village', 'unknown', 0, 8, now()),
  ('pchouse', 'PC House BD', 'unknown', 0, 6, now()),
  ('ultratech', 'Ultra Technology', 'unknown', 0, 8, now())
ON CONFLICT (store_id) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- 3. Row Level Security (RLS)
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_health ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users / admins to read health and run logs
DROP POLICY IF EXISTS "Allow authenticated read on scraper_runs" ON public.scraper_runs;
CREATE POLICY "Allow authenticated read on scraper_runs"
  ON public.scraper_runs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on scraper_health" ON public.scraper_health;
CREATE POLICY "Allow authenticated read on scraper_health"
  ON public.scraper_health FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon read for public status endpoints if needed
DROP POLICY IF EXISTS "Allow anon read on scraper_health" ON public.scraper_health;
CREATE POLICY "Allow anon read on scraper_health"
  ON public.scraper_health FOR SELECT
  TO anon
  USING (true);

-- Service role has full permissions for ingestion jobs & canaries
GRANT ALL ON public.scraper_runs TO service_role;
GRANT ALL ON public.scraper_health TO service_role;
GRANT SELECT ON public.scraper_runs TO authenticated;
GRANT SELECT ON public.scraper_health TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Retention Policy Note:
-- scraper_runs records 12 stores * queries * runs/day.
-- Clean up records older than 90 days periodically:
--   DELETE FROM public.scraper_runs WHERE created_at < now() - INTERVAL '90 days';
-- ---------------------------------------------------------------------------
