-- fee fee. terms and conditions (website/terms.html, website/t.html, website/quote.html)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Every member has one set of terms. Who can do what:
--   the member          read, change and delete their OWN terms
--   anyone with a link  read ONE set of terms, only when the member turned "share as a link" on,
--                       and only through terms_by_slug(slug). the table itself stays closed,
--                       so nobody can list everyone's terms.

create table if not exists public.terms (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  slug       text not null unique check (slug ~ '^[a-z0-9]{8,24}$'),
  published  boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.terms enable row level security;
alter table public.terms force row level security;

drop policy if exists "own terms: read"   on public.terms;
drop policy if exists "own terms: add"    on public.terms;
drop policy if exists "own terms: change" on public.terms;
drop policy if exists "own terms: remove" on public.terms;

create policy "own terms: read"   on public.terms for select to authenticated using (user_id = auth.uid());
create policy "own terms: add"    on public.terms for insert to authenticated with check (user_id = auth.uid());
create policy "own terms: change" on public.terms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own terms: remove" on public.terms for delete to authenticated using (user_id = auth.uid());

revoke all on public.terms from anon;
grant select, insert, update, delete on public.terms to authenticated;

-- the shared link: one set of terms by its link code, only when shared
create or replace function public.terms_by_slug(s text)
returns table (data jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select t.data, t.updated_at from public.terms t where t.slug = lower(s) and t.published limit 1;
$$;

revoke all on function public.terms_by_slug(text) from public;
grant execute on function public.terms_by_slug(text) to anon, authenticated;

-- quick check after running: this should list 4 policies
-- select policyname, cmd from pg_policies where tablename = 'terms';
