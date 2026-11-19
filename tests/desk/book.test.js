// your clients + your rates: account.html, quote.html, feecalc.html. Same setup as test.js (see README).
const { chromium, devices } = require('playwright');
const B = require('./backend');
const { execFileSync } = require('child_process');
const BASE = 'http://localhost:8099', SB = 'https://eadxyfxlhwikesonpaer.supabase.co';
const A = { id: '11111111-1111-1111-1111-111111111111', email: 'sam@example.com' };
const Bu = { id: '22222222-2222-2222-2222-222222222222', email: 'noor@example.com' };
const WHO = { [A.id]: A.email, [Bu.id]: Bu.email };
const db = s => execFileSync('psql', ['-h', process.env.PGHOST || '/var/tmp/pgff', '-p', process.env.PGPORT || '5544', '-U', 'postgres', '-d', process.env.PGDB || 'e2e', '-qAt', '-c', s], { encoding: 'utf8' }).trim();
let fails = 0, passes = 0;
function ok(c, name, extra) { if (c) { passes++; console.log('PASS', name); } else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

async function ctxFor(browser, user, opts = {}, lang) {
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
  await ctx.addInitScript(([s, lang]) => { try { if (lang) localStorage.setItem('ff-lang', lang); if (s) localStorage.setItem('sb-eadxyfxlhwikesonpaer-auth-token', JSON.stringify(s)); } catch (e) { } },
    [user ? B.session(user.id, user.email) : null, lang || null]);
  const page = await ctx.newPage(); page.__errors = []; page.__alerts = [];
  page.on('dialog', d => { page.__alerts.push(d.message()); d.accept(); });
  page.on('pageerror', e => page.__errors.push(e.message));
  return { ctx, page };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function flow(browser, label, dev) {
  console.log('\n=== ' + label);
  db('delete from public.clients; delete from public.rates;');
  const { ctx, page } = await ctxFor(browser, A, dev);

  // rates
  await page.goto(BASE + '/account.html'); await page.waitForTimeout(1500);
  ok(await page.locator('#rates').isVisible(), label + ': "Your rates." on the desk');
  await page.fill('#rt-day', '850'); await page.fill('#rt-half', '500'); await page.fill('#rt-km', '0,25');
  await page.click('#rt-add'); const I = page.locator('#rt-items .rt-row').last().locator('input');
  await I.nth(0).fill('retouch, per image'); await I.nth(1).fill('35');
  await page.click('#rt button.btn'); await page.waitForTimeout(1200);
  const rd = JSON.parse(db(`select data::text from rates where user_id='${A.id}'`) || '{}');
  ok(rd.day === 850 && rd.half === 500 && rd.km === 0.25 && rd.items && rd.items[0].name === 'retouch, per image' && rd.items[0].amount === 35, label + ': rates saved (comma decimals too)', rd);
  await page.reload(); await page.waitForTimeout(1500);
  ok(await page.inputValue('#rt-day') === '850' && await page.locator('#rt-items .rt-row').count() === 1, label + ': rates come back after reload');

  // clients
  await page.click('#cl-new'); await page.fill('#cl-company', 'Atelier Mol'); await page.fill('#cl-contact', 'Ruben Mol');
  await page.fill('#cl-email', 'ruben@example'); await page.selectOption('#cl-country', 'BE'); await page.fill('#cl-vat', 'BE0123456789');
  await page.evaluate(() => document.getElementById('cl-email').type = 'text'); // let the database be the judge
  await page.click('#cl button.btn'); await page.waitForTimeout(1000);
  ok(/does not look right/.test(await page.textContent('#cl-msg')), label + ': a broken email is refused', await page.textContent('#cl-msg'));
  await page.fill('#cl-email', 'ruben@example.com'); await page.click('#cl button.btn'); await page.waitForTimeout(1200);
  ok(db(`select company||'|'||country||'|'||vat from clients where user_id='${A.id}'`) === 'Atelier Mol|BE|BE0123456789', label + ': client saved, owned by Sam');
  ok(await page.locator('#cl-list .cl').count() === 1 && await page.locator('#cl').isHidden(), label + ': client shows in the list');
  await page.locator('#cl-list .cl button', { hasText: 'edit' }).click(); await page.fill('#cl-contact', 'Ruben de Mol'); await page.click('#cl button.btn'); await page.waitForTimeout(1000);
  ok(db(`select contact from clients where user_id='${A.id}'`) === 'Ruben de Mol' && db(`select count(*) from clients`) === '1', label + ': edit changes the same client');
  ok(await overflow(page) <= 0, label + ': desk fits the screen');

  // quote for this client
  await page.locator('#cl-list .cl a', { hasText: 'new quote' }).click(); await page.waitForURL(/client=/); await page.waitForTimeout(2000);
  ok(await page.inputValue('input[name="client"]') === 'Atelier Mol' && await page.inputValue('input[name="cemail"]') === 'ruben@example.com' && await page.inputValue('select[name="ccountry"]') === 'BE', label + ': client details filled into the quote');
  await page.selectOption('select[name="mycountry"]', 'NL'); await page.selectOption('#clsel', { label: 'Atelier Mol · Ruben de Mol' }); await page.waitForTimeout(300);
  ok(await page.inputValue('select[name="vatmode"]') === 'reverse', label + ': vat follows the client (Belgian business → reverse charge)', await page.inputValue('select[name="vatmode"]'));
  const rates = await page.$$eval('#g-work .line', L => L.map(l => [l.querySelector('.d').value, l.querySelector('.r').value]));
  ok(rates.some(x => /shoot day/.test(x[0]) && x[1] === '850'), label + ': your day rate is on the shoot day line', rates);
  ok(await page.locator('#rtpick').isVisible(), label + ': "add from your rates" shows');
  const opts = await page.$$eval('#rtsel option', o => o.map(x => x.textContent));
  await page.selectOption('#rtsel', { index: opts.findIndex(t => /retouch/.test(t)) });
  ok(await page.$$eval('#g-work .line .d', L => L.some(l => l.value === 'retouch, per image')), label + ': a rate becomes a line', opts);
  await page.selectOption('#rtsel', { index: opts.findIndex(t => /travel/.test(t)) });
  ok(await page.$$eval('#g-exp .line', L => L.some(l => l.querySelector('.d').value === 'travel (km)' && l.querySelector('.r').value === '0.25')), label + ': km rate goes under expenses');
  // save a new client from the quote
  await page.selectOption('#clsel', '');
  await page.fill('input[name="client"]', 'Studio Noord'); await page.fill('input[name="contact"]', 'Lotte de Wit'); await page.fill('input[name="cemail"]', 'lotte@example.com');
  await page.click('#clsave'); await page.waitForTimeout(1200);
  ok(db(`select count(*) from clients where company='Studio Noord' and user_id='${A.id}'`) === '1', label + ': save as a client from the quote');
  await page.click('#clsave'); await page.waitForTimeout(1000);
  ok(db(`select count(*) from clients where company='Studio Noord'`) === '1' && /updated/.test(await page.textContent('#clmsg')), label + ': saving again updates, no double');
  ok(await overflow(page) <= 0, label + ': quote fits the screen');

  // fee calculator
  await page.evaluate(() => localStorage.removeItem('ff-feecalc'));
  await page.goto(BASE + '/feecalc.html'); await page.waitForTimeout(1800);
  ok(await page.inputValue('input[name="rate"]') === '850' && await page.locator('#fromrates').isVisible(), label + ': calculator starts from your day rate', await page.inputValue('input[name="rate"]'));
  await page.fill('input[name="rate"]', '900'); await page.reload(); await page.waitForTimeout(1800);
  ok(await page.inputValue('input[name="rate"]') === '900', label + ': your own typed rate wins');

  // Dutch
  const nl = await ctxFor(browser, A, dev, 'nl');
  await nl.page.goto(BASE + '/account.html'); await nl.page.waitForTimeout(1800);
  const txt = await nl.page.textContent('#rates') + await nl.page.textContent('#clients');
  ok(/Jouw tarieven\./.test(txt) && /Jouw klanten\./.test(txt) && /bewaar mijn tarieven/.test(txt), label + ': rates and clients in Dutch');
  await nl.ctx.close();

  // another member
  const o = await ctxFor(browser, Bu, dev);
  await o.page.goto(BASE + '/account.html'); await o.page.waitForTimeout(1500);
  ok(await o.page.locator('#cl-list .cl').count() === 0 && await o.page.inputValue('#rt-day') === '', label + ': Noor sees none of Sam\'s clients or rates');
  await o.page.goto(BASE + '/quote.html?new=quote&client=' + db(`select id from clients where company='Atelier Mol'`)); await o.page.waitForTimeout(1500);
  ok(await o.page.inputValue('input[name="client"]') === '' && await o.page.locator('#clpick').isHidden(), label + ': Noor cannot load Sam\'s client by link');
  const t = await o.page.evaluate(async (aid) => {
    const sb = ffDesk.sb, out = {};
    out.read = ((await sb.from('clients').select('*')).data || []).length;
    out.upd = ((await sb.from('clients').update({ company: 'x' }).neq('company', '').select('id')).data || []).length;
    out.ins = !!(await sb.from('clients').insert({ company: 'x', user_id: aid }).select('id')).error;
    out.rates = !!(await sb.from('rates').upsert({ user_id: aid, data: {} }, { onConflict: 'user_id' }).select('data')).error;
    out.rread = ((await sb.from('rates').select('*')).data || []).length;
    return out; }, A.id);
  ok(t.read === 0 && t.upd === 0 && t.ins && t.rates && t.rread === 0, label + ': Noor cannot read, change or plant Sam\'s clients or rates', t);
  ok(db(`select company from clients where company='Atelier Mol'`) === 'Atelier Mol', label + ': Sam\'s client is untouched');
  await o.ctx.close();

  // logged out
  const an = await ctxFor(browser, null, dev);
  await an.page.goto(BASE + '/feecalc.html'); await an.page.waitForTimeout(1200);
  ok(new URL(an.page.url()).pathname === '/', label + ': logged out is sent to the homepage', an.page.url());
  await an.page.goto(BASE + '/in.html'); await an.page.waitForTimeout(1200);
  const r = await an.page.evaluate(async () => { const a = await ffDesk.sb.from('clients').select('*'), b = await ffDesk.sb.from('rates').select('*'); return [a.error ? 'e' : (a.data || []).length, b.error ? 'e' : (b.data || []).length]; });
  ok(r.every(x => x === 'e' || x === 0), label + ': logged out gets nothing', r);
  await an.ctx.close();

  // delete
  await page.goto(BASE + '/account.html'); await page.waitForTimeout(1500);
  await page.locator('#cl-list .cl', { hasText: 'Studio Noord' }).locator('button', { hasText: 'delete' }).click(); await page.waitForTimeout(1000);
  ok(db(`select count(*) from clients where company='Studio Noord'`) === '0', label + ': delete a client');
  ok(page.__errors.length === 0, label + ': no page errors', page.__errors);
  await ctx.close();
}

(async () => {
  db("update public.site_access set everyone = true"); // these tests are about the desk, not about who may see the site (tests/site does that)
  const browser = await chromium.launch();
  await flow(browser, 'laptop', { viewport: { width: 1280, height: 860 } });
  await flow(browser, 'phone', { ...devices['iPhone 13'] });
  await browser.close();
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
