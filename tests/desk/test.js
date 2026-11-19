const { chromium, devices } = require('playwright');
const B = require('./backend');
const BASE = 'http://localhost:8099';
const SB = 'https://eadxyfxlhwikesonpaer.supabase.co';
const A = { id: '11111111-1111-1111-1111-111111111111', email: 'sam@example.com' };
const Bu = { id: '22222222-2222-2222-2222-222222222222', email: 'noor@example.com' };
const WHO = { [A.id]: A.email, [Bu.id]: Bu.email };
const SHOTS = process.env.SHOTS || '/tmp';
let fails = 0, passes = 0;
function ok(c, name, extra) { if (c) { passes++; console.log('PASS', name); } else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const { execFileSync } = require('child_process');
const db = s => execFileSync('psql', ['-h', process.env.PGHOST || '/var/tmp/pgff', '-p', process.env.PGPORT || '5544', '-U', 'postgres', '-d', process.env.PGDB || 'e2e', '-qAt', '-c', s], { encoding: 'utf8' }).trim();

async function ctxFor(browser, user, opts = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === SB) {
      if (url.pathname.startsWith('/rest/v1')) return B.handleRest(route, req, url);
      if (url.pathname.startsWith('/auth/v1')) return B.handleAuth(route, req, url, WHO);
      return route.fulfill({ status: 200, body: '{}' });
    }
    if (url.origin === BASE) return route.continue();
    return route.abort();
  });
  await ctx.addInitScript(([s]) => {
    try { if (s && !sessionStorage.getItem('ff-test-out')) localStorage.setItem('sb-eadxyfxlhwikesonpaer-auth-token', JSON.stringify(s)); } catch (e) { }
    window.__dialogs = [];
  }, [user ? B.session(user.id, user.email) : null]);
  const page = await ctx.newPage();
  page.__alerts = []; page.__errors = [];
  page.on('dialog', d => { page.__alerts.push(d.type() + ':' + d.message()); if (d.type() === 'prompt') d.dismiss(); else d.accept(); });
  page.on('pageerror', e => page.__errors.push(e.message));
  return { ctx, page };
}
async function captureMail(page) {
  await page.evaluate(() => { const o = ffMail.href; ffMail.href = m => { window.__mail = m; window.__mailHref = o(m); return '#mail'; }; });
}
const today = () => { const d = new Date(); return d.toISOString().slice(0, 10); };
const daysAgo = n => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };

