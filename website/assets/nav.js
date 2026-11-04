/* fee fee. header: swap JOIN for YOUR DESK when someone is logged in.
   Only checks whether this site has a saved login; the page itself does the real check. */
(function(){
  var on=false;
  try{ on=!!localStorage.getItem('sb-eadxyfxlhwikesonpaer-auth-token'); }catch(e){}
  /* while only the landing page is public, everyone outside preview sees the logged-out header */
  var pv=!!window.ffPreview; if(!pv) on=false;
  function apply(){
    document.documentElement.classList.toggle('ff-in', on);
    document.querySelectorAll('[data-auth]').forEach(function(el){ el.hidden = el.getAttribute('data-auth') === (on ? 'out' : 'in'); });
  }
  document.documentElement.classList.toggle('ff-in', on);
  window.ffNav = { set: function(v){ on = pv && !!v; apply(); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();

/* the full-site menu shows only in preview mode (see preview.js: ?preview=finetune on, ?preview=off off). */
(function(){
  if(!window.ffPreview) return;
  var s=document.createElement('script'); s.src='/assets/menu.js'; s.defer=true; document.head.appendChild(s);
})();
