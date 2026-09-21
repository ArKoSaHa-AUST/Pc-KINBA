-- ==============================================================================
-- Migration: 20260920000200_email_delivery_log.sql
-- Description: Durable email delivery log, retry tracking, and alert observability
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind            TEXT NOT NULL,           -- 'welcome' | 'alert_confirmation' | 'price_drop'
  recipient       TEXT NOT NULL,
  user_id         UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  alert_id        TEXT,                    -- ID from price_alerts where applicable
  event_id        BIGINT REFERENCES public.price_drop_events (id) ON DELETE SET NULL,
  correlation_id  TEXT NOT NULL,           -- idempotency hash
  status          TEXT NOT NULL CHECK (status IN ('sent', 'failed_transient', 'failed_permanent', 'failed_config')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  message_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for idempotency, health reporting, and user lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_deliveries_correlation ON public.email_deliveries (correlation_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON public.email_deliveries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_id ON public.email_deliveries (user_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_alert_id ON public.email_deliveries (alert_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_event_id ON public.email_deliveries (event_id);

-- Additive columns on price_alerts
ALTER TABLE public.price_alerts
  ADD COLUMN IF NOT EXISTS last_notification_status TEXT,
  ADD COLUMN IF NOT EXISTS last_notification_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_notification_error  TEXT,
  ADD COLUMN IF NOT EXISTS failed_notification_count INTEGER NOT NULL DEFAULT 0;

-- Additive column on price_drop_events for bounded retry drain
ALTER TABLE public.price_drop_events
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own email deliveries" ON public.email_deliveries;
CREATE POLICY "Users read own email deliveries"
  ON public.email_deliveries FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      alert_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.price_alerts a
        WHERE a.id::text = alert_id AND a.user_id = (SELECT auth.uid())::text
      )
    )
  );

GRANT SELECT ON public.email_deliveries TO authenticated;
GRANT ALL ON public.email_deliveries TO service_role;
