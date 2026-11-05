-- fee fee. back office: femke's private desk (website/admin.html), reports and hiding.
-- Run this once in Supabase → SQL editor, AFTER index.sql, jobs.sql and ideas.sql. Safe to run again.
--
-- Who can do what:
--   femke (admins)   sees everything waiting: professionals, questions, ideas, jobs, reports;
--                    says yes or no, hides an answer or a job
--   members          report an answer, a question or a job (they never see other reports)
-- Add another admin: insert into public.admins (user_id) select id from auth.users where email = '...';

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
drop policy if exists "admins see own row" on public.admins;
create policy "admins see own row" on public.admins for select using (user_id = auth.uid());
grant select on public.admins to authenticated;

insert into public.admins (user_id)
  select id from auth.users where lower(email) in ('hello@femkejuffermans.com', 'hello@feefee.co')
on conflict do nothing;

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = uid);
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- joins: femke says yes or no from the back office. her change is kept as she sets it.
create or replace function public.joins_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    if new.kind = 'learning' then
      new.status := 'approved';
    elsif tg_op = 'INSERT' or old.kind is distinct from new.kind then
      new.status := 'pending';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;
drop policy if exists "admin reads joins" on public.joins;
create policy "admin reads joins" on public.joins for select using (public.is_admin());
drop policy if exists "admin changes joins" on public.joins;
create policy "admin changes joins" on public.joins for update using (public.is_admin()) with check (public.is_admin());

-- the people waiting, with their name and email (only for femke)
create or replace function public.admin_joins()
returns table(user_id uuid, kind text, status text, work_link text, note text, vouch text, intro_call boolean,
              created_at timestamptz, email text, name text, role text, city text, instagram text, website text)
language sql stable security definer set search_path = public as $$
  select j.user_id, j.kind, j.status, j.work_link, j.note, j.vouch, j.intro_call, j.created_at,
         u.email, u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'role', u.raw_user_meta_data->>'city',
         u.raw_user_meta_data->>'instagram', u.raw_user_meta_data->>'website'
  from public.joins j join auth.users u on u.id = j.user_id
  where public.is_admin()
  order by j.created_at desc
  limit 500;
$$;
grant execute on function public.admin_joins() to authenticated;

-- questions: femke sees and approves every status
drop policy if exists "admin reads questions" on public.questions;
create policy "admin reads questions" on public.questions for select using (public.is_admin());
drop policy if exists "admin changes questions" on public.questions;
create policy "admin changes questions" on public.questions for update using (public.is_admin()) with check (public.is_admin());
grant update on public.questions to authenticated;

-- ideas: femke reads them and marks them as read
alter table public.ideas add column if not exists seen boolean not null default false;
drop policy if exists "admin reads ideas" on public.ideas;
create policy "admin reads ideas" on public.ideas for select using (public.is_admin());
drop policy if exists "admin changes ideas" on public.ideas;
create policy "admin changes ideas" on public.ideas for update using (public.is_admin()) with check (public.is_admin());
grant select, update on public.ideas to authenticated;

-- answers: femke can hide one. hidden answers only show to their writer and femke.
alter table public.answers add column if not exists hidden boolean not null default false;
drop policy if exists "members read answers" on public.answers;
create policy "members read answers" on public.answers
  for select using (public.is_member() and (not hidden or user_id = auth.uid() or public.is_admin()));
drop policy if exists "admin changes answers" on public.answers;
create policy "admin changes answers" on public.answers for update using (public.is_admin()) with check (public.is_admin());

-- jobs: femke sees every job and can hide one
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('open','closed','hidden'));
drop policy if exists "admin reads jobs" on public.jobs;
create policy "admin reads jobs" on public.jobs for select using (public.is_admin());
drop policy if exists "admin changes jobs" on public.jobs;
create policy "admin changes jobs" on public.jobs for update using (public.is_admin()) with check (public.is_admin());

-- reports: any logged-in member can report an answer, a question or a job
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('answer','question','job')),
  target     text not null check (char_length(target) <= 120),
  reason     text check (char_length(reason) <= 500),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status     text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "members report" on public.reports;
create policy "members report" on public.reports for insert with check (user_id = auth.uid() and status = 'open');
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports" on public.reports for select using (public.is_admin());
drop policy if exists "admin changes reports" on public.reports;
create policy "admin changes reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.reports to authenticated;