async function flow(browser, label, devOpts) {
  console.log('\n=== ' + label);
  db("alter table public.documents disable trigger documents_guard; delete from public.documents; delete from public.brands; alter table public.documents enable trigger documents_guard;");
  const { ctx, page } = await ctxFor(browser, A, devOpts);
  const XSS = '<img src=x onerror="alert(\'xss\')">Studio Vos';

  // 1. calculator → quote
  await page.goto(BASE + '/feecalc.html');
  await page.waitForTimeout(800);
  const roleBtn = page.locator('input[name="role"]').first(); if (await roleBtn.count()) await roleBtn.check({ force: true });
  await page.fill('input[name="rate"]', '700').catch(() => { });
  await page.fill('input[name="shoot"]', '1').catch(() => { });
  await page.waitForTimeout(300);
  await page.click('#toquote');
  await page.waitForURL(/quote\.html/);
  await page.waitForTimeout(1200);
  const lines = await page.$$eval('#g-work .line .d', els => els.map(e => e.value));
  ok(lines.length > 0, label + ': calculator lines arrive in the quote', lines);
  ok(!(await page.locator('#ffgate').isVisible().catch(() => false)), label + ': logged-in member sees the tool, not the gate');

  // 2. fill the quote (XSS attempt in client name)
  await page.fill('input[name="me"]', 'Sam Verbeek');
  await page.fill('input[name="iban"]', 'NL00 TEST 0000 0000 00');
  await page.selectOption('select[name="mycountry"]', 'NL');
  await page.fill('input[name="client"]', XSS);
  await page.fill('input[name="contact"]', 'Lotte de Wit');
  await page.fill('input[name="cemail"]', 'lotte@example.com');
  await page.fill('input[name="job"]', 'SS27 lookbook');
  await page.selectOption('select[name="lang"]', 'nl');
  await page.click('#savebtn');
  await page.waitForURL(/doc=/, { timeout: 8000 }).catch(() => { });
  await page.waitForTimeout(1500);
  const qid = new URL(page.url()).searchParams.get('doc');
  ok(!!qid, label + ': quote saved on the desk', page.url());
  ok(db(`select count(*) from documents where kind='quote' and user_id='${A.id}'`) === '1', label + ': quote row in database, owned by Sam');

  // 3. email the quote
  await captureMail(page);
  await page.click('#mail');
  const m1 = await page.evaluate(() => window.__mail);
  ok(m1 && m1.to === 'lotte@example.com' && /Offerte/.test(m1.subject) && /Hoi Lotte/.test(m1.body), label + ': quote email ready in Dutch, to the client', m1);
  ok(await page.locator('#marksent').isVisible(), label + ': "mark as sent" offered after emailing');

  // 4. desk → turn into invoice
  await page.goto(BASE + '/account.html'); await page.waitForTimeout(1500);
  ok(await page.locator('#list .doc').count() === 1, label + ': desk shows the quote');
  await page.locator('#list .doc .more').first().click();
  await page.locator('.menu button', { hasText: 'turn into invoice' }).click();
  await page.waitForURL(/as=invoice/); await page.waitForTimeout(1500);
  ok((await page.inputValue('input[name="qno"]')).startsWith('INV-'), label + ': invoice gets an invoice number', await page.inputValue('input[name="qno"]'));
  await page.click('#savebtn'); await page.waitForURL(/doc=/, { timeout: 8000 }).catch(() => { }); await page.waitForTimeout(1200);
  const iid = new URL(page.url()).searchParams.get('doc');
  ok(!!iid && iid !== qid, label + ': invoice saved as its own document');
  const pay = await page.textContent('#p-pay');
  ok(/overmaken vóór/.test(pay) && /NL00 TEST/.test(pay), label + ': payment line on the invoice (Dutch, with IBAN)', pay);
  ok(/btw/.test(await page.textContent('#doc')), label + ': vat shown on invoice');

  // 5. email invoice and mark as sent → locked
  await captureMail(page);
  await page.click('#mail');
  const m2 = await page.evaluate(() => window.__mail);
  ok(/Factuur INV-/.test(m2.subject) && /overmaken vóór/.test(m2.body), label + ': invoice email ready', m2 && m2.subject);
  await page.click('#marksent'); await page.waitForTimeout(1500);
  ok(await page.locator('.lockbar').isVisible(), label + ': invoice locks after "mark as sent"');
  ok(db(`select status||'|'||(sent_at is not null) from documents where id='${iid}'`) === 'sent|true', label + ': database says sent, with a sent date');
  ok(await page.locator('input[name="client"]').isDisabled(), label + ': fields are disabled when locked');
  ok(!(await page.locator('#mail').isDisabled()) && !(await page.locator('#dl').isDisabled()), label + ': download and email still work when locked');

  // 6. try to change the sent invoice behind the screen (as the owner, straight to the database api)
  const tamper = await page.evaluate(async (id) => { const r = await ffDesk.sb.from('documents').update({ total: 1 }).eq('id', id).select('id'); return r.error && r.error.message; }, iid);
  ok(/locked/.test(tamper || ''), label + ': database refuses changes to a sent invoice', tamper);
  const del = await page.evaluate(async (id) => { const r = await ffDesk.sb.from('documents').delete().eq('id', id).select('id'); return r.error && r.error.message; }, iid);
  ok(/locked/.test(del || ''), label + ': database refuses deleting a sent invoice', del);

  // 7. desk: no delete for sent invoice, back to draft within 48h, paid
  await page.goto(BASE + '/account.html'); await page.waitForTimeout(1500);
  const invRow = page.locator('#list .doc', { has: page.locator('.type', { hasText: 'invoice' }) }).first();
  await invRow.locator('.more').click();
  const items = await page.$$eval('.menu button', b => b.map(x => x.textContent));
  ok(!items.includes('delete'), label + ': no delete for a sent invoice', items);
  ok(items.some(t => /back to draft/.test(t)), label + ': "back to draft" offered within 48 hours', items);
  ok(items.some(t => /payment reminder/.test(t)), label + ': payment reminder offered', items);
  await page.locator('.menu button', { hasText: 'back to draft' }).click(); await page.waitForTimeout(1200);
  ok(db(`select status from documents where id='${iid}'`) === 'draft', label + ': back to draft works');
  await invRow.locator('.pill').click(); await page.waitForTimeout(1200); // draft → sent (confirm accepted)
  await invRow.locator('.pill').click(); await page.waitForTimeout(1200); // sent → paid
  ok(db(`select status from documents where id='${iid}'`) === 'paid', label + ': marked paid from the desk');
  ok(/0,00|0\.00/.test(await page.textContent('#s-open')), label + ': nothing left to be paid after paying', await page.textContent('#s-open'));

  // 8. a late invoice: dated 40 days ago, pay within 14 → late
  db(`alter table documents disable trigger documents_guard; insert into documents(user_id,kind,number,client,job,total,status,sent_at,data) values ('${A.id}','invoice','INV-2026-900','Atelier Mol','Campagne',1000,'sent',now()-interval '30 days','{"kind":"invoice","qno":"INV-2026-900","lang":"en","contact":"Ruben Mol","cemail":"ruben@example.com","job":"Campagne","docdate":"${daysAgo(40)}","valid":"14","cur":"€","_sub":1000,"_grand":1210,"me":"Sam Verbeek","iban":"NL00 TEST 0000 0000 00"}'); alter table documents enable trigger documents_guard;`);
  await page.reload(); await page.waitForTimeout(1500);
  ok(await page.locator('#s-late').isVisible(), label + ': desk says an invoice is past its due date', await page.textContent('#s-late'));
  ok(/26 days past/.test(await page.textContent('#list')), label + ': row shows how many days late', (await page.textContent('#list')).slice(0, 300));
  ok(/1\.210,00|1,210\.00/.test(await page.textContent('#s-open')), label + ': still to be paid = incl. vat of sent invoices', await page.textContent('#s-open'));
  await captureMail(page);
  const lateRow = page.locator('#list .doc', { hasText: 'Atelier Mol' });
  await lateRow.locator('.more').click();
  await page.locator('.menu button', { hasText: 'email a payment reminder' }).click();
  const m3 = await page.evaluate(() => window.__mail);
  ok(m3 && m3.to === 'ruben@example.com' && /Reminder: invoice INV-2026-900/.test(m3.subject) && /friendly reminder/.test(m3.body) && /1,210\.00/.test(m3.body), label + ': friendly reminder email', m3);
  ok(!(await page.locator('.menu button', { hasText: 'back to draft' }).count()), label + ': no "back to draft" after 48 hours');
  await page.screenshot({ path: `${SHOTS}/desk-${label}.png`, fullPage: false });

  // 9. credit note on the paid invoice
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5);
  await page.goto(BASE + `/quote.html?copy=${iid}&as=credit`); await page.waitForTimeout(1500);
  ok(/CREDITNOTA|CREDIT NOTE/.test(await page.textContent('#p-kind')), label + ': credit note opens from the invoice');
  ok(/-/.test(await page.textContent('#p-total')), label + ': credit note total is negative', await page.textContent('#p-total'));

  // 10. XSS never ran
  ok(!page.__alerts.some(a => /xss/.test(a)), label + ': script in a client name never runs', page.__alerts);
  ok(page.__errors.length === 0, label + ': no page errors', page.__errors);

  // 11. another member cannot see or open Sam's documents
  const other = await ctxFor(browser, Bu, devOpts);
  await other.page.goto(BASE + '/account.html'); await other.page.waitForTimeout(1500);
  ok(await other.page.locator('#list .doc').count() === 0, label + ': Noor sees none of Sam\'s documents');
  await other.page.goto(BASE + '/quote.html?doc=' + iid); await other.page.waitForTimeout(1500);
  ok(/could not open/.test(await other.page.textContent('#savemsg')), label + ': Noor cannot open Sam\'s invoice by its link');
  const steal = await other.page.evaluate(async (id) => { const r = await ffDesk.sb.from('documents').update({ client: 'x' }).eq('id', id).select('id'); return (r.data || []).length; }, qid);
  ok(steal === 0, label + ': Noor cannot change Sam\'s quote');
  await other.ctx.close();

  // 12. log out wipes private paperwork from this browser
  await page.goto(BASE + '/account.html'); await page.waitForTimeout(1200);
  const before = await page.evaluate(() => !!localStorage.getItem('ff-me'));
  await page.evaluate(() => sessionStorage.setItem('ff-test-out', '1'));
  await page.click('#out'); await page.waitForTimeout(1500);
  const left = await page.evaluate(() => ['ff-me', 'ff-quote-v2', 'ff-brand', 'sb-eadxyfxlhwikesonpaer-auth-token'].filter(k => localStorage.getItem(k)));
  ok(before && left.length === 0, label + ': log out removes your details from this browser', { before, left });

  // 13. logged out: the tool sends you to the homepage (only the landing page is public), and the database gives nothing
  const anon = await ctxFor(browser, null, devOpts);
  await anon.page.goto(BASE + '/quote.html'); await anon.page.waitForTimeout(1500);
  ok(new URL(anon.page.url()).pathname === '/', label + ': logged out is sent to the homepage', anon.page.url());
  await anon.page.goto(BASE + '/in.html'); await anon.page.waitForTimeout(1200);
  const anonRead = await anon.page.evaluate(async () => { const r = await ffDesk.sb.from('documents').select('*'); return r.error ? 'error' : (r.data || []).length; });
  ok(anonRead === 'error' || anonRead === 0, label + ': logged out cannot read documents', anonRead);
  await anon.ctx.close();
  await ctx.close();
}

(async () => {
  db("update public.site_access set everyone = true"); // these tests are about the desk, not about who may see the site (tests/site does that)
  const browser = await chromium.launch();
  await flow(browser, 'laptop', { viewport: { width: 1280, height: 860 } });
  await flow(browser, 'phone', { ...devices['iPhone 13'] });
  await browser.close();
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
