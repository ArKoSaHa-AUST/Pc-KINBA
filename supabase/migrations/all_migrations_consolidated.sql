-- ==============================================================================
-- PC-KINBA FULL CONSOLIDATED DATABASE SCHEMA & MIGRATIONS (Idempotent & Error-Free)
-- Project Ref: jkooxrfapqvwmoygswjv
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/jkooxrfapqvwmoygswjv/sql
-- ==============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. Profiles Table & Auth Trigger (20260825000000_create_profiles_table.sql)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'gaming',
  role TEXT NOT NULL DEFAULT 'Customer',
  avatar_url TEXT,
  agree_terms BOOLEAN NOT NULL DEFAULT true,
  notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, purpose, agree_terms, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'purpose', 'gaming'),
    COALESCE((NEW.raw_user_meta_data->>'agree_terms')::boolean, true),
    'Customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    purpose = EXCLUDED.purpose,
    updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 2. Categories & Brands (20260907000000_create_components_marketplace_schema.sql)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  icon TEXT,
  accent_color TEXT DEFAULT '#00e5ff',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can read brands" ON public.brands;
CREATE POLICY "Public can read brands" ON public.brands FOR SELECT TO public USING (true);


-- ==============================================================================
-- 3. Products, Listings & Product Relations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(12, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.8,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new_arrival BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  spec_group TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.filters_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  filter_key TEXT NOT NULL,
  filter_label TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('range', 'select', 'multi-select')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON public.listings (product_id);
CREATE INDEX IF NOT EXISTS idx_listings_retailer ON public.listings (retailer);
CREATE INDEX IF NOT EXISTS idx_listings_brand ON public.listings (brand);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_last_scraped ON public.listings (last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_product ON public.product_specs (product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_key_val ON public.product_specs (spec_key, spec_value);
CREATE INDEX IF NOT EXISTS idx_filters_config_category ON public.filters_config (category_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filters_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for listings" ON public.listings;
CREATE POLICY "Public access for listings" ON public.listings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read product images" ON public.product_images;
CREATE POLICY "Public can read product images" ON public.product_images FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can read product specs" ON public.product_specs;
CREATE POLICY "Public can read product specs" ON public.product_specs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can read filters config" ON public.filters_config;
CREATE POLICY "Public can read filters config" ON public.filters_config FOR SELECT TO public USING (true);

GRANT ALL ON public.products TO anon, authenticated, service_role;
GRANT ALL ON public.listings TO anon, authenticated, service_role;
GRANT ALL ON public.product_images TO anon, authenticated, service_role;
GRANT ALL ON public.product_specs TO anon, authenticated, service_role;
GRANT ALL ON public.filters_config TO anon, authenticated, service_role;


-- ==============================================================================
-- 4. Price History & Price Drop Events
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  retailer TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing_time ON public.price_history (listing_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON public.price_history (product_id, scraped_at DESC) WHERE product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_listing_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prod_uuid uuid;
BEGIN
  IF new.price IS NULL OR new.price <= 0 THEN
    RETURN new;
  END IF;

  IF tg_op = 'UPDATE' AND old.price = new.price THEN
    RETURN new;
  END IF;

  BEGIN
    IF new.product_id IS NOT NULL THEN
      prod_uuid := new.product_id;
    ELSE
      prod_uuid := null;
    END IF;
  EXCEPTION WHEN others THEN
    prod_uuid := null;
  END;

  INSERT INTO public.price_history (listing_id, product_id, retailer, price, scraped_at)
  VALUES (new.id, prod_uuid, new.retailer, new.price, COALESCE(new.last_scraped_at, now()));

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_record_price ON public.listings;
CREATE TRIGGER trg_listings_record_price
  AFTER INSERT OR UPDATE OF price ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.record_listing_price();

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for price history" ON public.price_history;
CREATE POLICY "Public read access for price history" ON public.price_history FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;

CREATE TABLE IF NOT EXISTS public.price_drop_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  retailer TEXT NOT NULL,
  old_price INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_price_drop_events_unprocessed ON public.price_drop_events (id) WHERE processed_at IS NULL;
ALTER TABLE public.price_drop_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.price_drop_events TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_price_drop_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prev_price integer;
BEGIN
  SELECT ph.price INTO prev_price
  FROM public.price_history ph
  WHERE ph.listing_id = new.listing_id AND ph.id < new.id
  ORDER BY ph.id DESC
  LIMIT 1;

  IF prev_price IS NOT NULL AND new.price < prev_price THEN
    INSERT INTO public.price_drop_events (listing_id, product_id, retailer, old_price, new_price)
    VALUES (new.listing_id, new.product_id, new.retailer, prev_price, new.price);
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_price_history_enqueue_drop ON public.price_history;
CREATE TRIGGER trg_price_history_enqueue_drop
  AFTER INSERT ON public.price_history
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_price_drop_event();


-- ==============================================================================
-- 5. Reviews & Price Alerts
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view all reviews" ON public.reviews;
CREATE POLICY "Public can view all reviews" ON public.reviews FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews" ON public.reviews FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update helpful counts" ON public.reviews;
CREATE POLICY "Public can update helpful counts" ON public.reviews FOR UPDATE TO authenticated, anon, service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.reviews TO anon, authenticated, service_role;

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

CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON public.price_alerts (product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_email ON public.price_alerts (user_email);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to price alerts" ON public.price_alerts;
CREATE POLICY "Allow read access to price alerts" ON public.price_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to price alerts" ON public.price_alerts;
CREATE POLICY "Allow insert access to price alerts" ON public.price_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to price alerts" ON public.price_alerts;
CREATE POLICY "Allow update access to price alerts" ON public.price_alerts FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access to price alerts" ON public.price_alerts;
CREATE POLICY "Allow delete access to price alerts" ON public.price_alerts FOR DELETE USING (true);


-- ==============================================================================
-- 6. Cart, Compare List, Wishlists & Notifications
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cart_user_product UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.compare_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_compare_user_product UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_user_product_unique UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compare_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart;
CREATE POLICY "Users can manage own cart" ON public.cart FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own compare list" ON public.compare_list;
CREATE POLICY "Users can manage own compare list" ON public.compare_list FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlists;
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

GRANT ALL ON public.cart TO authenticated, service_role;
GRANT ALL ON public.compare_list TO authenticated, service_role;
GRANT ALL ON public.wishlists TO authenticated, service_role;
GRANT ALL ON public.notifications TO authenticated, service_role;


-- ==============================================================================
-- 7. Saved Builds & Short Share Links
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_ids TEXT[] NOT NULL DEFAULT '{}',
  total_price INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  purpose TEXT,
  description TEXT,
  author_name TEXT,
  short_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_builds
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE public.saved_builds
  DROP CONSTRAINT IF EXISTS saved_builds_owner_or_share_chk,
  ADD CONSTRAINT saved_builds_owner_or_share_chk
    CHECK (user_id IS NOT NULL OR short_code IS NOT NULL);

CREATE INDEX IF NOT EXISTS saved_builds_user_id_idx ON public.saved_builds (user_id);
CREATE INDEX IF NOT EXISTS saved_builds_public_created_idx ON public.saved_builds (created_at DESC) WHERE is_public;
CREATE INDEX IF NOT EXISTS saved_builds_shared_part_ids_idx ON public.saved_builds (part_ids) WHERE short_code IS NOT NULL;

ALTER TABLE public.saved_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own builds" ON public.saved_builds;
CREATE POLICY "Users can view own builds" ON public.saved_builds FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own builds" ON public.saved_builds;
CREATE POLICY "Users can insert own builds" ON public.saved_builds FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own builds" ON public.saved_builds;
CREATE POLICY "Users can update own builds" ON public.saved_builds FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own builds" ON public.saved_builds;
CREATE POLICY "Users can delete own builds" ON public.saved_builds FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Anyone can view public builds" ON public.saved_builds;
CREATE POLICY "Anyone can view public builds" ON public.saved_builds FOR SELECT TO anon, authenticated USING (is_public);

GRANT ALL ON public.saved_builds TO authenticated, service_role;
GRANT SELECT ON public.saved_builds TO anon;

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


-- ==============================================================================
-- 8. AI Agent Tables & Price Views
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.component_benchmarks (
  fingerprint   TEXT PRIMARY KEY,
  category      TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  socket        TEXT,
  tdp_watts     INTEGER,
  vram_gb       INTEGER,
  cores         INTEGER,
  has_igpu      BOOLEAN DEFAULT false,
  score         NUMERIC(5,1) DEFAULT 0,
  generation    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.component_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read benchmarks" ON public.component_benchmarks;
CREATE POLICY "public read benchmarks" ON public.component_benchmarks FOR SELECT TO public USING (true);

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

CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  request      JSONB NOT NULL,
  build        JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

DROP POLICY IF EXISTS "own sessions" ON public.ai_sessions;
CREATE POLICY "own sessions" ON public.ai_sessions FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "public access guest sessions" ON public.ai_sessions;
CREATE POLICY "public access guest sessions" ON public.ai_sessions FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "own messages" ON public.ai_messages;
CREATE POLICY "own messages" ON public.ai_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "public access guest messages" ON public.ai_messages;
CREATE POLICY "public access guest messages" ON public.ai_messages FOR ALL TO anon USING (EXISTS (SELECT 1 FROM public.ai_sessions s WHERE s.id = session_id AND s.user_id IS NULL));

GRANT ALL ON public.component_benchmarks TO anon, authenticated, service_role;
GRANT ALL ON public.ai_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.ai_messages TO anon, authenticated, service_role;
GRANT SELECT ON public.v_best_prices_live TO anon, authenticated, service_role;
GRANT SELECT ON public.v_best_prices TO anon, authenticated, service_role;
