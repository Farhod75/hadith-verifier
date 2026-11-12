-- P411: counters shared by every Vercel instance (hadith-verifier).
--
-- The bot's video caps (P405: 3 per user per day, 30 a day) and /api/tts's per-caller
-- limit (P366) were kept in one serverless instance's memory - reset by a cold start,
-- counted separately by each instance. bump_counter() adds one call to (key, window)
-- only while the count is under the cap, in a single statement, and returns whether
-- the call is allowed. Windows are aligned to UTC epoch (86400 s = a UTC day).
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.rate_counters (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null,
  primary key (key, window_start)
);
alter table public.rate_counters enable row level security;   -- no policies: service_role only

create or replace function public.bump_counter(p_key text, p_window_seconds integer, p_cap integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  if p_cap < 1 then return false; end if;
  insert into rate_counters as rc (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update
     set count = rc.count + 1
   where rc.count < p_cap
  returning rc.count into v_count;
  if random() < 0.02 then                                   -- now and then, drop old windows
    delete from rate_counters where window_start < now() - interval '3 days';
  end if;
  return v_count is not null;
end
$$;

revoke all on function public.bump_counter(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_counter(text, integer, integer) to service_role;

notify pgrst, 'reload schema';

-- Check (read the result): true, true, false - a cap of 2 on a throwaway key
-- (its row is dropped by the cleanup above within a few days).
delete from public.rate_counters where key = 'p411-selftest';
select public.bump_counter('p411-selftest', 60, 2) as first,
       public.bump_counter('p411-selftest', 60, 2) as second,
       public.bump_counter('p411-selftest', 60, 2) as third;
