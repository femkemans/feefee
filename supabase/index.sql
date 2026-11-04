-- fee fee. the index: professionals and learners, level, up to 3 projects, and the public index list.
-- Run this once in Supabase → SQL editor, after link_pages.sql. Safe to run again.
--
-- Nobody is anonymous: everyone signs up with a name. Two ways to join:
--   professional  shows up in the index (once femke approves), can answer and post jobs
--   learning      reads, asks and uses every tool; open straight away; can switch later
--
-- femke approves professionals by hand: Table editor → joins → set status to 'approved' (or 'declined').
-- Members can never approve themselves: a trigger resets the status whenever they change their own row.

create table if not exists public.joins (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('professional','learning')),
  status     text not null default 'pending' check (status in ('pending','approved','declined')),
  work_link  text check (char_length(work_link) <= 200),
  note       text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.joins enable row level security;

drop policy if exists "owner reads own join" on public.joins;
create policy "owner reads own join" on public.joins for select using (user_id = auth.uid());
drop policy if exists "owner creates own join" on public.joins;
create policy "owner creates own join" on public.joins for insert with check (user_id = auth.uid());
drop policy if exists "owner changes own join" on public.joins;
create policy "owner changes own join" on public.joins for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.joins to authenticated;

-- a member's own change: learning is open at once, professional waits for femke.
-- femke's change in the table editor (no auth.uid()) is kept as she sets it.
create or replace function public.joins_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
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
drop trigger if exists joins_guard on public.joins;
create trigger joins_guard before insert or update on public.joins
  for each row execute function public.joins_guard();

-- is this person an approved professional? (for answering questions and posting jobs later)
create or replace function public.is_pro(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.joins where user_id = uid and kind = 'professional' and status = 'approved');
$$;
grant execute on function public.is_pro(uuid) to anon, authenticated;

-- link pages get a level, up to 3 projects, and a choice to show up in the index
alter table public.link_pages add column if not exists level text check (level in ('starting','working','established'));
alter table public.link_pages add column if not exists projects jsonb not null default '[]'::jsonb;
alter table public.link_pages add column if not exists in_index boolean not null default false;
do $$ begin
  alter table public.link_pages add constraint link_pages_projects_max3
    check (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 3);
exception when duplicate_object then null; end $$;

-- the public index: only approved professionals who switched their page on and chose to be listed.
-- email stays off the index; people reach out through the link page.
create or replace function public.index_people()
returns table(handle text, name text, role text, city text, level text, bio text, instagram text, website text, projects jsonb)
language sql stable security definer set search_path = public as $$
  select l.handle, l.name, l.role, l.city, l.level, l.bio, l.instagram, l.website, l.projects
  from public.link_pages l
  join public.joins j on j.user_id = l.user_id
  where l.published and l.in_index and j.kind = 'professional' and j.status = 'approved' and l.name is not null
  order by l.updated_at desc
  limit 500;
$$;
grant execute on function public.index_people() to anon, authenticated;
