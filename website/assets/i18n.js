/* fee fee. NL / EN switch for the whole site.
   preview.js loads this file on every page (and assets/nl.js when Dutch is on).
   The pages stay written in English. Dutch lives in assets/nl.js as one dictionary:
   key = the English text (whitespace collapsed), value = the Dutch text.
   A key can also be a short piece of HTML (a sentence with <em> or <a> inside), so word order stays right.
   Numbers: a key with {n} matches any number, e.g. "{n} fees shared" -> "{n} fees gedeeld".
   Never translated: anything inside [translate="no"] or [data-i18n-skip] (what members typed, the pdf preview).
   Choice is kept in localStorage 'ff-lang'. ?lang=nl or ?lang=en in a link switches too.
   Missing words: open any page with ?i18n=collect, then run ffI18n.missing() in the console. */
(function(){
  var KEY='ff-lang', H=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY)==='nl'?'nl':'en'; }catch(e){ return 'en'; } }
  var lang=get(), dict=null, mo=null, busy=false, log=[], miss={};
  var collect=/[?&]i18n=collect/.test(location.search);

  var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,CODE:1,PRE:1,svg:1,SVG:1,TEMPLATE:1,IFRAME:1,CANVAS:1};
  var INLINE={A:1,B:1,STRONG:1,EM:1,I:1,MARK:1,SPAN:1,BR:1,SMALL:1,U:1,SUP:1,SUB:1,ABBR:1,S:1};
  var ATTRS=['placeholder','aria-label','title','alt'];
  /* the documents members send (quote/invoice pdf, contract, terms, call sheet) keep their own language */
  var DOCS='#doc,#doc2,#sheet,.paper.tc';
  function norm(s){ return String(s).replace(/[\s ]+/g,' ').trim(); }
  function skipped(el){
    for(var e=el;e&&e.nodeType===1;e=e.parentNode){
      if(SKIP[e.nodeName]) return true;
      if(e.hasAttribute('data-i18n-skip')||e.getAttribute('translate')==='no'||e.isContentEditable||e.matches(DOCS)) return true;
      if(lang==='nl'&&e.hasAttribute('data-t')&&window.ffOwnLang) return true; /* homepage handles its own copy */
    }
    return false;
  }
  var NUM=/\d+(?:[.,:]\d+)*/g;
  function look(key){
    if(!key||!dict) return null;
    if(Object.prototype.hasOwnProperty.call(dict,key)) return dict[key];
    if(!/\d/.test(key)) return rx(key);
    var nums=key.match(NUM), pk=key.replace(NUM,'{n}');
    if(Object.prototype.hasOwnProperty.call(dict,pk)){ var i=0; return dict[pk].replace(/\{n\}/g,function(){ return nums[i++]||''; }); }
    return rx(key);
  }
  /* sentences with a name or email inside: window.FF_NL_RX = [[/^Hi (.+)\.$/, 'Hoi $1.'], ...] */
  function rx(key){
    var R=window.FF_NL_RX||[];
    for(var i=0;i<R.length;i++) if(R[i][0].test(key)) return key.replace(R[i][0],R[i][1]);
    return null;
  }
  function want(key){ if(collect&&key&&/[a-z]/i.test(key)&&!look(key)) miss[key]=(miss[key]||0)+1; }

  /* inline markup without ids, handlers or data the page's own script might look for */
  function plain(c){
    if(c.id) return false;
    for(var a=0;a<c.attributes.length;a++){ var n=c.attributes[a].name; if(/^on/.test(n)||(/^data-/.test(n)&&n!=='data-preview')) return false; }
    return true;
  }
  /* an element of plain sentence text with a little inline markup: translate it as one piece */
  function htmlUnit(el){
    if(INLINE[el.nodeName]&&el.nodeName!=='SPAN'&&el.nodeName!=='A') return false;
    var hasText=false, hasEl=false;
    for(var c=el.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3){ if(norm(c.data)) hasText=true; }
      else if(c.nodeType===1){
        if(!INLINE[c.nodeName]||!plain(c)) return false;
        for(var d=c.firstElementChild;d;d=d.nextElementSibling) if(!INLINE[d.nodeName]||!plain(d)||d.firstElementChild) return false;
        hasEl=true;
      }
    }
    return hasText&&hasEl;
  }
  function setText(node){
    var raw=node.data, key=norm(raw); if(!key) return;
    var prev=node.__ffNl; if(prev!==undefined&&raw===prev) return;
    var t=look(key); if(t==null){ want(key); return; }
    var lead=raw.match(/^\s*/)[0], tail=raw.match(/\s*$/)[0], nl=lead+t+tail;
    if(nl===raw) return;
    log.push({n:node,en:raw,nl:nl}); node.data=nl; node.__ffNl=nl;
  }
  function setAttr(el,a){
    var v=el.getAttribute(a); if(v==null) return;
    var key=norm(v), m=el.__ffA||(el.__ffA={}); if(m[a]===v) return;
    var t=look(key); if(t==null){ want(key); return; }
    log.push({e:el,a:a,en:v,nl:t}); el.setAttribute(a,t); m[a]=t;
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType===3){ if(root.parentNode&&!skipped(root.parentNode)) setText(root); return; }
    if(root.nodeType!==1) return;
    if(root.nodeName==='TEXTAREA'){ if(!skipped(root.parentNode)&&root.hasAttribute('placeholder')) setAttr(root,'placeholder'); return; }
    if(skipped(root)) return;
    (function go(el){
      /* a textarea's text is the member's own, but its placeholder is ours */
      if(el.nodeName==='TEXTAREA'){ if(el.hasAttribute('placeholder')&&!el.hasAttribute('data-i18n-skip')) setAttr(el,'placeholder'); return; }
      if(SKIP[el.nodeName]||el.hasAttribute('data-i18n-skip')||el.getAttribute('translate')==='no'||el.isContentEditable||el.matches(DOCS)) return;
      if(lang==='nl'&&window.ffOwnLang&&el.hasAttribute('data-t')) return;
      /* an <option> without value sends its text: pin the English text as its value first */
      if(el.nodeName==='OPTION'&&!el.hasAttribute('value')) el.setAttribute('value',el.text);
      for(var i=0;i<ATTRS.length;i++) if(el.hasAttribute(ATTRS[i])) setAttr(el,ATTRS[i]);
      if(el.nodeName==='INPUT'&&/^(button|submit|reset)$/.test(el.type)) setAttr(el,'value');
      if(htmlUnit(el)){
        var html=el.innerHTML; if(el.__ffNlH===html) return;
        var key=norm(html), t=look(key);
        if(t!=null){ log.push({h:el,en:html,nl:t}); el.innerHTML=t; el.__ffNlH=el.innerHTML; return; }
        if(collect){ want(key); return; }
      }
      for(var c=el.firstChild;c;c=c.nextSibling){ if(c.nodeType===3) setText(c); else if(c.nodeType===1) go(c); }
    })(root);
  }
  function title(){
    var t=look(norm(document.title)); if(t!=null&&document.title!==t){ log.push({title:1,en:document.title,nl:t}); document.title=t; }
    else want(norm(document.title));
    ['data-gate-title','data-gate-text'].forEach(function(a){ if(H.hasAttribute(a)) setAttr(H,a); });
    var md=document.querySelector('meta[name=description]'); if(md) setAttr(md,'content');
  }
  function observe(){
    if(mo) return;
    mo=new MutationObserver(function(recs){
      if(busy) return; busy=true;
      try{
        recs.forEach(function(r){
          if(r.type==='childList') r.addedNodes.forEach(walk);
          else if(r.type==='characterData'){ if(r.target.parentNode&&!skipped(r.target.parentNode)) setText(r.target); }
          else if(r.type==='attributes'&&!skipped(r.target)) setAttr(r.target,r.attributeName);
        });
      } finally { mo.takeRecords(); busy=false; }
    });
    mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  function translate(){
    busy=true; try{ title(); walk(document.body); } finally { busy=false; }
    observe(); H.classList.remove('ff-nl-wait');
  }
  function revert(){
    if(mo){ mo.disconnect(); mo=null; }
    for(var i=log.length-1;i>=0;i--){
      var r=log[i];
      if(r.n){ if(r.n.data===r.nl) r.n.data=r.en; r.n.__ffNl=undefined; }
      else if(r.h){ if(r.h.innerHTML===r.h.__ffNlH) r.h.innerHTML=r.en; r.h.__ffNlH=undefined; }
      else if(r.e){ if(r.e.getAttribute(r.a)===r.nl) r.e.setAttribute(r.a,r.en); if(r.e.__ffA) r.e.__ffA[r.a]=undefined; }
      else if(r.title){ if(document.title===r.nl) document.title=r.en; }
    }
    log=[];
  }
  function loadDict(cb){
    if(window.FF_NL){ dict=window.FF_NL; return cb(); }
    var s=document.querySelector('script[data-ff-nl]');
    if(!s){ s=document.createElement('script'); s.src='/assets/nl.js?v=1'; s.setAttribute('data-ff-nl',''); document.head.appendChild(s); }
    s.addEventListener('load',function(){ dict=window.FF_NL||{}; cb(); });
    s.addEventListener('error',function(){ H.classList.remove('ff-nl-wait'); });
  }

  /* the switch: EN / NL in the left of the header, on every page */
  var css=document.createElement('style');
  css.textContent='.ff-lang{display:inline-flex;align-items:center;gap:2px;margin-left:14px}'+
  '.ff-lang:first-child{margin-left:0}'+
  '.ff-lang button{font-family:"Space Mono",monospace!important;font-size:11px!important;font-weight:700;letter-spacing:.15em;line-height:1;background:none!important;border:0;padding:8px 3px!important;min-height:0!important;height:auto!important;cursor:pointer;color:#8A8E86!important}'+
  '.ff-lang button[aria-pressed=true]{color:#1C1E1A!important;text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:1px}'+
  '.ff-lang button:hover{color:#1F3FD1!important}'+
  '.ff-lang span{font:11px "Space Mono",monospace;color:#8A8E86}'+
  '.nav.ffh>div:first-child{display:flex;align-items:center}'+
  '@media (max-width:700px){.ff-lang{margin-left:8px}.nav.ffh .ff-lang{position:absolute;left:12px;top:50%;transform:translateY(-50%);margin:0}.nav.ffh .ffm-btn~.ff-lang{left:56px}}'+
  '@media print{.ff-lang{display:none}}';
  document.head.appendChild(css);

  function sw(){
    var g=document.createElement('div'); g.className='ff-lang'; g.setAttribute('role','group'); g.setAttribute('aria-label','language'); g.setAttribute('translate','no');
    g.innerHTML='<button type="button" data-ff-lang="en" lang="en">EN</button><span aria-hidden="true">/</span><button type="button" data-ff-lang="nl" lang="nl">NL</button>';
    g.addEventListener('click',function(e){ var b=e.target.closest('button'); if(b) set(b.getAttribute('data-ff-lang')); });
    return g;
  }
  function mark(){ document.querySelectorAll('[data-ff-lang]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-ff-lang')===lang?'true':'false'); }); }
  function place(){
    if(document.querySelector('.ff-lang')) return;
    var head=document.querySelector('.ffh-l')||document.querySelector('.nav.ffh > div:first-child');
    if(head) head.appendChild(sw()); mark();
  }
  function set(l){
    l=l==='nl'?'nl':'en'; if(l===lang&&(l==='en'||dict)) { mark(); return; }
    lang=l; try{ localStorage.setItem(KEY,l); }catch(e){}
    H.lang=l; mark();
    if(l==='nl') loadDict(function(){ translate(); fire(); }); else { revert(); fire(); }
  }

  function fire(){ try{ document.dispatchEvent(new CustomEvent('fflang',{detail:lang})); }catch(e){} }
  window.ffI18n={
    lang:function(){ return lang; }, set:set, t:function(s){ return lang==='nl'?(look(norm(s))||s):s; },
    missing:function(){ var k=Object.keys(miss); console.log(JSON.stringify(k,null,1)); return k; }, _miss:miss
  };
  /* the small pop-ups (are you sure?) speak Dutch too */
  ['confirm','alert','prompt'].forEach(function(k){
    var o=window[k]; if(typeof o!=='function') return;
    window[k]=function(m){ var a=[].slice.call(arguments); if(lang==='nl'&&dict&&typeof m==='string') a[0]=m.split('\n\n').map(function(x){ return look(norm(x))||x; }).join('\n\n'); return o.apply(window,a); };
  });
  H.lang=lang;
  function start(){
    place();
    /* the menu button arrives a moment later: keep the switch after it */
    setTimeout(function(){ var g=document.querySelector('.ff-lang'), b=document.querySelector('.ffm-btn'); if(g&&b&&g.parentNode===b.parentNode&&b.nextSibling!==g) b.parentNode.insertBefore(g,b.nextSibling); },400);
    /* pages with their own Dutch (homepage, say your number, fee calculator) redraw on 'fflang' */
    if(lang==='nl'||collect){ if(collect&&!window.FF_NL) dict={}; loadDict(function(){ translate(); if(lang==='nl') fire(); }); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
