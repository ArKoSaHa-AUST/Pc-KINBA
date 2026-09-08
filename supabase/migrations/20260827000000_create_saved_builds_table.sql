-- Migration: Create saved_builds table (user-saved PC Builder configurations)

CREATE TABLE IF NOT EXISTS public.saved_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_ids TEXT[] NOT NULL DEFAULT '{}',
  total_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies filter on user_id; index keeps those lookups fast
CREATE INDEX IF NOT EXISTS saved_builds_user_id_idx ON public.saved_builds (user_id);

-- Enable Row-Level Security (owner-only access)
ALTER TABLE public.saved_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own builds" ON public.saved_builds;
DROP POLICY IF EXISTS "Users can insert own builds" ON public.saved_builds;
DROP POLICY IF EXISTS "Users can update own builds" ON public.saved_builds;
DROP POLICY IF EXISTS "Users can delete own builds" ON public.saved_builds;

CREATE POLICY "Users can view own builds"
  ON public.saved_builds FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own builds"
  ON public.saved_builds FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own builds"
  ON public.saved_builds FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own builds"
  ON public.saved_builds FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Grant privileges (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_builds TO authenticated;
