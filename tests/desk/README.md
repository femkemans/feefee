# desk tests (quotes, invoices, your desk)

End-to-end tests for `quote.html`, `account.html` and `feecalc.html`, on a laptop and a phone screen.
They run against a **real local Postgres** with the exact SQL from `supabase/` (row level security,
the sent-invoice lock), behind a tiny stand-in for the Supabase API (`backend.js`). Nothing touches
the live database. Names and emails in the tests are invented.

What they check, among others: only you see your own documents (another member gets nothing, even
by direct link or straight to the API), logged out gets nothing, a sent invoice cannot be changed or
deleted (also not behind the screen), back to draft only within 48 hours, unique invoice numbers,
script in a client name never runs, log out wipes your details from the browser, late invoices and
the reminder email, email it, calculator → quote → invoice → paid → credit note.

Run:

    # 1. a throwaway Postgres 16 on a socket in /var/tmp/pgff, port 5544
    # 2. create database e2e, then run in order (add supabase/clients.sql for book.test.js):
    #    tests/desk/supabase-stub.sql, supabase/site.sql, supabase/documents.sql, supabase/brand.sql, supabase/terms.sql
    #    (the stub needs roles anon + authenticated: create role anon nologin; create role authenticated nologin;)
    # 3. serve the site:   cd website && python3 -m http.server 8099
    # 4. node tests/desk/test.js and node tests/desk/book.test.js   (PGHOST / PGPORT / PGDB to point elsewhere; SHOTS=dir for screenshots)

The desk tests open the site for their invented users (`update public.site_access set everyone = true`), so step 2
also needs `supabase/site.sql`, run before `supabase/terms.sql`.

## who may see the site (tests/site)

`supabase/site.sql` + `website/assets/preview.js`: only femke (admins) sees the pages behind the landing page,
later founders (`founders = true`) or everyone. Checked in the database (also straight to the API) and in the browser.

    bash tests/site/setup.sh           # builds a database "gate" with the real SQL
    bash tests/site/gate.sh            # database: closed for anon, members, founders; open for femke; founders/everyone switches
    PGDB=gate node tests/site/pages.test.js   # browser: every page, logged out / member / founder / femke, login link, old preview link
