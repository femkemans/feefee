/* fee fee. your style: logo, one accent colour, one type pair.
   Set once on your desk ("Your style."), used on quotes and invoices (and later terms,
   contracts and call sheets). Kept in Supabase table public.brands (supabase/brand.sql)
   and cached in this browser, so it also works before that table exists.
   Paper stays white, text stays black, the layout stays fee fee. */
(function(){
  var KEY='ff-brand';
  var PAIRS=[
    {id:'classic',  name:'classic',  title:'Cormorant Garamond', text:null},
    {id:'editorial',name:'editorial',title:'Playfair Display',   text:'Inter'},
    {id:'bookish',  name:'bookish',  title:'Libre Baskerville',  text:'Work Sans'},
    {id:'soft',     name:'soft',     title:'Fraunces',           text:'Manrope'},
    {id:'modern',   name:'modern',   title:'Space Grotesk',      text:'Space Grotesk'},
    {id:'bold',     name:'bold',     title:'Syne',               text:'DM Sans'},
    {id:'quiet',    name:'quiet',    title:'Instrument Serif',   text:'Inter'},
    {id:'couture',  name:'couture',  title:'Bodoni Moda',        text:'Jost'}
  ];
  var SWATCHES=['#1f3fd1','#1c1e1a','#b4532a','#2f6b4f','#8a2e4b','#c08a1e','#4a5a7a','#6b4fa0'];

  function pair(id){ for(var i=0;i<PAIRS.length;i++) if(PAIRS[i].id===id) return PAIRS[i]; return PAIRS[0]; }
  function clean(b){
    b=b||{};
    return {
      accent: /^#[0-9a-f]{6}$/i.test(b.accent||'') ? b.accent.toLowerCase() : null,
      pair: pair(b.pair).id,
      logo: (typeof b.logo==='string' && b.logo.indexOf('data:image/')===0 && b.logo.length<200000) ? b.logo : null
    };
  }
  function cache(b){ try{ if(b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY); }catch(e){} }
  function cached(){ try{ return clean(JSON.parse(localStorage.getItem(KEY)||'null')); }catch(e){ return clean(null); } }
  function sb(){ return window.ffDesk && window.ffDesk.sb; }

  /* colour helpers: keep text readable on white paper */
  function lum(hex){
    var c=[1,3,5].map(function(i){ var v=parseInt(hex.substr(i,2),16)/255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); });
    return .2126*c[0]+.7152*c[1]+.0722*c[2];
  }
  function contrast(hex){ return 1.05/(lum(hex)+.05); }
  function darken(hex, f){
    return '#'+[1,3,5].map(function(i){ var v=Math.round(parseInt(hex.substr(i,2),16)*f); return ('0'+v.toString(16)).slice(-2); }).join('');
  }
  function readable(hex){ var h=hex, n=0; while(contrast(h)<3.2 && n<30){ h=darken(h,.92); n++; } return h; }

  var loaded={};
  function font(name){
    if(!name || loaded[name]) return;
    loaded[name]=1;
    var l=document.createElement('link'); l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(name).replace(/%20/g,'+')+':ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap';
    document.head.appendChild(l);
  }

  window.ffBrand={
    PAIRS:PAIRS, SWATCHES:SWATCHES, pair:pair, contrast:contrast, readable:readable,
    cached:cached,
    /* the saved style: from Supabase when logged in and the table exists, else this browser */
    get:function(){
      var c=cached();
      if(!sb()) return Promise.resolve(c);
      return sb().auth.getSession().then(function(r){
        if(!r.data.session) return c;
        return sb().from('brands').select('accent,pair,logo').maybeSingle().then(function(q){
          if(q.error || !q.data) return c;
          var b=clean(q.data); cache(b); return b;
        });
      }).catch(function(){ return c; });
    },
    /* save: always in this browser, and in Supabase when possible. resolves {synced:true|false} */
    save:function(b){
      b=clean(b); cache(b);
      if(!sb()) return Promise.resolve({synced:false});
      return sb().auth.getSession().then(function(r){
        if(!r.data.session) return {synced:false};
        var row={user_id:r.data.session.user.id, accent:b.accent, pair:b.pair, logo:b.logo, updated_at:new Date().toISOString()};
        return sb().from('brands').upsert(row).then(function(q){ return {synced:!q.error}; });
      }).catch(function(){ return {synced:false}; });
    },
    /* put the style on a document element.
       el gets class "branded" + css vars; [data-brand-name] shows the logo, or the name in the title font */
    apply:function(el, b){
      if(!el) return;
      b=clean(b);
      var p=pair(b.pair);
      font(p.title); font(p.text);
      var on = b.accent || b.logo || p.id!=='classic';
      el.classList.toggle('branded', !!on);
      el.style.setProperty('--b-title', p.title ? "'"+p.title+"', Georgia, serif" : '');
      if(p.text) el.style.setProperty('--b-text', "'"+p.text+"', system-ui, sans-serif"); else el.style.removeProperty('--b-text');
      el.classList.toggle('b-text', !!p.text);
      if(b.accent){ el.style.setProperty('--b-accent', b.accent); el.style.setProperty('--b-accent-text', readable(b.accent)); }
      else { el.style.removeProperty('--b-accent'); el.style.removeProperty('--b-accent-text'); }
      Array.prototype.forEach.call(el.querySelectorAll('[data-brand-logo]'), function(box){
        box.innerHTML='';
        if(b.logo){ var i=new Image(); i.src=b.logo; i.alt=''; box.appendChild(i); box.hidden=false; }
        else box.hidden=true;
      });
      el.classList.toggle('has-logo', !!b.logo);
    },
    /* read an uploaded logo file into a small data url (max 600 x 240) */
    readLogo:function(file){
      return new Promise(function(ok, no){
        if(!file) return no(new Error('no file'));
        if(file.size>4e6) return no(new Error('that file is quite big. try one under 4 MB.'));
        var fr=new FileReader();
        fr.onerror=function(){ no(new Error('could not read that file.')); };
        if(file.type==='image/svg+xml'){
          fr.onload=function(){ var d=fr.result; if(d.length>150000) return no(new Error('that svg is a bit heavy. try a png.')); ok(d); };
          fr.readAsDataURL(file); return;
        }
        fr.onload=function(){
          var img=new Image();
          img.onload=function(){
            var s=Math.min(1, 600/img.width, 240/img.height), w=Math.max(1,Math.round(img.width*s)), h=Math.max(1,Math.round(img.height*s));
            var c=document.createElement('canvas'); c.width=w; c.height=h;
            c.getContext('2d').drawImage(img,0,0,w,h);
            var d=c.toDataURL('image/png');
            if(d.length>190000) d=c.toDataURL('image/webp',.9);
            if(d.length>190000) return no(new Error('that logo is too detailed. try a simpler or smaller file.'));
            ok(d);
          };
          img.onerror=function(){ no(new Error('that file does not look like an image.')); };
          img.src=fr.result;
        };
        fr.readAsDataURL(file);
      });
    }
  };
})();
