-- ==============================================================================
-- Migration: Community build gallery
-- Lets users publish saved builds. Public builds are readable by everyone;
-- all writes stay owner-only (existing policies).
-- ==============================================================================

alter table public.saved_builds
  add column if not exists is_public boolean not null default false,
  add column if not exists purpose text,
  add column if not exists description text,
  add column if not exists author_name text;

-- Gallery lists newest public builds; partial index keeps it tiny.
create index if not exists saved_builds_public_created_idx
  on public.saved_builds (created_at desc)
  where is_public;

drop policy if exists "Anyone can view public builds" on public.saved_builds;
create policy "Anyone can view public builds"
  on public.saved_builds for select
  to anon, authenticated
  using (is_public);

grant select on public.saved_builds to anon;
