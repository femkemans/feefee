/* fee fee. header: swap JOIN for YOUR DESK when someone is logged in.
   Only checks whether this site has a saved login; the page itself does the real check. */
(function(){
  var on=false;
  try{ on=!!localStorage.getItem('sb-eadxyfxlhwikesonpaer-auth-token'); }catch(e){}
  function apply(){
    document.documentElement.classList.toggle('ff-in', on);
    document.querySelectorAll('[data-auth]').forEach(function(el){ el.hidden = el.getAttribute('data-auth') === (on ? 'out' : 'in'); });
  }
  document.documentElement.classList.toggle('ff-in', on);
  window.ffNav = { set: function(v){ on = !!v; apply(); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();

/* the full-site menu stays hidden until it's ready. ?menu=1 turns it on in this browser, ?menu=0 turns it off. */
(function(){
  var on=false;
  try{
    var q=new URLSearchParams(location.search).get('menu');
    if(q==='1') localStorage.setItem('ff-menu','1');
    if(q==='0') localStorage.removeItem('ff-menu');
    on=localStorage.getItem('ff-menu')==='1';
  }catch(e){}
  if(!on) return;
  var s=document.createElement('script'); s.src='/assets/menu.js'; s.defer=true; document.head.appendChild(s);
})();
