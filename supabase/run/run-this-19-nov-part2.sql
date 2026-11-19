-- fee fee. 19 nov 2026 · part 2 · ideas box + back office + who can see the whole site. Run AFTER run-this-19-nov.sql. Safe to run again.

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 19 nov 2026 · what femke hides stays hidden
-- A writer can still edit their own answer or job, but cannot undo femke's choice:
--   answers: only femke can change "hidden"; the writer and the question stay the same.
--   jobs:    a job femke set to hidden stays hidden for its poster; only femke sets or lifts it.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.answers_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.hidden        := old.hidden;
    new.user_id       := old.user_id;
    new.question_slug := old.question_slug;
    new.created_at    := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists answers_guard on public.answers;
create trigger answers_guard before update on public.answers
  for each row execute function public.answers_guard();

create or replace function public.jobs_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.user_id := old.user_id;
    if old.status = 'hidden' then new.status := 'hidden';
    elsif new.status = 'hidden' then new.status := old.status;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists jobs_guard on public.jobs;
create trigger jobs_guard before update on public.jobs
  for each row execute function public.jobs_guard();

-- check: 3 rows with locked = t
select relname as table_name, relrowsecurity as locked from pg_class where relname in ('ideas','reports','admins') and relnamespace = 'public'::regnamespace order by 1;


-- ───── part 3: who can see the whole site ─────
-- fee fee. who can see the whole site (everything except the landing page and privacy).
-- Run this once in Supabase → SQL editor. Safe to run again. Run it BEFORE fee_drop.sql, index.sql,
-- questions.sql and terms.sql when you set up a fresh database (their functions ask can_preview()).
--
-- Today: only femke (the admins table, see admin.sql).
-- Later, one line each, no code change needed in the database:
--   founders in (e.g. Fri 4 Dec):  update public.site_access set founders = true;
--   founders out again:            update public.site_access set founders = false;
--   doors open for everyone:       update public.site_access set everyone = true;
-- (the pages also check this: website/assets/preview.js asks can_preview() on every page.)
--
-- What it closes in the database, also for someone who skips the website and talks to the API directly:
--   questions, answers, jobs, job replies, link pages (read and write)
--   the fee drop, the index of people, answer counts, shared terms (the functions return nothing)
-- What stays open: the idea box on the landing page, the waitlist, your own login.
-- Your own documents, clients, rates, style and terms stay yours only, as before.

create table if not exists public.site_access (
  id         int primary key default 1 check (id = 1),
  founders   boolean not null default false,
  everyone   boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_access enable row level security;
-- no policies and no grants: nobody reads or changes this table through the API. femke changes it here.
insert into public.site_access (id) values (1) on conflict (id) do nothing;

-- may the person asking see the whole site?
create or replace function public.can_preview() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  a     public.site_access;
  uid   uuid := auth.uid();
  email text := lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'email', ''));
  ok    boolean := false;
