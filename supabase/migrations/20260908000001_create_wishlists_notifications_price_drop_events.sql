-- ==============================================================================
-- Migration: Wishlists, in-app notifications and price-drop events
--  * wishlists          – products a user is tracking (canonical products.id)
--  * notifications      – in-app feed (bell icon); read/updated by owner only
--  * price_drop_events  – queue filled by a trigger on price_history whenever a
--                         listing's price falls; drained by the Node server which
--                         sends emails and fans out in-app notifications.
--  * profiles.notification_prefs – persists the profile notification toggles
-- ==============================================================================

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_user_product_unique unique (user_id, product_id)
);

create index if not exists idx_wishlists_product_id on public.wishlists (product_id);

alter table public.wishlists enable row level security;

drop policy if exists "Users manage own wishlist" on public.wishlists;
create policy "Users manage own wishlist"
  on public.wishlists for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

-- ------------------------------------------------------------------------------

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- ------------------------------------------------------------------------------

create table if not exists public.price_drop_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  retailer text not null,
  old_price integer not null,
  new_price integer not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_price_drop_events_unprocessed
  on public.price_drop_events (id)
  where processed_at is null;

alter table public.price_drop_events enable row level security;
grant all on public.price_drop_events to service_role;

-- Enqueue an event whenever a new price_history snapshot is lower than the previous one.
create or replace function public.enqueue_price_drop_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev_price integer;
begin
  select ph.price into prev_price
  from public.price_history ph
  where ph.listing_id = new.listing_id and ph.id < new.id
  order by ph.id desc
  limit 1;

  if prev_price is not null and new.price < prev_price then
    insert into public.price_drop_events (listing_id, product_id, retailer, old_price, new_price)
    values (new.listing_id, new.product_id, new.retailer, prev_price, new.price);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_price_history_enqueue_drop on public.price_history;
create trigger trg_price_history_enqueue_drop
  after insert on public.price_history
  for each row execute function public.enqueue_price_drop_event();

-- ------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
