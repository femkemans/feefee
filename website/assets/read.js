/* fee fee. "the short version": put <nav class="glance" data-glance></nav> on a guide page
   and this lists every section title (.s h2) as one tappable line, so a quick reader gets the
   whole guide in ten seconds and can jump to the part they need. */
(function(){
  var box=document.querySelector('[data-glance]'); if(!box) return;
  var secs=document.querySelectorAll('section.s'); if(secs.length<2) return;
  var label=box.getAttribute('data-glance')||'the short version';
  var html='<p class="glance-k">'+label+'</p><ol>';
  secs.forEach(function(s,i){
    var h=s.querySelector('h2'); if(!h) return;
    var n=(s.querySelector('.n')||{}).textContent||String(i+1).padStart(2,'0');
    if(!s.id) s.id='s'+(i+1);
    html+='<li><a href="#'+s.id+'"><span class="gn">'+n+'</span><span class="gt">'+h.textContent+'</span><span class="ga" aria-hidden="true">↓</span></a></li>';
  });
  box.innerHTML=html+'</ol>';
  box.setAttribute('aria-label',label);
})();
