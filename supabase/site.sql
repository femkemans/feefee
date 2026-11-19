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
