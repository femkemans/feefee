/* fee fee. header: swap JOIN for YOUR DESK when someone is logged in.
   Only checks whether this site has a saved login; the page itself does the real check. */
(function(){
  var on=false;
  try{ on=!!localStorage.getItem('sb-eadxyfxlhwikesonpaer-auth-token'); }catch(e){}
  function apply(){
    document.querySelectorAll('.ffh [data-auth]').forEach(function(el){ el.hidden = el.getAttribute('data-auth') === (on ? 'out' : 'in'); });
  }
  window.ffNav = { set: function(v){ on = !!v; apply(); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();
