-- fee fee. questions page (website/questions.html)
-- Run this once in Supabase → SQL editor. Safe to run again.
--
-- Who can do what:
--   everyone (no login)  read approved questions, see how many answers each has,
--                        send in a new question (it waits for approval)
--   members              read answers, post answers
--   femke (dashboard)    approve questions (status → 'approved'), add members
--
-- A member is someone with a row in public.members. For now femke adds rows by
-- hand in the table editor (user id from Authentication → Users). When paid
-- membership arrives, the payment webhook adds the row instead; nothing on the
-- page has to change.

create table if not exists public.members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  since      timestamptz not null default now(),
  plan       text not null default 'founding',
  display_name text
);
alter table public.members enable row level security;
drop policy if exists "members see own row" on public.members;
create policy "members see own row" on public.members
  for select using (user_id = auth.uid());

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;
grant execute on function public.is_member() to anon, authenticated;

create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null check (char_length(title) between 8 and 200),
  body         text check (char_length(body) <= 2000),
  topic        text not null default 'rates',
  role         text,
  display_name text check (char_length(display_name) <= 60),
  status       text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at   timestamptz not null default now()
);
alter table public.questions enable row level security;
drop policy if exists "public reads approved questions" on public.questions;
create policy "public reads approved questions" on public.questions
  for select using (status = 'approved');
drop policy if exists "anyone sends a question for approval" on public.questions;
create policy "anyone sends a question for approval" on public.questions
  for insert with check (status = 'pending');

create table if not exists public.answers (
  id            uuid primary key default gen_random_uuid(),
  question_slug text not null references public.questions(slug) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name  text check (char_length(display_name) <= 60),
  role          text check (char_length(role) <= 60),
  body          text not null check (char_length(body) between 2 and 4000),
  created_at    timestamptz not null default now()
);
create index if not exists answers_question_idx on public.answers(question_slug);
alter table public.answers enable row level security;
drop policy if exists "members read answers" on public.answers;
create policy "members read answers" on public.answers
  for select using (public.is_member());
drop policy if exists "members post answers" on public.answers;
create policy "members post answers" on public.answers
  for insert with check (public.is_member() and user_id = auth.uid());
drop policy if exists "members edit own answers" on public.answers;
create policy "members edit own answers" on public.answers
  for update using (user_id = auth.uid() and public.is_member());
drop policy if exists "members delete own answers" on public.answers;
create policy "members delete own answers" on public.answers
  for delete using (user_id = auth.uid());

-- answer counts are public (the teaser "3 answers"), the answers themselves are not
create or replace function public.answer_counts()
returns table (question_slug text, n bigint)
language sql stable security definer set search_path = public as $$
  select question_slug, count(*) from public.answers group by question_slug;
$$;
grant execute on function public.answer_counts() to anon, authenticated;

-- starter questions (the same ones are written into questions.html so search engines see them)
insert into public.questions (slug, title, body, topic, role, status) values
 ('socials-usage', 'a brand wants my photos for ''socials''. what do I ask before I quote?', 'organic posts on their own account, or paid ads too? and for how long?', 'usage', 'photographer', 'approved'),
 ('prep-day-paid', 'should my prep day be paid at the full day rate?', 'shopping, pulls and fittings take me a full day before every shoot. the client only budgets the shoot day.', 'rates', 'stylist', 'approved'),
 ('day-rate-starting', 'I''m two years in. what''s a normal day rate for editorial?', 'editorial pays less than commercial, I know. but how much less is normal?', 'rates', 'stylist', 'approved'),
 ('buyout-price', 'how do I price a buy-out?', 'the client wants ''all rights, forever''. is there a rule of thumb on top of the day rate?', 'usage', 'photographer', 'approved'),
 ('deposit', 'can I ask for a deposit before the shoot?', 'a new client, a big production. I''ll be paying crew and studio upfront.', 'getting paid', 'producer', 'approved'),
 ('late-payment', 'the invoice is 60 days late. what do I send now?', 'friendly reminders didn''t work. what''s the next step that doesn''t burn the relationship?', 'getting paid', 'photographer', 'approved'),
 ('kit-fee', 'do I charge separately for my kit?', 'brushes, products, the whole case. it wears out and I replace it.', 'quotes & invoices', 'makeup artist', 'approved'),
 ('overtime', 'the shoot ran 13 hours. can I bill overtime afterwards?', 'nothing about overtime was in the quote.', 'contracts', 'stylist', 'approved'),
 ('cancellation', 'the client cancelled two days before. do they still pay?', 'I turned down another job for this date.', 'contracts', 'videographer', 'approved'),
 ('agency-cut', 'an agency books me and takes 20%. is that normal?', 'I''m not signed with them, they just found me for one job.', 'clients', 'photographer', 'approved'),
 ('assistant-rate', 'what do I pay my assistant?', 'I want to be fair, but my own budget is small.', 'rates', 'stylist', 'approved'),
 ('free-test', 'a brand asks for a ''test shoot'' for free. yes or no?', 'they say it could lead to a big campaign.', 'clients', 'photographer', 'approved')
on conflict (slug) do nothing;
