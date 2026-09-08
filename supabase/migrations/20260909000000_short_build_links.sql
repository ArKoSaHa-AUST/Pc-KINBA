-- ==============================================================================
-- Migration: Short build share links (/b/:code)
-- Any build — including a guest's — can be shared as a 7-char code backed by
-- saved_builds. Reads and writes go through security-definer functions so the
-- table is never enumerable by anon and guest rows never appear in a user's list.
-- ==============================================================================

alter table public.saved_builds
  alter column user_id drop not null,
  add column if not exists short_code text unique;

-- A row is either owned by a user or is a shared snapshot — never neither.
alter table public.saved_builds
  drop constraint if exists saved_builds_owner_or_share_chk,
  add constraint saved_builds_owner_or_share_chk
    check (user_id is not null or short_code is not null);

-- Identical part lists resolve to the same link (idempotent shares).
create index if not exists saved_builds_shared_part_ids_idx
  on public.saved_builds (part_ids)
  where short_code is not null;

create or replace function public.share_build(
  p_part_ids text[],
  p_total_price integer,
  p_purpose text default null,
  p_name text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if coalesce(array_length(p_part_ids, 1), 0) not between 1 and 16 then
    raise exception 'A build needs between 1 and 16 parts';
  end if;

  select short_code into v_code
    from saved_builds
   where short_code is not null and part_ids = p_part_ids
   limit 1;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code := left(replace(gen_random_uuid()::text, '-', ''), 7);
    begin
      insert into saved_builds (user_id, name, part_ids, total_price, purpose, short_code)
      values (
        (select auth.uid()),
        left(coalesce(nullif(trim(p_name), ''), 'Shared Build'), 120),
        p_part_ids,
        greatest(0, coalesce(p_total_price, 0)),
        left(p_purpose, 40),
        v_code
      );
      return v_code;
    exception when unique_violation then
      -- code collision: try another
    end;
  end loop;
end
$$;

create or replace function public.shared_build(p_code text)
returns table (name text, part_ids text[], total_price integer, purpose text, created_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select name, part_ids, total_price, purpose, created_at
    from saved_builds
   where short_code = p_code;
$$;

revoke all on function public.share_build(text[], integer, text, text) from public;
revoke all on function public.shared_build(text) from public;
grant execute on function public.share_build(text[], integer, text, text) to anon, authenticated;
grant execute on function public.shared_build(text) to anon, authenticated;
