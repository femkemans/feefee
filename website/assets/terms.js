/* fee fee. terms and conditions: the base template, the renderer and storage.
   Used by terms.html (the editor), t.html (the shared link) and quote.html
   (attach your terms to a quote or invoice). Needs supabase.js + desk.js for storage. */
(function(){
  /* your numbers: [label, default, short hint] */
  var VARS = {
    valid:   ['quote valid for (days)', 14],
    hold:    ['hold a date for (working days)', 2],
    hours:   ['hours in a full day', 8],
    half:    ['hours in a half day', 4],
    rounds:  ['feedback rounds included', 1],
    c1:      ['charge (%)', 50],
    c1h:     ['when cancelled within (hours)', 72],
    c2:      ['charge (%)', 100],
    c2h:     ['when cancelled within (hours)', 24],
    move:    ['move once for free, up to (days before)', 7],
    kill:    ['kill fee (% of the rest)', 50],
    pay:     ['pay within (days)', 14],
    dep:     ['deposit at booking (%)', 50],
    depOver: ['deposit for jobs over (amount)', 2500],
    markup:  ['handling on expenses (%)', 0],
    deliv:   ['deliver within (working days)', 10],
    archive: ['keep files for (months)', 12]
  };
  function n(v,k){ var x = v[k]; return (x === '' || x == null || isNaN(+x)) ? VARS[k][1] : +x; }
  function plural(x, one, more){ return x + ' ' + (x === 1 ? one : (more || one + 's')); }
  function money(x, c){ return (c || '€') + ' ' + Number(x).toLocaleString('en-GB'); }
  function who(me){ return me.biz || me.name || 'the maker'; }

  /* the base template. f = the numbers shown with the clause in the editor.
     t = the text, written in the maker's own voice ("I", "you" = the client). */
  var CLAUSES = [
    { id:'scope', h:'These terms', f:[], t:function(v,me){
      return 'These terms apply to every quote, booking and job I do for you, unless we agree something else in writing. Your own purchase terms do not apply. “I” is ' + who(me) + (me.biz && me.name ? ' (' + me.name + ')' : '') + ', “you” is the client who books me.'; } },
    { id:'booking', h:'Quotes and booking', f:['valid','hold'], t:function(v){
      return 'A quote is valid for ' + plural(n(v,'valid'),'day') + '. A job is booked once you sign the quote or confirm it by email. A hold (option) on a date stays open for ' + plural(n(v,'hold'),'working day') + '. If someone else asks for the same date, I check with you first.'; } },
    { id:'brief', h:'The brief', f:[], t:function(){
      return 'My fee is based on the brief and the quote. If the brief changes after booking, for example more looks, more locations or more people on set, I send a new quote before we go on.'; } },
    { id:'hours', h:'Hours and overtime', f:['hours','half'], t:function(v){
      return 'A full day is ' + plural(n(v,'hours'),'hour') + ' and a half day is ' + plural(n(v,'half'),'hour') + ', lunch not included. Overtime is charged per started hour, at 1/' + n(v,'hours') + ' of the day rate.'; } },
    { id:'rounds', h:'Feedback rounds', f:['rounds'], t:function(v){
      var r = n(v,'rounds');
      return (r ? plural(r,'round') + ' of feedback ' + (r === 1 ? 'is' : 'are') + ' included. A round is one set of combined notes from your side.' : 'Feedback rounds are not included.') + ' Extra rounds, and new requests after approval, are charged by the hour.'; } },
    { id:'cancel', h:'Cancelling or moving a date', f:['c1','c1h','c2','c2h','move'], t:function(v){
      return 'If you cancel, I charge ' + n(v,'c1') + '% of the fee within ' + plural(n(v,'c1h'),'hour') + ' before the job, and ' + n(v,'c2') + '% within ' + plural(n(v,'c2h'),'hour') + '. Costs I have already made are always charged. You can move the date once for free, up to ' + plural(n(v,'move'),'day') + ' before. After that, moving counts as cancelling.'; } },
    { id:'kill', h:'Kill fee', f:['kill'], t:function(v){
      return 'If you stop the job after the work has started, I charge the work done so far plus ' + n(v,'kill') + '% of the rest of the fee. You can only use the work that is paid for.'; } },
    { id:'payment', h:'Payment', f:['pay','dep','depOver'], t:function(v,me){
      var d = n(v,'dep');
      return 'Please pay within ' + plural(n(v,'pay'),'day') + ' of the invoice date.' + (d ? ' For jobs over ' + money(n(v,'depOver'), me.cur) + ', I invoice ' + d + '% at booking and the rest after delivery.' : '') + ' If payment is late, I may charge statutory commercial interest and collection costs, and wait with delivery until it is paid.'; } },
    { id:'expenses', h:'Expenses', f:['markup'], t:function(v){
      var m = n(v,'markup');
      return 'Expenses such as travel, kit hire, assistants and props are paid by you, unless the quote says otherwise. Estimates are confirmed before I book anything.' + (m ? ' I add ' + m + '% handling to expenses I pay in advance.' : ''); } },
    { id:'usage', h:'Usage and copyright', f:[], t:function(){
      return 'Copyright stays with me. You may use the work only as written in the quote: where, for how long and in which countries. Usage starts once the invoice is paid in full. Any other use, a longer period or a new country needs a new agreement and fee.'; } },
    { id:'ai', h:'AI and changes', f:[], t:function(){
      return 'The work may not be used to train AI, or to make new work with AI. Please don’t change it, crop it heavily or add filters without asking me first.'; } },
    { id:'credit', h:'Credit', f:[], t:function(v,me){
      var c = [me.name || who(me), me.ig].filter(Boolean).join(' ');
      return 'Please credit me as ' + c + ' wherever the work is published, when that is possible.'; } },
    { id:'portfolio', h:'Portfolio', f:[], t:function(){
      return 'I may show the work in my portfolio and on my own channels once it is published, or after a date we agree on. Tell me before booking if there is an embargo or an NDA.'; } },
    { id:'delivery', h:'Delivery and archive', f:['deliv','archive'], t:function(v){
      return 'I deliver within ' + plural(n(v,'deliv'),'working day') + ' after the final selection, unless the quote says otherwise. I keep the files for ' + plural(n(v,'archive'),'month') + ' after delivery. After that, I can’t promise they are still there.'; } },
    { id:'set', h:'On set', f:[], t:function(){
      return 'A shoot day includes a proper lunch break, with food and water on set. Please make sure the set is safe. If it isn’t, I may pause the work until it is.'; } },
    { id:'illness', h:'Illness and things nobody can help', f:[], t:function(){
      return 'If I am ill, or something happens that neither of us can help, I look for a good replacement together with you, or we pick a new date. If neither is possible, you only pay for the work already done.'; } },
    { id:'liability', h:'Liability', f:[], t:function(){
      return 'I work with care. If something does go wrong, my liability is limited to the fee for the job, and I am not liable for indirect damage, such as lost profit. Insurance for the location, products and models is arranged by you.'; } },
    { id:'privacy', h:'Privacy', f:[], t:function(){
      return 'I keep what you share with me confidential, and only use your details for the job and the invoice.'; } },
    { id:'law', h:'Which law applies', f:[], last:true, t:function(v,me){
      var c = me.country || 'my country';
      return 'The law of ' + c + ' applies to these terms and to our jobs. If we can’t work something out together, ' + (me.city ? 'the court nearest to ' + me.city : 'the competent court in ' + c) + ' decides.'; } }
  ];

  function blank(){ var v = {}; Object.keys(VARS).forEach(function(k){ v[k] = VARS[k][1]; }); return { v:v, me:{}, off:{}, txt:{}, own:[] }; }

  /* the clauses as they end up on paper: base (with your numbers and your wording),
     then your own clauses, then which law applies */
  function list(s){
    var out = [], v = s.v || {}, me = s.me || {}, last = [];
    CLAUSES.forEach(function(c){
      if (s.off && s.off[c.id]) return;
      var x = { id:c.id, h:c.h, b:(s.txt && s.txt[c.id]) || c.t(v, me) };
      (c.last ? last : out).push(x);
    });
    (s.own || []).forEach(function(o){ if ((o.h || '').trim() || (o.b || '').trim()) out.push({ id:o.id, h:(o.h || '').trim(), b:(o.b || '').trim(), own:true }); });
    return out.concat(last);
  }

  function el(t, c, txt){ var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function fmtDate(d){ return d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }

  /* draw the document into a container */
  function render(box, s, opt){
    opt = opt || {}; s = s || blank(); var me = s.me || {};
    box.innerHTML = '';
    var top = el('header', 'tc-top');
    var l = el('div');
    l.appendChild(el('h1', 'tc-title', 'Terms and conditions.'));
    var by = [who(me), me.role].filter(Boolean).join(' · ');
    l.appendChild(el('p', 'tc-by' + (by ? '' : ' tc-empty'), by || 'your name · what you do'));
    top.appendChild(l);
    var from = [me.biz && me.name ? me.name : '', me.addr, me.email, me.web, me.coc && ('coc ' + me.coc), me.vat && ('vat ' + me.vat)].filter(Boolean);
    var m = el('div', 'tc-meta');
    from.forEach(function(x){ m.appendChild(el('div', null, x)); });
    m.appendChild(el('div', 'tc-ver', 'version ' + fmtDate(opt.date || new Date())));
    top.appendChild(m);
    box.appendChild(top);
    var ol = el('ol', 'tc-list');
    list(s).forEach(function(c, i){
      var li = el('li', 'tc-c');
      li.appendChild(el('span', 'tc-n', String(i + 1).padStart(2, '0')));
      var w = el('div');
      if (c.h) w.appendChild(el('h2', 'tc-h', c.h));
      if (c.b) c.b.split(/\n+/).forEach(function(p){ if (p.trim()) w.appendChild(el('p', 'tc-b', p.trim())); });
      li.appendChild(w); ol.appendChild(li);
    });
    box.appendChild(ol);
    var made = el('p', 'tc-made'); made.appendChild(document.createTextNode('made with ')); made.appendChild(el('span', 'tc-logo', 'fee fee.')); made.appendChild(document.createTextNode(' · feefee.co'));
    box.appendChild(made);
  }

  /* storage: one row per member in public.terms (supabase/terms.sql).
     until that table exists, everything stays on this device. */
  var LS = 'ff-terms';
  function local(v){ try{ if (v === undefined) return JSON.parse(localStorage.getItem(LS) || 'null'); localStorage.setItem(LS, JSON.stringify(v)); }catch(e){ return null; } }
  function slug(){ var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = '', r = new Uint8Array(10); crypto.getRandomValues(r); for (var i = 0; i < 10; i++) s += a[r[i] % a.length]; return s; }
  function sb(){ return window.ffDesk && window.ffDesk.sb; }

  /* → { state, slug, published, cloud: true|false } */
  function load(){
    var cached = local();
    if (!sb()) return Promise.resolve({ state:cached, cloud:false });
    return sb().from('terms').select('slug,published,data,updated_at').maybeSingle().then(function(r){
      if (r.error) return { state:cached, cloud:false, error:r.error };
      if (!r.data) return { state:cached, cloud:true };
      local(r.data.data);
      return { state:r.data.data, slug:r.data.slug, published:r.data.published, updated:r.data.updated_at, cloud:true };
    }, function(){ return { state:cached, cloud:false }; });
  }
  function save(state, meta){
    local(state);
    if (!sb()) return Promise.resolve({ cloud:false });
    var row = { slug:meta.slug || slug(), published:!!meta.published, data:state, updated_at:new Date().toISOString() };
    return sb().from('terms').upsert(row, { onConflict:'user_id' }).select('slug,published').single().then(function(r){
      if (r.error) return { cloud:false, error:r.error };
      return { cloud:true, slug:r.data.slug, published:r.data.published };
    });
  }
  function bySlug(s){
    return sb().rpc('terms_by_slug', { s:s }).then(function(r){
      var d = r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      return { state:d ? d.data : null, updated:d ? d.updated_at : null, error:r.error };
    });
  }
  function link(s){ return 'feefee.co/t.html?id=' + s; }

  window.ffTerms = { VARS:VARS, CLAUSES:CLAUSES, blank:blank, list:list, render:render, load:load, save:save, bySlug:bySlug, link:link };
})();
