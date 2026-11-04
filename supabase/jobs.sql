-- fee fee. jobs marketplace + answers by professionals only.
-- Run this once in Supabase → SQL editor, AFTER index.sql (it uses public.is_pro()). Safe to run again.
--
-- Who can do what:
--   logged in             read open jobs
--   approved professional post a job, reply to someone else's job, answer questions
--   the poster            see the replies to their own job, close or delete it
--   the replier           see their own reply
-- femke approves professionals in Table editor → joins (status → 'approved').
-- Approve yourself first, or nobody can answer questions or post jobs.

create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_needed   text not null check (char_length(role_needed) between 2 and 60),
  title         text not null check (char_length(title) between 4 and 120),
  city          text not null check (char_length(city) between 2 and 60),
  date_from     date not null,
  date_to       date,
  style         text check (char_length(style) <= 600),
  moodboard_url text check (char_length(moodboard_url) <= 300),
  fee_text      text check (char_length(fee_text) <= 80),
  poster_name   text check (char_length(poster_name) <= 60),
  poster_role   text check (char_length(poster_role) <= 60),
  poster_handle text check (char_length(poster_handle) <= 30),
  status        text not null default 'open' check (status in ('open','closed')),
  created_at    timestamptz not null default now()
);
create index if not exists jobs_open_idx on public.jobs(status, date_from);
alter table public.jobs enable row level security;

drop policy if exists "logged in reads open jobs" on public.jobs;
create policy "logged in reads open jobs" on public.jobs
  for select using (auth.uid() is not null and (status = 'open' or user_id = auth.uid()));
drop policy if exists "pros post jobs" on public.jobs;
create policy "pros post jobs" on public.jobs
  for insert with check (user_id = auth.uid() and public.is_pro());
drop policy if exists "poster changes own job" on public.jobs;
create policy "poster changes own job" on public.jobs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "poster deletes own job" on public.jobs;
create policy "poster deletes own job" on public.jobs
  for delete using (user_id = auth.uid());

create table if not exists public.job_replies (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text check (char_length(name) <= 60),
  role        text check (char_length(role) <= 60),
  handle      text check (char_length(handle) <= 30),
  email       text check (char_length(email) <= 120),
  message     text not null check (char_length(message) between 2 and 1000),
  created_at  timestamptz not null default now(),
  unique (job_id, user_id)
);
alter table public.job_replies enable row level security;

drop policy if exists "poster and replier read replies" on public.job_replies;
create policy "poster and replier read replies" on public.job_replies
  for select using (user_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid()));
drop policy if exists "pros reply to open jobs" on public.job_replies;
create policy "pros reply to open jobs" on public.job_replies
  for insert with check (user_id = auth.uid() and public.is_pro()
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open' and j.user_id <> auth.uid()));
drop policy if exists "replier deletes own reply" on public.job_replies;
create policy "replier deletes own reply" on public.job_replies
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, delete on public.job_replies to authenticated;

-- answers: everyone logged in still reads them, only approved professionals post them
drop policy if exists "members post answers" on public.answers;
create policy "members post answers" on public.answers
  for insert with check (public.is_member() and public.is_pro() and user_id = auth.uid());
