-- Migration: 20260920000100_fix_ai_session_ids.sql
-- Description: Alter ai_sessions.id and ai_messages.session_id to TEXT to support client session IDs; add summary and pinned_constraints columns.

-- 1. Drop referencing foreign key constraints and policies
ALTER TABLE IF EXISTS public.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_session_id_fkey;

DROP POLICY IF EXISTS "own messages" ON public.ai_messages;
DROP POLICY IF EXISTS "public access guest messages" ON public.ai_messages;
DROP POLICY IF EXISTS "own sessions" ON public.ai_sessions;
DROP POLICY IF EXISTS "public access guest sessions" ON public.ai_sessions;

-- 2. Alter column types to TEXT
ALTER TABLE IF EXISTS public.ai_messages
  ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

ALTER TABLE IF EXISTS public.ai_sessions
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 3. Add summary and pinned_constraints columns to ai_sessions
ALTER TABLE IF EXISTS public.ai_sessions
  ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pinned_constraints JSONB DEFAULT '{}'::jsonb;

-- 4. Re-establish foreign key relationship
ALTER TABLE IF EXISTS public.ai_messages
  ADD CONSTRAINT ai_messages_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.ai_sessions (id) ON DELETE CASCADE;

-- 5. Re-enable RLS
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 6. Re-apply RLS policies verbatim
CREATE POLICY "own sessions" ON public.ai_sessions
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "public access guest sessions" ON public.ai_sessions
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "own messages" ON public.ai_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id = (SELECT auth.uid())));

CREATE POLICY "public access guest messages" ON public.ai_messages
  FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id IS NULL));

-- 7. Grant access to roles
GRANT ALL ON public.ai_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.ai_messages TO anon, authenticated, service_role;
