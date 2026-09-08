-- ==============================================================================
-- Migration: Price history tracking
-- Append-only log of listing price changes. Populated automatically by a trigger
-- on public.listings so every writer (scrapers, live scanner, catalog sync) is
-- covered without code changes. Powers trend charts, "lowest in 30 days" badges
-- and price-drop alerts.
-- ==============================================================================

create table if not exists public.price_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  retailer text not null,
  price integer not null check (price > 0),
  scraped_at timestamptz not null default now()
);

comment on table public.price_history is
  'Append-only price snapshots per retailer listing. One row per price change.';

create index if not exists idx_price_history_listing_time
  on public.price_history (listing_id, scraped_at desc);

create index if not exists idx_price_history_product_time
  on public.price_history (product_id, scraped_at desc)
  where product_id is not null;

-- Record a snapshot on insert, and on update only when the price actually changed.
create or replace function public.record_listing_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price is null or new.price <= 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.price = new.price then
    return new;
  end if;

  insert into public.price_history (listing_id, product_id, retailer, price, scraped_at)
  values (new.id, new.product_id, new.retailer, new.price, coalesce(new.last_scraped_at, now()));

  return new;
end;
$$;

drop trigger if exists trg_listings_record_price on public.listings;
create trigger trg_listings_record_price
  after insert or update of price on public.listings
  for each row execute function public.record_listing_price();

-- Seed history with the current price of every existing listing.
insert into public.price_history (listing_id, product_id, retailer, price, scraped_at)
select id, product_id, retailer, price, last_scraped_at
from public.listings
where price > 0
  and not exists (select 1 from public.price_history ph where ph.listing_id = listings.id);

-- Read-only for clients; writes happen only via the trigger / service role.
alter table public.price_history enable row level security;

drop policy if exists "Public read access for price history" on public.price_history;
create policy "Public read access for price history"
  on public.price_history for select
  to anon, authenticated
  using (true);

revoke all on public.price_history from anon, authenticated;
grant select on public.price_history to anon, authenticated;
grant all on public.price_history to service_role;