begin
  select * into a from public.site_access where id = 1;
  if coalesce(a.everyone, false) then return true; end if;
  if uid is null then return false; end if;
  if to_regclass('public.admins') is not null then
    execute 'select exists(select 1 from public.admins where user_id = $1)' into ok using uid;
    if ok then return true; end if;
  end if;
  if coalesce(a.founders, false) and to_regclass('public.founders') is not null then
    execute 'select exists(select 1 from public.founders where user_id = $1 or (lower(email) = $2 and $2 <> ''''))'
      into ok using uid, email;
    if ok then return true; end if;
  end if;
  return false;
end $$;
revoke all on function public.can_preview() from public;
grant execute on function public.can_preview() to anon, authenticated;

-- tables: an extra lock on top of the rules they already have ("restrictive" = both must say yes)
do $$
declare t text;
begin
  foreach t in array array['questions','answers','jobs','job_replies','link_pages'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "site open" on public.%I', t);
      execute format('create policy "site open" on public.%I as restrictive for all
                        using (public.can_preview()) with check (public.can_preview())', t);
    end if;
  end loop;
end $$;

-- functions that read past the table rules: the same lock, inside the function
-- (these are the same definitions as in fee_drop.sql, index.sql, questions.sql and terms.sql)
do $do$
begin
  if to_regclass('public.fee_entries') is not null then
    execute $f$
create or replace function public.fee_drop(min_jobs int default 5, min_age interval default '30 days')
returns table (discipline text, role text, job_type text, place text, currency text,
               jobs bigint, waiting bigint, day_low numeric, day_high numeric)
language sql stable security definer set search_path = public as $$
  with j as (
    select
      e.discipline,
      lower(trim(split_part(e.role, ',', 1)))           as role,
      e.job_type,
      coalesce(nullif(lower(trim(e.country)), ''), '?') as country,
      e.currency,
      e.fee_amount / nullif(e.days, 0)                  as day_rate,
      e.created_at <= now() - greatest(min_age, interval '30 days') as old_enough
    from public.fee_entries e
    where e.fee_amount > 0 and e.days > 0
      and e.currency is not null and e.currency <> 'other'
      and coalesce(e.payment, '') <> 'trade / tfp'
      and public.can_preview()
  ),
  g as (
    select
      discipline, role, job_type,
      case when grouping(country) = 1 then 'all countries' else country end as place,
      currency,
      count(*) filter (where old_enough)     as jobs,
      count(*) filter (where not old_enough) as waiting,
      percentile_cont(0.25) within group (order by day_rate) filter (where old_enough) as p25,
      percentile_cont(0.75) within group (order by day_rate) filter (where old_enough) as p75
    from j
    group by grouping sets ((discipline, role, job_type, country, currency),
                            (discipline, role, job_type, currency))
  ),
  r as (
    select g.*,
      jobs >= greatest(min_jobs, 5) as ready,
      bool_or(place <> 'all countries' and jobs >= greatest(min_jobs, 5))
        over (partition by discipline, role, job_type, currency) as country_ready
    from g
  )
  select
    discipline, role, job_type, place, currency, jobs, waiting,
    case when shown then floor(p25 / 50) * 50 end as day_low,
    case when shown then ceil(p75 / 50) * 50  end as day_high
  from (select r.*, ready and not (place = 'all countries' and country_ready) as shown from r) x
  order by shown desc, jobs desc, waiting desc;
$$;
$f$;
    execute $f$
create or replace function public.fee_drop_totals()
returns table (jobs bigint, countries bigint, roles bigint)
language sql stable security definer set search_path = public as $$
  select count(*),
         count(distinct nullif(lower(trim(country)), '')),
         count(distinct lower(trim(split_part(role, ',', 1))))
  from public.fee_entries
  where public.can_preview();
$$;
$f$;
  end if;

  if to_regclass('public.link_pages') is not null and to_regclass('public.joins') is not null then
    execute $f$
create or replace function public.index_people()
returns table(handle text, name text, role text, city text, level text, bio text, instagram text, website text, projects jsonb)
language sql stable security definer set search_path = public as $$
  select l.handle, l.name, l.role, l.city, l.level, l.bio, l.instagram, l.website, l.projects
  from public.link_pages l
  join public.joins j on j.user_id = l.user_id
  where l.published and l.in_index and j.kind = 'professional' and j.status = 'approved' and l.name is not null
    and public.can_preview()
  order by l.updated_at desc
  limit 500;
$$;
$f$;
  end if;

  if to_regclass('public.answers') is not null then
    execute $f$
create or replace function public.answer_counts()
returns table (question_slug text, n bigint)
language sql stable security definer set search_path = public as $$
  select question_slug, count(*) from public.answers where public.can_preview() group by question_slug;
$$;
$f$;
  end if;

  if to_regclass('public.terms') is not null then
    execute $f$
create or replace function public.terms_by_slug(s text)
returns table (data jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select t.data, t.updated_at from public.terms t where t.slug = lower(s) and t.published and public.can_preview() limit 1;
$$;
$f$;
  end if;
end $do$;

-- quick check after running: as femke in the site this says true; here in the SQL editor it says false (no login).
select public.can_preview() as "can I see the site (false here is normal)",
       (select founders from public.site_access) as founders_in,
       (select everyone from public.site_access) as everyone_in;
