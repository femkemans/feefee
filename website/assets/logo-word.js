/* fee fee. — every "fee fee." on the page is set in the logo font (DM Sans ExtraBold Italic) */
(function(){
  var RE=/fee fee\./g, SKIP={SCRIPT:1,STYLE:1,TITLE:1,TEXTAREA:1,INPUT:1,OPTION:1,NOSCRIPT:1};
  function skip(n){ for(var e=n.parentNode;e&&e.nodeType===1;e=e.parentNode){ if(SKIP[e.tagName]||(e.classList&&e.classList.contains('logo-word'))) return true; } return false; }
  function wrap(root){
    if(!root) return;
    if(root.nodeType===3){ fix(root); return; }
    if(root.nodeType!==1||SKIP[root.tagName]) return;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null), list=[], n;
    while((n=w.nextNode())) if(n.nodeValue.indexOf('fee fee.')>-1) list.push(n);
    list.forEach(fix);
  }
  function fix(t){
    if(t.nodeValue.indexOf('fee fee.')<0||skip(t)) return;
    var parts=t.nodeValue.split(RE), f=document.createDocumentFragment();
    parts.forEach(function(p,i){ if(p) f.appendChild(document.createTextNode(p)); if(i<parts.length-1){ var s=document.createElement('span'); s.className='logo-word'; s.textContent='fee fee.'; f.appendChild(s); } });
    t.parentNode.replaceChild(f,t);
  }
  function start(){
    wrap(document.body);
    new MutationObserver(function(ms){ ms.forEach(function(m){ if(m.type==='characterData') fix(m.target); else m.addedNodes.forEach(wrap); }); })
      .observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
