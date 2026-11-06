-- fee fee. founding members: the first 100 people get a number ("founding member no. 07").
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- How numbers are given:
--   1. femke seeds the waitlist in sign-up order (seed file in the project files, never in this public repo):
--        insert into public.founders (no, email) values (1, 'someone@example.com'), ... on conflict do nothing;
--   2. everyone else gets the next free number the first time they open their desk (claim_founder()),
--      until 100 numbers are given out.
-- The table itself is closed: members only ever see their own number, through the functions below.

create table if not exists public.founders (
  no         int primary key check (no between 1 and 100),
  email      text not null unique,
  user_id    uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.founders enable row level security;
-- no policies and no grants: nobody reads the table directly.

-- your own number (claims the next one if you don't have one and there are numbers left)
create or replace function public.claim_founder() returns int
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(coalesce(auth.jwt() ->> 'email', ''));
  n int;
begin
  if auth.uid() is null or e = '' then return null; end if;
  select no into n from public.founders where lower(email) = e;
  if n is not null then
    update public.founders set user_id = auth.uid() where no = n and user_id is null;
    return n;
  end if;
  lock table public.founders in exclusive mode;
  select coalesce(max(no), 0) + 1 into n from public.founders;
  if n > 100 then return null; end if;
  insert into public.founders (no, email, user_id) values (n, e, auth.uid());
  return n;
end;
$$;
revoke all on function public.claim_founder() from public;
grant execute on function public.claim_founder() to authenticated;

-- a member's number for their public link page (only the number, nothing else)
create or replace function public.founder_no(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select no from public.founders where user_id = uid;
$$;
grant execute on function public.founder_no(uuid) to anon, authenticated;
