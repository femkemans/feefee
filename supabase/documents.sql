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
