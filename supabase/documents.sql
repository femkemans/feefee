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
