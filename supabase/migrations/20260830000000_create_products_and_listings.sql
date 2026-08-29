-- Migration: Create products and listings tables for component price comparison

-- 1. Base Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Component',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Retailer Listings Table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  retailer TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  price_str TEXT NOT NULL DEFAULT '',
  product_url TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL DEFAULT '',
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON public.listings (product_id);
CREATE INDEX IF NOT EXISTS idx_listings_retailer ON public.listings (retailer);
CREATE INDEX IF NOT EXISTS idx_listings_title ON public.listings (title);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_last_scraped ON public.listings (last_scraped_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products"
  ON public.products FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for listings" ON public.listings;
CREATE POLICY "Public access for listings"
  ON public.listings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Grant permissions to roles
GRANT ALL ON public.products TO anon, authenticated, service_role;
GRANT ALL ON public.listings TO anon, authenticated, service_role;
