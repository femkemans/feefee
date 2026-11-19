#!/usr/bin/env bash
# Database test for supabase/site.sql: who may read the whole site's data.
# Needs a throwaway Postgres (see tests/desk/README.md) with a database "gate" built by tests/site/setup.sh.
# Run: bash tests/site/gate.sh     (PGHOST / PGPORT to point elsewhere)
set -u
H=${PGHOST:-/var/tmp/pgff}; PT=${PGPORT:-5544}
ADMIN=33333333-3333-3333-3333-333333333333   # stands in for femke (hello@feefee.co)
MEMBER=11111111-1111-1111-1111-111111111111  # a member, not an admin
FOUNDER=44444444-4444-4444-4444-444444444444 # founder@example.com, on the founders list
pass=0; fail=0
q(){ psql -h "$H" -p "$PT" -U postgres -d gate -qAt -v ON_ERROR_STOP=1 -c "$1" 2>&1; }
# as WHO SQL  -> runs SQL as anon (WHO=anon) or as a logged-in user id
as(){ local who=$1 email=${3:-}; shift
  if [ "$who" = anon ]; then pre="set local role anon;"
  else pre="set local role authenticated; select set_config('request.jwt.claim.sub','$who',true); select set_config('request.jwt.claims','{\"sub\":\"$who\",\"email\":\"$email\"}',true);"; fi
  psql -h "$H" -p "$PT" -U postgres -d gate -qAt -c "begin;" -c "$pre" -c "$1" -c "rollback;" 2>&1 | grep -v -e '^BEGIN' -e '^ROLLBACK' -e "^$who\$" -e '^{' | tail -1; }
ok(){ if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1 (got: $2, want: $3)"; fi; }

# seed (as the database owner)
q "update public.site_access set founders=false, everyone=false;
   insert into public.members(user_id) values ('$MEMBER'),('$ADMIN'),('$FOUNDER') on conflict do nothing;
   insert into public.answers(question_slug,user_id,body) select slug,'$MEMBER','an honest answer' from public.questions where status='approved' limit 1;
   insert into public.jobs(user_id,role_needed,title,city,date_from) values ('$MEMBER','stylist','editorial shoot','Utrecht',current_date+7);
   insert into public.link_pages(user_id,handle,published,name) values ('$MEMBER','sam.vos',true,'Sam Vos') on conflict do nothing;
   insert into public.terms(user_id,slug,published,data) values ('$MEMBER','abcdefgh12',true,'{\"x\":1}') on conflict do nothing;
   insert into public.fee_entries(discipline,role,job_type,country,currency,fee_amount,days,created_at)
     select 'photo','photographer','editorial','nl','EUR',600+g*10,1,now()-interval '40 days' from generate_series(1,6) g;
   delete from public.founders; insert into public.founders(no,email) values (1,'founder@example.com');" >/dev/null

check(){ # label who email expect(t = sees things, f = sees nothing)
  local L=$1 W=$2 E=$3 X=$4
  ok "$L: can_preview()"            "$(as $W "select public.can_preview();" $E)" "$X"
  ok "$L: questions"                "$(as $W "select count(*)>0 from public.questions;" $E)" "$X"
  ok "$L: link pages"               "$(as $W "select count(*)>0 from public.link_pages;" $E)" "$X"
  ok "$L: fee drop"                 "$(as $W "select count(*) filter (where day_low is not null)>0 from public.fee_drop();" $E)" "$X"
  ok "$L: fee drop totals"          "$(as $W "select jobs>0 from public.fee_drop_totals();" $E)" "$X"
  ok "$L: answer counts"            "$(as $W "select count(*)>0 from public.answer_counts();" $E)" "$X"
  ok "$L: shared terms"             "$(as $W "select count(*)>0 from public.terms_by_slug('abcdefgh12');" $E)" "$X"
  if [ "$W" != anon ]; then
    ok "$L: answers"                "$(as $W "select count(*)>0 from public.answers;" $E)" "$X"
    ok "$L: jobs"                   "$(as $W "select count(*)>0 from public.jobs;" $E)" "$X"
  fi
}
echo "--- site closed (today)"
check "anon"    anon     ""                   f
check "member"  $MEMBER  sam@example.com      f
check "founder" $FOUNDER founder@example.com  f
check "femke"   $ADMIN   hello@feefee.co      t
r=$(as $MEMBER "insert into public.questions(slug,title,body,topic,role) values ('x-test','a question here?','body text','rates','stylist');" sam@example.com)
ok "member cannot send a question while closed" "$(echo "$r" | grep -c 'row-level security')" "1"
r=$(as anon "insert into public.questions(slug,title,body,topic,role) values ('x-test2','a question here?','body text','rates','stylist');")
ok "anon cannot send a question while closed" "$(echo "$r" | grep -c 'row-level security')" "1"
ok "nobody reads site_access directly" "$(as $MEMBER "select count(*) from public.site_access;" sam@example.com | grep -c 'permission denied')" "1"
ok "nobody changes site_access via the API" "$(as $ADMIN "update public.site_access set everyone=true;" hello@feefee.co | grep -c 'permission denied')" "1"
ok "the idea box on the landing page still takes ideas" "$(as anon "insert into public.ideas(body) values ('a good idea for fee fee.') returning 'ok';" | grep -c -e ok -e 'violates')" "1"

echo "--- founders in (update public.site_access set founders = true)"
q "update public.site_access set founders=true;" >/dev/null
check "founder (not claimed yet, matched by email)" $FOUNDER founder@example.com t
check "member"  $MEMBER  sam@example.com      f
check "anon"    anon     ""                   f
q "update public.founders set user_id='$FOUNDER';" >/dev/null
check "founder (claimed)" $FOUNDER other@example.com t
ok "a member who is not on the founders list stays out" "$(as $MEMBER "select public.can_preview();" sam@example.com)" "f"

echo "--- everyone in (update public.site_access set everyone = true)"
q "update public.site_access set everyone=true;" >/dev/null
check "member"  $MEMBER  sam@example.com t
check "anon (public parts)" anon "" t
q "update public.site_access set founders=false, everyone=false;" >/dev/null

echo; echo "$pass passed, $fail failed"; [ $fail -eq 0 ]
