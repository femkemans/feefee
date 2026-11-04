/* fee fee. members gate for the tools (quote, share your fee).
   The page adds class "ffg" to <html> in its head, which hides everything but the header.
   Logged in: the page shows. Logged out: a calm login card. Needs supabase.js + desk.js. */
(function(){
  var H=document.documentElement, D=window.ffDesk;
  var css=document.createElement('style');
  css.textContent="html.ffg body>*:not(.ffh):not(#ffgate):not(script){display:none!important}"+
  "#ffgate{max-width:620px;margin:0 auto;padding:clamp(60px,12vh,140px) 24px 120px}"+
  "#ffgate h1{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:400;font-size:clamp(48px,7vw,88px);line-height:.95;letter-spacing:-.02em;margin:0 0 22px}"+
  "#ffgate p{font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;line-height:1.6;margin:0 0 30px;max-width:30em}"+
  "#ffgate form{display:flex;gap:8px;flex-wrap:wrap}"+
  "#ffgate input{flex:1;min-width:220px;height:52px;padding:0 22px;border:0;border-radius:999px;background:#EEF3EF;font:14px 'Space Mono',monospace;color:#1C1E1A}"+
  "#ffgate input:focus{outline:2px solid #1F3FD1;outline-offset:2px}"+
  "#ffgate button{height:52px;padding:0 26px;border:0;border-radius:999px;background:#1C1E1A;color:#FDFCF9;font:13px 'Space Mono',monospace;cursor:pointer}"+
  "#ffgate button:disabled{opacity:.45;cursor:default}"+
  "#ffgate .msg{font:12px/1.7 'Space Mono',monospace;color:#4A4E46;margin:14px 0 0;min-height:1.7em}"+
  "#ffgate .alt{font:12px/1.7 'Space Mono',monospace;color:#4A4E46;margin:26px 0 0}"+
  "#ffgate .alt a{color:#1C1E1A}";
  document.head.appendChild(css);
  function open(){ H.classList.remove('ffg'); var g=document.getElementById('ffgate'); if(g) g.remove(); }
  function gate(){
    var g=document.createElement('section'); g.id='ffgate';
    var h=document.createElement('h1'); h.textContent=H.getAttribute('data-gate-title')||'Log in first.';
    var p=document.createElement('p'); p.textContent=(H.getAttribute('data-gate-text')||'')+' log in with your email: we send you a link, no password. free while we’re starting.';
    var f=document.createElement('form'), i=document.createElement('input'), b=document.createElement('button'), m=document.createElement('p');
    i.type='email'; i.required=true; i.autocomplete='email'; i.placeholder='you@studio.com'; i.setAttribute('aria-label','email');
    b.textContent='send me a link'; m.className='msg'; m.setAttribute('role','status');
    f.appendChild(i); f.appendChild(b);
    f.onsubmit=function(e){ e.preventDefault(); D.sendLink(i.value.trim(), location.href.split('#')[0], b, m); };
    var a=document.createElement('p'); a.className='alt'; a.innerHTML='not on the list yet? <a href="index.html#join">join the waitlist</a>';
    g.appendChild(h); g.appendChild(p); g.appendChild(f); g.appendChild(m); g.appendChild(a);
    var hd=document.querySelector('.ffh'); if(hd&&hd.nextSibling) hd.parentNode.insertBefore(g,hd.nextSibling); else document.body.appendChild(g);
  }
  if(!D){ open(); return; }
  D.user().then(function(u){ if(window.ffNav) ffNav.set(!!u); if(u) open(); else gate(); }, open);
  D.sb.auth.onAuthStateChange(function(ev,s){ if(s&&s.user){ if(window.ffNav) ffNav.set(true); open(); } });
})();
