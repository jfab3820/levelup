-- LevelUp cloud: per-user saved state + a daily allowance for AI Powerups.
-- Apply once to the Supabase project (SQL editor, `supabase db push`, or the Supabase MCP).

-- ─── Saved state ──────────────────────────────────────────────────────────────
-- One row per user holding everything the app keeps in localStorage
-- (traits, focus, log, streak, powerups). The app syncs the whole object.
create table if not exists public.user_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint user_state_data_size check (octet_length(data::text) < 2000000)
);

-- updated_at is always set by the database. The app uses it as a version number:
-- an update only goes through if the row still has the updated_at the app last saw.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists user_state_touch_updated_at on public.user_state;
create trigger user_state_touch_updated_at
  before insert or update on public.user_state
  for each row execute function public.touch_updated_at();

alter table public.user_state enable row level security;

drop policy if exists "Users read their own state" on public.user_state;
create policy "Users read their own state" on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own state" on public.user_state;
create policy "Users create their own state" on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own state" on public.user_state;
create policy "Users update their own state" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own state" on public.user_state;
create policy "Users delete their own state" on public.user_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

-- ─── AI Powerup allowance ─────────────────────────────────────────────────────
-- Every Claude-written lesson is recorded here. Rows can only be created through
-- claim_powerup_generation(), which enforces the daily limit, so a signed-in user
-- can't run up the API bill by calling the endpoint in a loop.
create table if not exists public.powerup_generations (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  trait_name text,
  created_at timestamptz not null default now()
);

create index if not exists powerup_generations_user_time
  on public.powerup_generations (user_id, created_at desc);

alter table public.powerup_generations enable row level security;

drop policy if exists "Users see their own generations" on public.powerup_generations;
create policy "Users see their own generations" on public.powerup_generations
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert / update / delete policies on purpose: only the function below writes here.
revoke all on public.powerup_generations from anon, authenticated;
grant select on public.powerup_generations to authenticated;

-- Records one AI lesson for the signed-in user if they are under the limit.
-- Returns how many they have left in the current 24 hours, or -1 if the limit is reached.
create or replace function public.claim_powerup_generation(trait text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller      uuid := auth.uid();
  daily_limit constant integer := 5;
  used        integer;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- One claim at a time per user, so parallel requests can't slip past the count.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));

  select count(*) into used
  from public.powerup_generations
  where user_id = caller
    and created_at > now() - interval '24 hours';

  if used >= daily_limit then
    return -1;
  end if;

  insert into public.powerup_generations (user_id, trait_name)
  values (caller, left(trait, 60));

  return daily_limit - used - 1;
end;
$$;

revoke all on function public.claim_powerup_generation(text) from public, anon;
grant execute on function public.claim_powerup_generation(text) to authenticated;
