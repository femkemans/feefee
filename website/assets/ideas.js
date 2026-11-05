/* fee fee. idea box: "missing something?"
   Put <div data-ideas></div> where it should show, then load this file (defer).
   Ideas go to the Supabase table public.ideas (insert only, see supabase/ideas.sql).
   Nobody can read them from the site; femke reads them in Supabase → Table editor → ideas.
   If the table isn't there yet, the idea opens as an email to hello@feefee.co instead. */
(function(){
  var URL_ = 'https://eadxyfxlhwikesonpaer.supabase.co';
  var KEY_ = 'sb_publishable_HzD6stLtpaG0-uJiq5S8eA_9bVi78ri'; /* public key: can only add an idea, never read one */

  var css = ''
  + '[data-ideas]{width:100%;max-width:640px}'
  + '.ffi{margin:0 auto;padding:40px 0 8px;border-top:1px solid #1C1E1A;text-align:left;color:#1C1E1A}'
  + '.ffi h2{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:500;font-size:clamp(36px,4vw,52px);line-height:1;margin:0 0 14px;letter-spacing:-.01em}'
  + '.ffi p.l{font-family:"Cormorant Garamond",Georgia,serif;font-size:20px;line-height:1.6;margin:0 0 24px;max-width:32em}'
  + '.ffi label{display:block;margin:0 0 14px}'
  + '.ffi label span{display:block;font:12px "Space Mono",monospace;color:#4A4E46;margin:0 0 5px}'
  + '.ffi textarea,.ffi input{display:block;width:100%;box-sizing:border-box;font:15px/1.6 "Space Mono",monospace;color:#1C1E1A;background:#FDFCF9;border:1px solid #1C1E1A;border-radius:0;padding:11px 12px;outline:none}'
  + '.ffi input{height:46px}'
  + '.ffi textarea{min-height:120px;resize:vertical}'
  + '.ffi textarea:focus,.ffi input:focus{box-shadow:0 0 0 2px #1F3FD1}'
  + '.ffi .g{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}'
  + '.ffi .r{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:6px}'
  + '.ffi button{display:inline-flex;align-items:center;height:50px;padding:0 26px;border:0;background:#1C1E1A;color:#FDFCF9;font:700 12px "Space Mono",monospace;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}'
  + '.ffi button:disabled{opacity:.45;cursor:default}'
  + '.ffi .m{font:12px/1.6 "Space Mono",monospace;color:#4A4E46}'
  + '.ffi .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}'
  + '.ffi .done{font-family:"Nothing You Could Do","Reenie Beanie",cursive;color:#2A45C9;font-size:28px;margin:8px 0 0}'
  + '@media (max-width:640px){.ffi .g{grid-template-columns:1fr}.ffi{padding-top:32px}}';

  function el(t, c, txt){ var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function field(label, node){ var l = el('label'); l.appendChild(el('span', null, label)); l.appendChild(node); return l; }

  function build(box){
    var me = (window.ffMe && window.ffMe()) || {};
    var f = el('form', 'ffi'); f.noValidate = true;
    f.appendChild(el('h2', null, box.getAttribute('data-title') || 'Missing something?'));
    f.appendChild(el('p', 'l', box.getAttribute('data-lead') || 'tell us what you wish fee fee. could do for you. a template, a tool, a question nobody answers. if you need it, you’re probably not the only one.'));
    var ta = el('textarea'); ta.name = 'body'; ta.maxLength = 1000; ta.required = true;
    ta.placeholder = 'e.g. a way to ask for the shopping budget before the shoot';
    f.appendChild(field('your idea', ta));
    var g = el('div', 'g');
    var role = el('input'); role.name = 'role'; role.maxLength = 60; role.placeholder = 'e.g. stylist'; role.value = me.role || '';
    var em = el('input'); em.name = 'email'; em.type = 'email'; em.maxLength = 160; em.placeholder = 'only if you’d like a reply'; em.value = me.email || '';
    g.appendChild(field('what you do (optional)', role));
    g.appendChild(field('your email (optional)', em));
    f.appendChild(g);
    var hp = el('input', 'hp'); hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true'); f.appendChild(hp);
    var r = el('div', 'r'), b = el('button', null, 'send'), m = el('span', 'm'); m.setAttribute('role', 'status');
    b.type = 'submit'; r.appendChild(b); r.appendChild(m); f.appendChild(r);

    f.addEventListener('submit', function(e){
      e.preventDefault();
      var body = ta.value.trim();
      if (body.length < 3){ m.textContent = 'write a few words first.'; ta.focus(); return; }
      if (hp.value) return;
      var row = { body: body.slice(0, 1000), role: role.value.trim().slice(0, 60) || null, email: em.value.trim().slice(0, 160) || null, page: location.pathname.slice(0, 120) };
      b.disabled = true; m.textContent = 'sending…';
      fetch(URL_ + '/rest/v1/ideas', { method: 'POST', headers: { apikey: KEY_, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) })
        .then(function(res){ if (!res.ok) throw new Error(res.status); thanks(); })
        .catch(function(){
          /* table not there yet, or offline: hand it over as an email */
          b.disabled = false; m.textContent = '';
          location.href = 'mailto:hello@feefee.co?subject=' + encodeURIComponent('an idea for fee fee.') + '&body=' + encodeURIComponent(body + (row.role ? '\n\n– ' + row.role : ''));
        });
    });
    function thanks(){
      f.innerHTML = '';
      f.appendChild(el('h2', null, 'Thank you.'));
      f.appendChild(el('p', 'l', 'femke reads every idea. the ones many people ask for get built first.'));
      f.appendChild(el('p', 'done', 'noted.'));
    }
    box.appendChild(f);
  }

  function start(){
    var boxes = document.querySelectorAll('[data-ideas]'); if (!boxes.length) return;
    var st = el('style'); st.textContent = css; document.head.appendChild(st);
    Array.prototype.forEach.call(boxes, build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
