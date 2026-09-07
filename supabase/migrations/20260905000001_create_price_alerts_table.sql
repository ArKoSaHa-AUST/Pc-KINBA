-- ==============================================================================
-- Migration: Create Price Alerts & Product Subscriptions Table
-- Allows authenticated and guest users to subscribe to real-time price change alerts.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    product_title TEXT,
    product_image TEXT,
    product_url TEXT,
    user_id TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    initial_price NUMERIC,
    current_price NUMERIC,
    target_price NUMERIC,
    notify_on_any_change BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'triggered', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_product_user_email UNIQUE (product_id, user_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON public.price_alerts (product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_email ON public.price_alerts (user_email);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_status ON public.price_alerts (status);
CREATE INDEX IF NOT EXISTS idx_price_alerts_created_at ON public.price_alerts (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to verify subscription status
CREATE POLICY "Allow read access to price alerts"
    ON public.price_alerts FOR SELECT
    USING (true);

-- Allow public / authenticated insert for price alerts
CREATE POLICY "Allow insert access to price alerts"
    ON public.price_alerts FOR INSERT
    WITH CHECK (true);

-- Allow update access
CREATE POLICY "Allow update access to price alerts"
    ON public.price_alerts FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow delete access
CREATE POLICY "Allow delete access to price alerts"
    ON public.price_alerts FOR DELETE
    USING (true);
