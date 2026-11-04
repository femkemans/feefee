-- fee fee. weekly fee drop (website/drops.html + the Thursday email)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- The fair-play rule lives here, not in the page:
--   * only booked or finished jobs (the form only takes those)
--   * only jobs shared at least 30 days ago
--   * only groups with 5 or more of those jobs
--   * only the middle half of the day rates (25th to 75th percentile),
--     rounded outwards to 50 in the job's currency
--   * never a single fee, never a name, never a client
--
-- Groups smaller than 5 come back without a range, only with a count, so a drop
-- can say "stylists, editorial: 3 of 5 jobs in". The raw fee_entries table stays
-- closed: the public key can still only add a row, never read one.

create or replace function public.fee_drop(min_jobs int default 5, min_age interval default '30 days')
returns table (
  discipline text,
  role       text,
  job_type   text,
  place      text,     -- a country, or 'all countries'
  currency   text,
  jobs       bigint,   -- jobs old enough to count
  waiting    bigint,   -- newer jobs that count once they are a month old
  day_low    numeric,  -- null until jobs >= min_jobs
  day_high   numeric
)
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
      -- one level only: when a country is ready, its 'all countries' range stays
      -- hidden, so two ranges can't be set side by side to work out a small group
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

-- greatest(...): nobody can ask for smaller or newer groups than the rule allows.
revoke all on function public.fee_drop(int, interval) from public;
grant execute on function public.fee_drop(int, interval) to anon, authenticated;

-- Totals for the drop's footer ("built from 41 jobs, shared by creatives in 9 countries").
create or replace function public.fee_drop_totals()
returns table (jobs bigint, countries bigint, roles bigint)
language sql stable security definer set search_path = public as $$
  select count(*),
         count(distinct nullif(lower(trim(country)), '')),
         count(distinct lower(trim(split_part(role, ',', 1))))
  from public.fee_entries;
$$;
grant execute on function public.fee_drop_totals() to anon, authenticated;
