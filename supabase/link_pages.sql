-- fee fee. link pages: a free link-in-bio page for every member, at feefee.co/@handle
-- (website/404.html shows the page, website/account.html is where members edit it).
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Who can do what:
--   everyone (no login)  read pages that are switched on (published = true)
--   the owner            read, create, change and delete their own page
-- Fees are never stored here, so a link page can never show them.

create table if not exists public.link_pages (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  handle     text unique not null check (handle ~ '^[a-z0-9][a-z0-9._-]{1,29}$'),
  published  boolean not null default false,
  name       text check (char_length(name) <= 60),
  role       text check (char_length(role) <= 60),
  city       text check (char_length(city) <= 60),
  bio        text check (char_length(bio) <= 140),
  instagram  text check (char_length(instagram) <= 40),
  website    text check (char_length(website) <= 200),
  email      text check (char_length(email) <= 120),
  links      jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6),
  updated_at timestamptz not null default now()
);
alter table public.link_pages enable row level security;

drop policy if exists "public reads pages that are on" on public.link_pages;
create policy "public reads pages that are on" on public.link_pages
  for select using (published or user_id = auth.uid());
drop policy if exists "owner creates own page" on public.link_pages;
create policy "owner creates own page" on public.link_pages
  for insert with check (user_id = auth.uid());
drop policy if exists "owner changes own page" on public.link_pages;
create policy "owner changes own page" on public.link_pages
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "owner deletes own page" on public.link_pages;
create policy "owner deletes own page" on public.link_pages
  for delete using (user_id = auth.uid());

-- this project does not grant table rights by itself
grant select on public.link_pages to anon;
grant select, insert, update, delete on public.link_pages to authenticated;

-- handles that would clash with pages on the site
create or replace function public.link_handle_ok() returns trigger
language plpgsql as $$
begin
  if new.handle in ('admin','account','desk','feefee','fee','fees','questions','quote','privacy','manifesto','about','join','login','help','hello','support','assets') then
    raise exception 'that name is taken';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists link_handle_ok on public.link_pages;
create trigger link_handle_ok before insert or update on public.link_pages
  for each row execute function public.link_handle_ok();
