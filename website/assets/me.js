/* fee fee. "me": what this person already told us, so forms don't ask twice.
   Reads only from this browser: the saved login (profile on your desk) and your
   quote details. Nothing is sent anywhere. Returns {} when nobody is logged in. */
(function(){
  function pick(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!=null && String(v).trim()) return String(v).trim(); } return ''; }
  window.ffMe = function(){
    var u=null, lc={};
    try{
      var raw=JSON.parse(localStorage.getItem('sb-eadxyfxlhwikesonpaer-auth-token')||'null');
      u = raw && (raw.user || (raw.currentSession && raw.currentSession.user)) || null;
    }catch(e){}
    try{ lc=JSON.parse(localStorage.getItem('ff-me')||'{}')||{}; }catch(e){}
    var m=(u&&u.user_metadata)||{}, d=m.desk||{};
    if(!u && !lc.me) return {};
    return {
      name: pick(m.name, d.me, lc.me),
      role: pick(m.role, d.role, lc.role),
      city: pick(m.city),
      instagram: pick(m.instagram, d.ig, lc.ig),
      website: pick(m.website),
      email: pick(d.email, lc.email, u&&u.email),
      phone: pick(d.phone, lc.phone),
      addr: pick(d.addr, lc.addr),
      cur: pick(d.cur, lc.cur)
    };
  };
})();
