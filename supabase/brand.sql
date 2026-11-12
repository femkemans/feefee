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
