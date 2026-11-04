/* fee fee. menu: the whole site in five doors, behind a small hamburger.
   Shows only in preview mode: ?preview=finetune turns it on in your browser, ?preview=off turns it off (see preview.js).
   Pages that are not built yet show in grey with "soon". A blue dot = members only. */
(function(){
  var D = [
    ['The numbers', [
      ['the range', '', 1],
      ['the fee drop', '/drops.html'],
      ['say your number', '/fee.html'],
      ['day rate maker', '/dayrate.html'],
      ['off the record', '']
    ]],
    ['The brief', [
      ['set words', '/setwords.html'],
      ['usage, decoded', '/usage.html'],
      ['the small print', ''],
      ['ask first', ''],
      ['notes', ''],
      ['call sheet', '/callsheet.html'],
      ['quote and invoice', '/quote.html', 1],
      ['more in the kit', '']
    ]],
    ['The crew', [
      ['ask anything', '/questions.html'],
      ['the crew list', '/people.html'],
      ['coffee with femke', '/call.html', 1],
      ['after wrap', '']
    ]],
    ['Why', [
      ['manifesto', '/manifesto.html'],
      ['a letter from femke', ''],
      ['faq', '/index.html#faq'],
      ['privacy', '/privacy.html']
    ]],
    ['Your desk', [
      ['join the waitlist', '/index.html#join', 0, 'out'],
      ['your desk', '/account.html', 1],
      ['your terms', '/terms.html', 1],
      ['your link page', '/account.html', 1],
      ['bring your people', '', 1]
    ]]
  ];

  var css = ''
  + '.ffm-btn{border:0!important;background:none!important;border-radius:0!important;cursor:pointer;display:inline-flex;flex-direction:column;justify-content:center;gap:5px;width:34px;height:34px;padding:0 6px!important;margin-left:-6px}'
  + '.ffm-btn i{display:block;height:1.5px;width:22px;background:#1C1E1A;transition:transform .3s ease,opacity .2s}'
  + '.ffm-btn:hover i{background:#1F3FD1}'
  + '.ffm{position:fixed;inset:0;z-index:100;background:url(/assets/grain.png) repeat,#FDFCF9;background-size:120px 120px,auto;overflow-y:auto;opacity:0;visibility:hidden;transition:opacity .35s ease,visibility 0s .35s;color:#1C1E1A}'
  + '.ffm.on{opacity:1;visibility:visible;transition:opacity .35s ease}'
  + '.ffm-top{max-width:1440px;margin:0 auto;padding:18px 32px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}'
  + '.ffm-x{justify-self:start;font-family:"Space Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;background:none;border:0;padding:8px 0;cursor:pointer;color:#1C1E1A}'
  + '.ffm-x:hover{color:#1F3FD1}.ffm-x:focus:not(:focus-visible){outline:none}'
  + '.ffm-top img{display:block;height:24px;width:auto}'
  + '.ffm-grid{max-width:1240px;margin:0 auto;padding:72px 32px 40px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:40px}'
  + '.ffm h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:clamp(30px,2.6vw,40px);white-space:nowrap;line-height:1;margin:0 0 22px;letter-spacing:-.01em}'
  + '.ffm ul{list-style:none;margin:0;padding:0}'
  + '.ffm li{font-family:"Cormorant Garamond",Georgia,serif;font-size:21px;line-height:1.6}'
  + '.ffm li a{color:#1C1E1A;text-decoration:none;border-bottom:1px solid transparent}'
  + '.ffm li a:hover{color:#1F3FD1;border-bottom-color:#1F3FD1}'
  + '.ffm li span.s{color:#9A9E96}'
  + '.ffm li small{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#9A9E96;margin-left:8px;vertical-align:2px}'
  + '.ffm .d{display:inline-block;width:6px;height:6px;border-radius:50%;background:#1F3FD1;margin-left:7px;vertical-align:4px}'
  + '.ffm-foot{max-width:1240px;margin:0 auto;padding:24px 32px 56px;font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.04em;color:#6E726A}'
  + '.ffm-foot .d{margin:0 8px 0 0;vertical-align:1px}'
  + 'html.ffm-open{overflow:hidden}'
  + 'html.ff-in .ffm [data-a=out]{display:none}'
  + '@media (max-width:980px){.ffm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:48px 32px;padding-top:48px}}'
  + '@media (max-width:700px){.ffm-top{padding:14px 18px}.ffm-grid{grid-template-columns:1fr;gap:36px;padding:36px 18px 24px}.ffm h2{font-size:34px;margin-bottom:12px}.ffm-foot{padding:16px 18px 48px}'
  + '.nav .ffm-btn{position:absolute;left:12px;top:50%;transform:translateY(-50%)}}';

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  function build(){
    var head = document.querySelector('.ffh-l') || document.querySelector('.nav.ffh > div:first-child');
    if(!head || document.querySelector('.ffm')) return;
    var st = el('style'); st.textContent = css; document.head.appendChild(st);

    var btn = el('button', 'ffm-btn', '<i></i><i></i><i></i>');
    btn.type = 'button'; btn.setAttribute('aria-label', 'menu'); btn.setAttribute('aria-expanded', 'false');
    head.insertBefore(btn, head.firstChild);

    var m = el('div', 'ffm'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'menu'); m.setAttribute('aria-hidden', 'true');
    var top = el('div', 'ffm-top');
    var x = el('button', 'ffm-x', 'close'); x.type = 'button';
    top.appendChild(x);
    top.appendChild(el('a', '', '<img src="/assets/logo-mark.svg" alt="fee fee." width="994" height="243">')).href = '/index.html';
    top.appendChild(el('div'));
    m.appendChild(top);

    var g = el('nav', 'ffm-grid');
    D.forEach(function(col){
      var c = el('div'); c.appendChild(el('h2', '', col[0] + '.'));
      var ul = el('ul');
      col[1].forEach(function(it){
        var li = el('li'); if(it[3]) li.setAttribute('data-a', it[3]);
        var dot = it[2] ? '<span class="d" title="members only"></span>' : '';
        li.innerHTML = it[1] ? '<a href="' + it[1] + '">' + it[0] + '</a>' + dot
                             : '<span class="s">' + it[0] + '</span>' + dot + '<small>soon</small>';
        ul.appendChild(li);
      });
      c.appendChild(ul); g.appendChild(c);
    });
    m.appendChild(g);
    m.appendChild(el('p', 'ffm-foot', '<span class="d"></span>members only. everything else is open to everyone.'));
    document.body.appendChild(m);

    function set(on){
      m.classList.toggle('on', on);
      m.setAttribute('aria-hidden', on ? 'false' : 'true');
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      document.documentElement.classList.toggle('ffm-open', on);
      if(on) x.focus(); else btn.focus();
    }
    btn.addEventListener('click', function(){ set(true); });
    x.addEventListener('click', function(){ set(false); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('on')) set(false); });
    m.addEventListener('click', function(e){ var a = e.target.closest('a'); if(a) set(false); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
