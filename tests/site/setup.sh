#!/usr/bin/env bash
# Builds the throwaway "gate" database for tests/site: the real SQL from supabase/, in the order a fresh project needs.
# Needs the Postgres from tests/desk/README.md (socket /var/tmp/pgff, port 5544, roles anon + authenticated).
set -e
cd "$(dirname "$0")/../.."
P="psql -h ${PGHOST:-/var/tmp/pgff} -p ${PGPORT:-5544} -U postgres -q -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists gate" -c "create database gate"
G="$P -d gate"
$G -f tests/desk/supabase-stub.sql
$G -c "create function auth.jwt() returns jsonb language sql stable as \$\$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb \$\$;
grant execute on function auth.jwt() to anon, authenticated;
alter table auth.users add column email text, add column raw_user_meta_data jsonb;
insert into auth.users(id,email) values ('33333333-3333-3333-3333-333333333333','hello@feefee.co'),('44444444-4444-4444-4444-444444444444','founder@example.com');
update auth.users set email='sam@example.com' where id='11111111-1111-1111-1111-111111111111';
-- stand-in for the fee form's table (made in the Supabase dashboard, not in this repo)
create table public.fee_entries(id serial primary key, discipline text, role text, job_type text, country text, currency text,
  fee_amount numeric, days numeric, payment text, created_at timestamptz default now());
grant insert on public.fee_entries to anon, authenticated;"
for f in site questions link_pages index jobs ideas admin founders fee_drop documents brand terms clients site; do
  $G -f supabase/$f.sql >/dev/null 2>&1 || { echo "failed: supabase/$f.sql"; $G -f supabase/$f.sql; exit 1; }
done
echo "gate database ready"
