-- fee fee. 19 nov 2026 · run this whole file once in Supabase → SQL editor → Run. Safe to run again.
-- It turns on: your style, the lock on sent invoices, your clients and your rates.
-- (It includes everything from run-this-18-nov.sql, so you only need this one.)

-- fee fee. your style (website/account.html "Your style.", used on quotes, invoices and later terms, contracts, call sheets)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Every member has one style: a logo (small image, stored as a data url), one accent colour
-- and one of eight type pairs. Only the member can read or change their own style.
-- Until this runs, the style is kept in the member's own browser only.

create table if not exists public.brands (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  accent     text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  pair       text not null default 'classic' check (pair ~ '^[a-z]{3,16}$'),
  logo       text check (logo is null or (length(logo) < 200000 and logo like 'data:image/%')),
  updated_at timestamptz not null default now()
);

alter table public.brands enable row level security;
alter table public.brands force row level security;

drop policy if exists "own brand: read"   on public.brands;
drop policy if exists "own brand: add"    on public.brands;
drop policy if exists "own brand: change" on public.brands;
drop policy if exists "own brand: remove" on public.brands;

create policy "own brand: read"   on public.brands for select to authenticated using (user_id = auth.uid());
create policy "own brand: add"    on public.brands for insert to authenticated with check (user_id = auth.uid());
create policy "own brand: change" on public.brands for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own brand: remove" on public.brands for delete to authenticated using (user_id = auth.uid());

revoke all on public.brands from anon;
grant select, insert, update, delete on public.brands to authenticated;

-- fee fee. desk: quotes and invoices (website/quote.html, website/account.html)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Who can do what:
--   a logged-in member   create, read, change and delete only their OWN documents
--   everyone else        nothing (no login = no access at all)
--
-- Before you run it: if the documents table already exists, check in the table
-- editor that it has a column user_id (uuid). This file assumes that name.
-- Old rows without a user_id become invisible to everyone (they are not deleted).

create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('quote','invoice')),
  number     text,
  client     text,
  job        text,
  total      numeric not null default 0,
  currency   text not null default '€',
  status     text not null default 'draft',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- if the table was made earlier by hand, make sure the owner column exists
alter table public.documents add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.documents alter column user_id set default auth.uid();

create index if not exists documents_user_idx on public.documents (user_id, updated_at desc);

-- the lock: every row is only visible to the person who made it
alter table public.documents enable row level security;
alter table public.documents force row level security;

drop policy if exists "own documents: read"   on public.documents;
drop policy if exists "own documents: add"    on public.documents;
drop policy if exists "own documents: change" on public.documents;
drop policy if exists "own documents: delete" on public.documents;
drop policy if exists "own documents: remove" on public.documents;

create policy "own documents: read"   on public.documents for select to authenticated using (user_id = auth.uid());
create policy "own documents: add"    on public.documents for insert to authenticated with check (user_id = auth.uid());
create policy "own documents: change" on public.documents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own documents: remove" on public.documents for delete to authenticated using (user_id = auth.uid());

-- table rights (this project does not grant them by default; the policies above still decide which rows)
revoke all on public.documents from anon;
grant select, insert, update, delete on public.documents to authenticated;

-- invoice numbers must be unique per person (the law in most EU countries).
-- if this line fails, you already have two invoices with the same number:
-- rename one in the table editor and run it again.
create unique index if not exists documents_invoice_number_unique
  on public.documents (user_id, number)
  where kind = 'invoice' and number is not null and number <> '';

-- quick check after running: this should list 4 policies
-- select policyname, cmd from pg_policies where tablename = 'documents';

-- ─────────────────────────────────────────────────────────────────────────────
-- 18 nov 2026 · a sent invoice is final, also in the database (not only on screen)
--
--   draft            change anything, delete it
--   sent             only the status can change: to paid, or back to draft within 48 hours
--                    of sending (sent by mistake). after that: make a credit note.
--   paid             only back to sent (marked paid by mistake). never deleted.
--   credit notes     follow the same rules (they are invoices too).
--
-- sent and paid invoices can never be deleted: the law asks you to keep them (NL: 7 years).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.documents add column if not exists sent_at timestamptz;

-- invoices that were already sent before this ran: count them as sent at their last change
update public.documents set sent_at = updated_at
 where kind = 'invoice' and status in ('sent','paid') and sent_at is null;

-- only known statuses (not valid = older rows are not checked, new changes are)
alter table public.documents drop constraint if exists documents_status_known;
alter table public.documents add constraint documents_status_known
  check (status in ('draft','sent','accepted','paid')) not valid;

create or replace function public.documents_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  was_final boolean;
begin
  if tg_op = 'DELETE' then
    if old.kind = 'invoice' and old.status in ('sent','paid') then
      raise exception 'locked: a sent invoice cannot be deleted. make a credit note instead.'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'invoice' and new.status in ('sent','paid') then new.sent_at := now();
    else new.sent_at := null; end if;
    return new;
  end if;

  -- UPDATE
  if new.user_id is distinct from old.user_id then
    raise exception 'locked: the owner of a document cannot change.' using errcode = 'P0001';
  end if;

  was_final := old.kind = 'invoice' and old.status in ('sent','paid');

  if was_final then
    if new.kind     is distinct from old.kind
    or new.number   is distinct from old.number
    or new.client   is distinct from old.client
    or new.job      is distinct from old.job
    or new.total    is distinct from old.total
    or new.currency is distinct from old.currency
    or new.data     is distinct from old.data
    or new.created_at is distinct from old.created_at then
      raise exception 'locked: this invoice is sent, so it cannot change. make a credit note instead.'
        using errcode = 'P0001';
    end if;
    if new.status = 'draft' then
      if old.status = 'paid' then
        raise exception 'locked: this invoice is paid. set it to sent first if that was a mistake.'
          using errcode = 'P0001';
      end if;
      if old.sent_at is null or old.sent_at < now() - interval '48 hours' then
        raise exception 'locked: this invoice was sent more than 48 hours ago. make a credit note instead.'
          using errcode = 'P0001';
      end if;
      new.sent_at := null;
    elsif new.status not in ('sent','paid') then
      raise exception 'locked: an invoice can only be draft, sent or paid.' using errcode = 'P0001';
    else
      new.sent_at := old.sent_at;  -- nobody can move the sent date
    end if;
  else
    if new.kind = 'invoice' and new.status in ('sent','paid') then new.sent_at := now();
    else new.sent_at := null; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_guard on public.documents;
create trigger documents_guard
  before insert or update or delete on public.documents
  for each row execute function public.documents_guard();

-- quick check after running: this should say documents_guard
-- select tgname from pg_trigger where tgrelid = 'public.documents'::regclass and not tgisinternal;

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

-- ───── check: 4 rows with locked = t, and documents_guard + clients_guard
select relname as table_name, relrowsecurity as locked from pg_class where relname in ('brands','documents','clients','rates') and relnamespace = 'public'::regnamespace order by 1;
select tgname from pg_trigger where tgrelid in ('public.documents'::regclass,'public.clients'::regclass) and not tgisinternal order by 1;
