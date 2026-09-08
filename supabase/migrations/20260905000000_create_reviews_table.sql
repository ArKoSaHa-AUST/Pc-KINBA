-- Migration: Create Product Reviews Table with RLS and Indexes

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  user_country TEXT DEFAULT 'Bangladesh',
  user_country_code TEXT DEFAULT 'BD',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews (rating);

-- Enable Row-Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view all reviews" ON public.reviews;
CREATE POLICY "Public can view all reviews"
  ON public.reviews FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update helpful counts" ON public.reviews;
CREATE POLICY "Public can update helpful counts"
  ON public.reviews FOR UPDATE
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.reviews TO anon, authenticated, service_role;
