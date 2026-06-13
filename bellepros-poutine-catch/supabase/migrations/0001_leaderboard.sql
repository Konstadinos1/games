-- Bellepro's Poutine Catch — global leaderboard
-- Public READ via RLS; writes happen only through the `leaderboard` Edge Function
-- (service role), so this table has no anon insert/update/delete policy.

create table if not exists public.leaderboard (
  id         bigint generated always as identity primary key,
  name       text    not null,
  score      integer not null check (score >= 0 and score <= 100000),
  created_at timestamptz not null default now()
);

-- fast top-N (highest score first, earliest submission wins ties)
create index if not exists leaderboard_score_idx
  on public.leaderboard (score desc, created_at asc);

alter table public.leaderboard enable row level security;

-- anyone may read the board
drop policy if exists "leaderboard_public_read" on public.leaderboard;
create policy "leaderboard_public_read"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- (no insert/update/delete policies → only the service-role Edge Function can write)
