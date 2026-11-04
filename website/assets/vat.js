/* fee fee. vat helper for quotes and invoices.
   Rates checked November 2026 (standard + reduced rates per country).
   Rates and rules change: the page always tells people to check with their own
   tax office. This file only suggests; the maker always has the last word. */
(function(){
  // code: [name, in the EU?, standard rate, [reduced rates]]
  var C = {
    NL:['Netherlands',1,21,[9]],      BE:['Belgium',1,21,[12,6]],      DE:['Germany',1,19,[7]],
    FR:['France',1,20,[10,5.5,2.1]],  ES:['Spain',1,21,[10,4]],        IT:['Italy',1,22,[10,5,4]],
    PT:['Portugal',1,23,[13,6]],      IE:['Ireland',1,23,[13.5,9]],    LU:['Luxembourg',1,17,[14,8,3]],
    AT:['Austria',1,20,[13,10]],      DK:['Denmark',1,25,[]],          SE:['Sweden',1,25,[12,6]],
    FI:['Finland',1,25.5,[13.5,10]],  PL:['Poland',1,23,[8,5]],        CZ:['Czechia',1,21,[12]],
    SK:['Slovakia',1,23,[19,5]],      SI:['Slovenia',1,22,[9.5,5]],    HR:['Croatia',1,25,[13,5]],
    HU:['Hungary',1,27,[18,5]],       RO:['Romania',1,21,[11]],        BG:['Bulgaria',1,20,[9]],
    GR:['Greece',1,24,[13,6]],        CY:['Cyprus',1,19,[9,5]],        MT:['Malta',1,18,[7,5]],
    EE:['Estonia',1,24,[13,9]],       LV:['Latvia',1,21,[12,5]],       LT:['Lithuania',1,21,[12,5]],
    GB:['United Kingdom',0,20,[5,0]], CH:['Switzerland',0,8.1,[3.8,2.6]], NO:['Norway',0,25,[15,12]],
    US:['United States',0,0,[]],      CA:['Canada',0,5,[]],            AU:['Australia',0,10,[]],
    OT:['other country',0,0,[]]
  };
  var ORDER = ['NL','BE','DE','FR','ES','IT','PT','IE','LU','AT','DK','SE','FI','PL','CZ','SK','SI','HR','HU','RO','BG','GR','CY','MT','EE','LV','LT','GB','CH','NO','US','CA','AU','OT'];

  function c(code){ return C[code] || null; }
  function eu(code){ var x=c(code); return !!(x && x[1]); }
  function rates(code){ var x=c(code); if(!x) return [21,9,0]; var r=[x[2]].concat(x[3]); if(r.indexOf(0)<0) r.push(0); return r; }
  function std(code){ var x=c(code); return x ? x[2] : 21; }

  /* modes:
     rate     a normal vat rate (can differ per line)
     reverse  b2b client in another EU country: the client pays the vat
     outside  client outside your vat area: no vat from you
     exempt   you use a small business scheme (no vat at all) */
  function suggest(me, client, business){
    if(!me || !client || me===client) return 'rate';
    if(eu(me) && eu(client)) return business ? 'reverse' : 'rate';
    return business ? 'outside' : 'rate';
  }

  function note(mode, me){
    if(mode==='reverse') return 'vat reverse charged: the client accounts for the vat (article 196, eu vat directive 2006/112/ec).';
    if(mode==='outside') return eu(me) ? 'vat not applicable: service for a client outside the eu.' : 'no vat charged: service for a client outside '+(c(me)?c(me)[0]:'my country')+'.';
    if(mode==='exempt') return me==='NL' ? 'vat exempt: small business scheme (kor).' : 'vat exempt: small business scheme.';
    return '';
  }

  function hint(mode, me, client, business, clientVat){
    if(mode==='reverse'){ return clientVat ? 'reverse charge: no vat on this invoice. both vat numbers are shown. in most countries you also report it (nl: opgaaf icp).' : 'reverse charge needs the vat number of your client. add it under client.'; }
    if(mode==='outside') return 'no vat for a business client outside your vat area, in most cases. for private clients, or work done in your own country, the rules can differ.';
    if(mode==='exempt') return 'only if you are registered for a small business scheme. no vat on any line.';
    if(me==='NL') return 'nl: 21% for most creative work. 9% only in special cases, like signed and numbered art prints (max 30) or a photo book as the main product. you can set a rate per line.';
    if(client && me && client!==me && eu(me) && eu(client) && !business) return 'private client in another eu country: usually your own country’s rate.';
    return 'you can set a different rate per line, for example when part of the job has a reduced rate.';
  }

  window.ffVat = { countries:C, order:ORDER, country:c, eu:eu, rates:rates, std:std, suggest:suggest, note:note, hint:hint };
})();
