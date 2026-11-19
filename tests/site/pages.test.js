// Browser test for website/assets/preview.js: who sees which page.
// Runs against the "gate" database (tests/site/setup.sh) through the same Supabase stand-in as the desk tests.
// Serve the site first: cd website && python3 -m http.server 8099. Then: PGDB=gate node tests/site/pages.test.js
process.env.PGDB = process.env.PGDB || 'gate';
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const B = require('../desk/backend');
const BASE = 'http://localhost:8099';
const SB = 'https://eadxyfxlhwikesonpaer.supabase.co';
const FEMKE = { id: '33333333-3333-3333-3333-333333333333', email: 'hello@feefee.co' };   // admin (stand-in)
const MEMBER = { id: '11111111-1111-1111-1111-111111111111', email: 'sam@example.com' };
const FOUNDER = { id: '44444444-4444-4444-4444-444444444444', email: 'founder@example.com' };
const WHO = { [FEMKE.id]: FEMKE.email, [MEMBER.id]: MEMBER.email, [FOUNDER.id]: FOUNDER.email };
const { execFileSync } = require('child_process');
const db = s => execFileSync('psql', ['-h', process.env.PGHOST || '/var/tmp/pgff', '-p', process.env.PGPORT || '5544', '-U', 'postgres', '-d', process.env.PGDB, '-qAt', '-c', s], { encoding: 'utf8' }).trim();
let passes = 0, fails = 0;
function ok(c, name, extra) { if (c) { passes++; console.log('PASS', name); } else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

const OPEN = ['/index.html', '/privacy.html', '/in.html'];
const SKIP = ['/manifesto.html']; // only forwards to index.html#manifesto
const LOCKED = fs.readdirSync(path.join(__dirname, '../../website')).filter(f => f.endsWith('.html')).map(f => '/' + f).filter(p => !OPEN.includes(p) && !SKIP.includes(p));

async function ctxFor(browser, user, opts = {}, init = {}) {
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
  await ctx.addInitScript(([s, init]) => {
    try {
      if (s && !localStorage.getItem('ff-test-set')) { localStorage.setItem('sb-eadxyfxlhwikesonpaer-auth-token', JSON.stringify(s)); localStorage.setItem('ff-test-set', '1'); }
      for (const k in (init.local || {})) localStorage.setItem(k, init.local[k]);
      for (const k in (init.session || {})) if (!sessionStorage.getItem('ff-test-' + k)) { sessionStorage.setItem(k, init.session[k]); sessionStorage.setItem('ff-test-' + k, '1'); }
    } catch (e) { }
  }, [user ? B.session(user.id, user.email) : null, init]);
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(e.message));
  return { ctx, page };
}
const where = p => new URL(p.url()).pathname;

async function sweep(browser, label, user, expectOpen, dev) {
  const { ctx, page } = await ctxFor(browser, user, dev);
  const bad = [];
  for (const p of LOCKED) {
    await page.goto(BASE + p); await page.waitForTimeout(p === LOCKED[0] ? 2500 : 900);
    const at = where(page), shown = await page.evaluate(() => getComputedStyle(document.documentElement).display !== 'none' && document.documentElement.classList.contains('ff-preview'));
    if (expectOpen ? (at !== p || !shown) : (at !== '/')) bad.push(p + ' → ' + at);
  }
  ok(bad.length === 0, `${label}: ${expectOpen ? 'sees' : 'is sent home from'} all ${LOCKED.length} closed pages`, bad);
  await page.goto(BASE + '/'); await page.waitForTimeout(1500);
  const desk = await page.locator('.hero-desk').isVisible().catch(() => false);
  const menu = await page.evaluate(() => !!window.ffMenuLoaded);
  ok(desk === expectOpen && menu === expectOpen, `${label}: homepage ${expectOpen ? 'shows' : 'hides'} "your desk" and the full menu`, { desk, menu });
  for (const p of OPEN) { await page.goto(BASE + p); await page.waitForTimeout(700); ok(where(page) === p, `${label}: ${p} stays public`, where(page)); }
  ok(page.__errors.length === 0, `${label}: no page errors`, page.__errors);
  await ctx.close();
}

async function noFlash(browser, label, user) {
  // the closed page's text must never be painted for someone who may not see it
  const { ctx, page } = await ctxFor(browser, user);
  const painted = [];
  await page.exposeFunction('__seen', t => painted.push(t));
  await page.addInitScript(() => {
    new MutationObserver(() => { }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      const vis = getComputedStyle(document.documentElement).display !== 'none';
      if (vis && location.pathname !== '/' && location.pathname !== '/index.html') window.__seen(location.pathname);
    });
  });
  for (const p of ['/quote.html', '/questions.html', '/admin.html', '/usage.html']) { await page.goto(BASE + p); await page.waitForTimeout(1200); }
  ok(painted.length === 0, `${label}: closed pages are never shown, not even for a moment`, painted);
  await ctx.close();
}

