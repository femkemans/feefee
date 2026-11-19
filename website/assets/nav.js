/* fee fee. header: swap JOIN for YOUR DESK when someone is logged in.
   Only checks whether this site has a saved login; the page itself does the real check. */
(function(){
  var has=false;
  try{ has=!!localStorage.getItem('sb-eadxyfxlhwikesonpaer-auth-token'); }catch(e){}
  /* while only the landing page is public, everyone the site isn't open for sees the logged-out header */
  var pv=!!window.ffPreview, on=pv&&has;
  function apply(){
    document.documentElement.classList.toggle('ff-in', on);
    document.querySelectorAll('[data-auth]').forEach(function(el){ el.hidden = el.getAttribute('data-auth') === (on ? 'out' : 'in'); });
  }
  document.documentElement.classList.toggle('ff-in', on);
  window.ffNav = {
    set: function(v){ on = pv && !!v; apply(); },
    /* preview.js calls this once the database said yes (first page of a visit) */
    preview: function(){ if(pv) return; pv=true; on=has; apply(); ffLoadMenu(); }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();

/* the full-site menu shows only for people the site is open for (see preview.js). */
function ffLoadMenu(){
  if(!window.ffPreview||window.ffMenuLoaded) return; window.ffMenuLoaded=true;
  var s=document.createElement('script'); s.src='/assets/menu.js'; s.defer=true; document.head.appendChild(s);
}
ffLoadMenu();
