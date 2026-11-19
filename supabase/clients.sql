-- fee fee. your clients + your rates (website/account.html, quote.html, feecalc.html)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Who can do what:
--   a logged-in member   create, read, change and delete only their OWN clients and rates
--   everyone else        nothing (no login = no access at all)
--
-- Clients are an address book: company, contact, email, address, country, vat number.
-- Rates are one row per member: day rate, half day, per km and a short list of other fees.

-- ───── clients ─────
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company    text not null check (length(btrim(company)) between 1 and 120),
  contact    text check (contact is null or length(contact) <= 120),
  email      text check (email is null or (length(email) <= 200 and email ~ '^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]+$')),
  addr       text check (addr is null or length(addr) <= 300),
  country    text check (country is null or country ~ '^[A-Z]{2}$'),
  vat        text check (vat is null or length(vat) <= 40),
  business   boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_idx on public.clients (user_id, company);

alter table public.clients enable row level security;
alter table public.clients force row level security;

drop policy if exists "own clients: read"   on public.clients;
drop policy if exists "own clients: add"    on public.clients;
drop policy if exists "own clients: change" on public.clients;
drop policy if exists "own clients: remove" on public.clients;

create policy "own clients: read"   on public.clients for select to authenticated using (user_id = auth.uid());
create policy "own clients: add"    on public.clients for insert to authenticated with check (user_id = auth.uid());
create policy "own clients: change" on public.clients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own clients: remove" on public.clients for delete to authenticated using (user_id = auth.uid());

revoke all on public.clients from anon;
grant select, insert, update, delete on public.clients to authenticated;

-- an address book, not a spam list: at most 500 clients per member
create or replace function public.clients_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'locked: the owner of a client cannot change.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.clients c where c.user_id = new.user_id) >= 500 then
    raise exception 'locked: you have 500 clients saved, the most there is room for.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.clients_guard() from public;

drop trigger if exists clients_guard on public.clients;
create trigger clients_guard before insert or update on public.clients
  for each row execute function public.clients_guard();

-- ───── rates ─────
-- data looks like: {"cur":"€","day":850,"half":500,"km":0.23,"items":[{"name":"retouch, per image","amount":35}]}
create table if not exists public.rates (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8000),
  updated_at timestamptz not null default now()
);

alter table public.rates enable row level security;
alter table public.rates force row level security;

drop policy if exists "own rates: read"   on public.rates;
drop policy if exists "own rates: add"    on public.rates;
drop policy if exists "own rates: change" on public.rates;
drop policy if exists "own rates: remove" on public.rates;

create policy "own rates: read"   on public.rates for select to authenticated using (user_id = auth.uid());
create policy "own rates: add"    on public.rates for insert to authenticated with check (user_id = auth.uid());
create policy "own rates: change" on public.rates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rates: remove" on public.rates for delete to authenticated using (user_id = auth.uid());

revoke all on public.rates from anon;
grant select, insert, update, delete on public.rates to authenticated;

-- quick check after running: both should say true
-- select relname, relrowsecurity from pg_class where relname in ('clients','rates') and relnamespace = 'public'::regnamespace;
