// Minimal Supabase stand-in for tests: /rest/v1 → real local Postgres (RLS + triggers run as role "authenticated"),
// /auth/v1 → fake users. Only the query shapes the site uses.
const { execFileSync } = require('child_process');
const PSQL = ['-h', process.env.PGHOST || '/var/tmp/pgff', '-p', process.env.PGPORT || '5544', '-U', 'postgres', '-d', process.env.PGDB || 'e2e', '-qAt', '-v', 'ON_ERROR_STOP=1'];
const lit = v => "'" + String(v).replace(/'/g, "''") + "'";
const ident = v => { if (!/^[a-z_][a-z0-9_]*$/.test(v)) throw new Error('bad ident ' + v); return v; };
const META = {};

function b64(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function token(uid, email) { return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ sub: uid, email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 36000 }) + '.x'; }
function userOf(uid, email) { return { id: uid, aud: 'authenticated', role: 'authenticated', email, user_metadata: META[uid] || {}, app_metadata: {}, created_at: new Date().toISOString() }; }
function session(uid, email) { return { access_token: token(uid, email), refresh_token: 'r', token_type: 'bearer', expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, user: userOf(uid, email) }; }
function emailFrom(h) { const a = (h['authorization'] || '').replace(/^Bearer /, ''); try { return JSON.parse(Buffer.from(a.split('.')[1], 'base64url')).email || ''; } catch (e) { return ''; } }
function uidFrom(h) { const a = (h['authorization'] || '').replace(/^Bearer /, ''); try { const p = JSON.parse(Buffer.from(a.split('.')[1], 'base64url')); return p.sub || null; } catch (e) { return null; } }

function run(uid, sql, email) {
  const claims = JSON.stringify({ sub: uid, email: email || '' });
  const pre = uid ? `set local role authenticated; select set_config('request.jwt.claim.sub', ${lit(uid)}, true), set_config('request.jwt.claims', ${lit(claims)}, true);` : 'set local role anon;';
  const out = execFileSync('psql', [...PSQL, '-c', 'begin;', '-c', pre, '-c', sql, '-c', 'commit;'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const lines = out.trim().split('\n').filter(l => l && l !== uid && l !== 'BEGIN' && l !== 'COMMIT');
  return lines[lines.length - 1];
}

function where(params) {
  const w = [];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const m = /^(eq|neq)\.(.*)$/s.exec(v); if (!m) continue;
    w.push(`${ident(k)} ${m[1] === 'eq' ? '=' : '<>'} ${lit(m[2])}`);
  }
  return w.length ? ' where ' + w.join(' and ') : '';
}
function cols(sel) { if (!sel || sel === '*') return '*'; return sel.split(',').map(c => ident(c.trim())).join(','); }

async function handleRest(route, req, url) {
  const h = req.headers(), uid = uidFrom(h), table = ident(url.pathname.split('/').pop()), p = url.searchParams;
  const single = /vnd\.pgrst\.object/.test(h['accept'] || '');
  const sel = cols(p.get('select')), method = req.method();
  let sql;
  if (url.pathname.endsWith('/rpc/can_preview')) {
    // the real check from supabase/site.sql (who may see the whole site)
    try { const r = run(uid, 'select public.can_preview()::text', emailFrom(h)); return route.fulfill({ status: 200, contentType: 'application/json', body: r === 'true' ? 'true' : 'false' }); }
    catch (e) { return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function public.can_preview' }) }); }
  }
  if (url.pathname.includes('/rpc/')) return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  if (method === 'GET' || method === 'HEAD') {
    let order = ''; if (p.get('order')) { const [c, d] = p.get('order').split('.'); order = ` order by ${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }
    sql = `select coalesce(json_agg(t),'[]')::jsonb::text from (select ${sel} from public.${table}${where(p)}${order}${p.get('limit') ? ' limit ' + (+p.get('limit')) : ''}) t`;
  } else {
    let body = JSON.parse(req.postData() || '{}'); if (Array.isArray(body)) body = body[0];
    const keys = Object.keys(body).map(ident), J = lit(JSON.stringify(body));
    const src = `(select ${keys.join(',')} from json_populate_record(null::public.${table}, ${J}::json))`;
    const ret = /return=minimal/.test(h['prefer'] || '') && !p.get('select') ? '' : ` returning ${sel}`;
    if (method === 'POST') {
      const up = /merge-duplicates/.test(h['prefer'] || '');
      const conflict = p.get('on_conflict') || 'user_id';
      sql = `insert into public.${table} (${keys.join(',')}) select * from ${src} s` + (up ? ` on conflict (${ident(conflict)}) do update set ${keys.map(k => `${k}=excluded.${k}`).join(',')}` : '') + ret;
    } else if (method === 'PATCH') sql = `update public.${table} set (${keys.join(',')}) = ${keys.length === 1 ? '(select ' + keys[0] + ' from json_populate_record(null::public.' + table + ', ' + J + '::json))' : src}${where(p)}${ret}`;
    else if (method === 'DELETE') sql = `delete from public.${table}${where(p)}${ret || ' returning 1'}`;
    sql = `with r as (${sql}) select coalesce(json_agg(r),'[]')::jsonb::text from r`;
  }
  try {
    const rows = JSON.parse(run(uid, sql) || '[]');
    if (single) { if (rows.length !== 1) return route.fulfill({ status: 406, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }) }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows[0]) }); }
    return route.fulfill({ status: method === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify(rows) });
  } catch (e) {
    const msg = ((e.stderr || e.message || '') + '').split('\n').find(l => /ERROR:/.test(l)) || String(e.message);
    const clean = msg.replace(/^.*ERROR:\s*/, '');
    const status = /does not exist/.test(clean) ? 404 : /permission denied|row-level/.test(clean) ? 403 : 400;
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: clean }) });
  }
}

async function handleAuth(route, req, url, who) {
  const m = req.method(), path = url.pathname.replace('/auth/v1', '');
  const uid = uidFrom(req.headers());
  if (path === '/user' && m === 'GET') { if (!uid) return route.fulfill({ status: 401, body: '{}' }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userOf(uid, who[uid])) }); }
  if (path === '/user' && m === 'PUT') { const b = JSON.parse(req.postData() || '{}'); META[uid] = Object.assign({}, META[uid], b.data || {}); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userOf(uid, who[uid])) }); }
  if (path.startsWith('/logout')) return route.fulfill({ status: 204, body: '' });
  if (path.startsWith('/otp')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
}

module.exports = { handleRest, handleAuth, session, run, META };
