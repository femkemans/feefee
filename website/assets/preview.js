/* fee fee. preview: only the landing page (and privacy) are public for now.
   Every other page sends visitors back to the homepage, unless this browser is in preview mode.
   Turn preview on:  feefee.co/?preview=finetune   (stays on in this browser)
   Turn preview off: feefee.co/?preview=off
   In preview the full menu shows too. Links to hidden pages carry data-preview and only show in preview.
   Load this file first thing in <head>, without defer. */
(function(){
  var KEY='ff-preview', on=false;
  try{
    var q=new URLSearchParams(location.search).get('preview');
    if(q==='finetune') localStorage.setItem(KEY,'1');
    if(q==='off') localStorage.removeItem(KEY);
    on=localStorage.getItem(KEY)==='1';
  }catch(e){}
  var H=document.documentElement;
  if(on){ H.classList.add('ff-preview'); window.ffPreview=true; return; }
  var p=location.pathname.replace(/\/+$/,'/');
  var open=(p==='/'||p==='/index.html'||p==='/privacy.html');
  if(!open){
    H.style.display='none';
    location.replace('/');
    return;
  }
  var s=document.createElement('style');
  s.textContent='html:not(.ff-preview) [data-preview]{display:none!important}';
  (document.head||H).appendChild(s);
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