(async () => {
  db("update public.site_access set founders=false, everyone=false; update public.founders set user_id=null;");
  const browser = await chromium.launch();
  const laptop = { viewport: { width: 1280, height: 860 } };

  console.log('\n=== site closed: only femke');
  await sweep(browser, 'logged out', null, false, laptop);
  await sweep(browser, 'member (not femke)', MEMBER, false, laptop);
  await sweep(browser, 'founder before 4 dec', FOUNDER, false, laptop);
  await sweep(browser, 'femke', FEMKE, true, laptop);
  await sweep(browser, 'femke on a phone', FEMKE, true, { ...devices['iPhone 13'] });
  await noFlash(browser, 'logged out', null);
  await noFlash(browser, 'member', MEMBER);

  // the old shared link opens nothing any more
  { const { ctx, page } = await ctxFor(browser, null, laptop, { local: { 'ff-preview': '1' } });
    await page.goto(BASE + '/?preview=finetune'); await page.waitForTimeout(800);
    await page.goto(BASE + '/quote.html?preview=finetune'); await page.waitForTimeout(1200);
    ok(where(page) === '/', 'old link ?preview=finetune (and the old browser setting) opens nothing', where(page));
    await ctx.close(); }

  // a member who fakes the "already checked" note in their browser is still sent home
  { const { ctx, page } = await ctxFor(browser, MEMBER, laptop, { session: { 'ff-pv': MEMBER.id } });
    await page.goto(BASE + '/questions.html'); await page.waitForTimeout(2500);
    ok(where(page) === '/', 'member faking the browser note is still sent home', where(page));
    await ctx.close(); }

  // a fake login (made-up token) is sent home: the database does not know it
  { const fake = B.session('99999999-9999-9999-9999-999999999999', 'fake@example.com');
    const { ctx, page } = await ctxFor(browser, null, laptop, { local: { 'sb-eadxyfxlhwikesonpaer-auth-token': JSON.stringify(fake) } });
    await page.goto(BASE + '/account.html'); await page.waitForTimeout(2500);
    ok(where(page) === '/', 'made-up login is sent home', where(page));
    await ctx.close(); }

  // femke clicks the login link in her email: lands on her desk
  { const s = B.session(FEMKE.id, FEMKE.email);
    const { ctx, page } = await ctxFor(browser, null, laptop);
    await page.goto(BASE + `/account.html#access_token=${s.access_token}&refresh_token=r&expires_in=36000&expires_at=${s.expires_at}&token_type=bearer&type=magiclink`);
    await page.waitForTimeout(3000);
    ok(where(page) === '/account.html', 'femke: the login link from the email opens her desk', where(page));
    await page.goto(BASE + '/in.html'); await page.waitForTimeout(1500);
    ok(await page.locator('#yes').isVisible(), 'femke: login page says welcome back');
    await ctx.close(); }

  // a member who logs in on in.html gets a warm "you're on the list", in Dutch too
  { const { ctx, page } = await ctxFor(browser, MEMBER, laptop, { local: { 'ff-lang': 'nl' } });
    await page.goto(BASE + '/in.html'); await page.waitForTimeout(10000);
    ok(await page.locator('#wait').isVisible(), 'member: login page says you are on the list');
    ok((await page.locator('#wait h1').innerText()).trim() === 'Je staat op de lijst.', 'member: in Dutch too', await page.locator('#wait h1').innerText());
    await ctx.close(); }

  // the login page only sends links to existing accounts and says the same thing either way
  { const { ctx, page } = await ctxFor(browser, null, laptop);
    let body = null;
    page.on('request', r => { if (r.url().includes('/auth/v1/otp')) body = JSON.parse(r.postData() || '{}'); });
    await page.goto(BASE + '/in.html'); await page.waitForTimeout(800);
    await page.fill('#e', 'someone@example.com'); await page.click('#b'); await page.waitForTimeout(1000);
    ok(body && body.create_user === false, 'login page never makes a new account', body);
    ok(/if this email has a fee fee\. login/.test(await page.locator('#m').innerText()), 'login page gives the same answer for every email');
    await ctx.close(); }

  console.log('\n=== founders in (update public.site_access set founders = true)');
  db("update public.site_access set founders=true;");
  await sweep(browser, 'founder', FOUNDER, true, laptop);
  await sweep(browser, 'member (not a founder)', MEMBER, false, laptop);
  db("update public.site_access set founders=false, everyone=false;");

  await browser.close();
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
