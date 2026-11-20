/* fee fee. who sees what: only the landing page and privacy (and the login page) are public for now.
   Every other page is only for people the database lets in: today femke (admins), later founders or everyone.
   The rule lives in Supabase (supabase/site.sql, can_preview()), so the database also refuses the data
   to anyone else. This file only keeps the pages themselves out of sight.
   Log in: feefee.co/in.html (not linked anywhere). Log out: on your desk.
   Open a page for everyone: add its path to OPEN below and drop data-preview on its links.
   Load this file first thing in <head>, without defer. */
(function(){
  var H=document.documentElement, W=window;
  var SB='https://eadxyfxlhwikesonpaer.supabase.co', TOKEN='sb-eadxyfxlhwikesonpaer-auth-token', OK='ff-pv';
  var OPEN={'/':1,'/index.html':1,'/privacy.html':1,'/in.html':1};
  var p=location.pathname.replace(/\/+$/,'/'), open=!!OPEN[p];
  function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function ss(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); if(v===null) sessionStorage.removeItem(k); else sessionStorage.setItem(k,v); }catch(e){} return null; }
  try{ localStorage.removeItem('ff-preview'); }catch(e){} /* the old shared preview link no longer opens anything */

  var css=document.createElement('style');
  css.textContent='html:not(.ff-preview) [data-preview]{display:none!important}';
  (document.head||H).appendChild(css);

  /* who is logged in in this browser (only a hint; the database decides) */
  var uid=null;
  try{ var t=JSON.parse(ls(TOKEN)||'null'); uid=t&&t.user&&t.user.id||null; }catch(e){}
  var fromLink=/[#&](access_token|refresh_token)=/.test(location.hash)||/[#&?]error_description=/.test(location.href);

  function home(){ ss(OK,null); H.style.display='none'; location.replace(fromLink?'/in.html':'/'); }
  function show(){ H.style.display=''; }
  function grant(){
    if(W.ffPreview) return;
    W.ffPreview=true; H.classList.add('ff-preview'); show();
    if(W.ffNav&&W.ffNav.preview) W.ffNav.preview();
  }
  function deny(){
    ss(OK,null);
    if(!open) return home();
    if(W.ffPreview){ W.ffPreview=false; H.classList.remove('ff-preview'); location.reload(); }
  }

  if(!uid&&!fromLink){
    W.ffPreview=false;
    if(!open){ H.style.display='none'; location.replace('/'); }
    return;
  }
  /* seen before in this tab session: show right away, check again in the background */
  if(uid&&ss(OK)===uid){ W.ffPreview=true; H.classList.add('ff-preview'); }
  else { W.ffPreview=false; if(!open) H.style.display='none'; }

  var done=false;
  setTimeout(function(){ if(!done&&!W.ffPreview&&!open) home(); },10000);

  function load(src,cb){ var s=document.createElement('script'); s.src=src; s.onload=cb; s.onerror=function(){ done=true; deny(); }; document.head.appendChild(s); }
  function desk(cb){
    if(W.ffDesk) return cb(W.ffDesk);
    function d(){ if(W.ffDesk) cb(W.ffDesk); else load('/assets/desk.js',function(){ cb(W.ffDesk); }); }
    if(W.supabase) d(); else load('/assets/supabase.js',d);
  }
  function check(){
    desk(function(D){
      if(!D){ done=true; return deny(); }
      D.sb.auth.getSession().then(function(r){
        var s=r&&r.data&&r.data.session;
        if(!s){ done=true; return deny(); }
        return D.sb.rpc('can_preview').then(function(x){
          /* before supabase/site.sql has run: fall back to "is this an admin" */
          if(x.error&&(x.error.code==='PGRST202'||/could not find|does not exist/i.test(x.error.message||''))) return D.sb.rpc('is_admin');
          return x;
        }).then(function(x){
          done=true;
          if(x&&!x.error&&x.data===true){ ss(OK,s.user.id); grant(); }
          else deny();
        });
      }).catch(function(){ done=true; deny(); });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',check); else check();
})();

/* NL / EN: load the language switch (assets/i18n.js) on every page.
   When Dutch is chosen, load the dictionary straight away and keep the page hidden for a moment so it doesn't flash English. */
(function(){
  var H=document.documentElement, l='en';
  try{
    var q=new URLSearchParams(location.search).get('lang');
    if(q==='nl'||q==='en') localStorage.setItem('ff-lang',q);
    l=localStorage.getItem('ff-lang')==='nl'?'nl':'en';
  }catch(e){}
  H.lang=l;
  function js(src,attr){ var s=document.createElement('script'); s.src=src; s.async=false; if(attr) s.setAttribute(attr,''); (document.head||H).appendChild(s); }
  if(l==='nl'){
    H.classList.add('ff-nl-wait');
    var st=document.createElement('style'); st.textContent='html.ff-nl-wait body{visibility:hidden}'; (document.head||H).appendChild(st);
    setTimeout(function(){ H.classList.remove('ff-nl-wait'); },2500);
    js('/assets/nl.js?v=1','data-ff-nl');
  }
  js('/assets/i18n.js?v=1');
})();

/* founded by: a quiet credit line at the bottom of every page, linking to femke's own site.
   A page can place its own <p class="ff-credit"> (the homepage does, so it's in the html for search engines);
   otherwise it's added at the end of the page. Pages with data-no-credit on <body> skip it (member link pages).
   Dutch: "founded by" in assets/nl.js. Who founded fee fee. for search engines: the JSON-LD in each page's <head>. */
(function(){
  var css=document.createElement('style');
  css.textContent='.ff-credit{margin:0;padding:12px 16px 32px;text-align:center;font-family:"Space Mono",ui-monospace,monospace;font-size:11px;line-height:1.6;letter-spacing:.08em;color:#4A4E46}'+
    '.ff-credit a{color:inherit;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:1px}'+
    '.ff-credit a:hover{color:#1F3FD1}'+
    '@media print{.ff-credit{display:none!important}}';
  (document.head||document.documentElement).appendChild(css);
  function add(){
    var b=document.body;
    if(!b||b.hasAttribute('data-no-credit')||document.querySelector('.ff-credit')) return;
    var p=document.createElement('p'); p.className='ff-credit';
    p.innerHTML='<span>founded by</span> <a href="https://femkejuffermans.com" rel="author" translate="no">Femke Juffermans</a>';
    b.appendChild(p);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',add); else add();
})();
