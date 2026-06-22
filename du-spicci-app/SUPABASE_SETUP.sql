-- =========================================
-- Du' Spicci — Supabase setup
-- Esegui questo blocco in Supabase Dashboard → SQL Editor
-- (Progetto: kpkzevkjpuwqqvyzrozf)
-- =========================================

create table if not exists public.jobs (
  id           uuid primary key,
  neighborhood text not null,
  title        text not null,
  description  text not null default '',
  price        integer not null check (price >= 0),
  owner_id     text not null,
  owner_name   text not null,
  created_at   timestamptz not null default now()
);

create index if not exists jobs_created_at_idx
  on public.jobs (created_at desc);

create index if not exists jobs_neighborhood_idx
  on public.jobs (neighborhood);

-- Permetti al ruolo anon (la nostra anon key) di leggere e scrivere.
-- (Il backend FastAPI rimane il guardiano: solo utenti con JWT valido possono POSTare.)
alter table public.jobs enable row level security;

drop policy if exists "Anon can read jobs" on public.jobs;
create policy "Anon can read jobs"
  on public.jobs for select
  to anon
  using (true);

drop policy if exists "Anon can insert jobs" on public.jobs;
create policy "Anon can insert jobs"
  on public.jobs for insert
  to anon
  with check (true);
