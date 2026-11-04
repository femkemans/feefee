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
