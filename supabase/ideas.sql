-- fee fee. idea box + a softer way in for professionals (5 Nov 2026).
-- Run this once in Supabase → SQL editor. Safe to run again.

-- 1. ideas: "missing something?" on the site (assets/ideas.js).
--    Anyone can add an idea. Nobody can read them from the site:
--    femke reads them in Table editor → ideas.
create table if not exists public.ideas (
  id         uuid primary key default gen_random_uuid(),
  body       text not null check (char_length(body) between 3 and 1000),
  role       text check (char_length(role) <= 60),
  email      text check (char_length(email) <= 160),
  page       text check (char_length(page) <= 120),
  user_id    uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.ideas enable row level security;

drop policy if exists "anyone adds an idea" on public.ideas;
create policy "anyone adds an idea" on public.ideas for insert
  with check (user_id is null or user_id = auth.uid());

grant insert on public.ideas to anon, authenticated;

-- 2. joins: no website yet? a member who knows your work can vouch for you,
--    or you book a short intro call with femke. Either one replaces the work link.
alter table public.joins add column if not exists vouch text check (char_length(vouch) <= 160);
alter table public.joins add column if not exists intro_call boolean not null default false;
