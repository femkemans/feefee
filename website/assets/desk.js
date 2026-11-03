/* fee fee. desk: login + private documents (quotes & invoices).
   Every document is stored with the owner's user id; row level security in
   Supabase makes sure people only ever see their own. */
(function(){
  var URL_ = 'https://eadxyfxlhwikesonpaer.supabase.co';
  var KEY_ = 'sb_publishable_HzD6stLtpaG0-uJiq5S8eA_9bVi78ri';
  var sb = window.supabase.createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  window.ffDesk = {
    sb: sb,
    user: function(){ return sb.auth.getSession().then(function(r){ return r.data.session ? r.data.session.user : null; }); },
    login: function(email, back){ return sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: back || (location.origin + '/account.html') } }); },
    /* send a login link with a friendly wait timer, shared by the desk and the questions page */
    sendLink: function(email, back, btn, msg){
      var label = btn.textContent;
      function wait(sec, text){
        btn.disabled = true;
        (function tick(){
          if (sec <= 0){ btn.disabled = false; btn.textContent = label; return; }
          btn.textContent = 'send again in ' + sec + 's'; sec--; setTimeout(tick, 1000);
        })();
        msg.textContent = text;
      }
      btn.disabled = true; msg.textContent = 'sending…';
      return window.ffDesk.login(email, back).then(function(r){
        var e = r.error;
        if (!e) return wait(60, 'sent. check your inbox (and spam) for an email from fee fee. the link works on any device.');
        var m = /after (\d+) seconds?/i.exec(e.message || '');
        if (m) return wait(+m[1], 'a link is already on its way to ' + email + '. check your inbox and spam. you can ask for a new one in a moment.');
        btn.disabled = false;
        if (/rate limit/i.test(e.message || '')) { msg.textContent = 'too many links asked for in the last hour. use the last email we sent, or try again later.'; return; }
        msg.textContent = 'that did not work: ' + e.message;
      });
    },
    logout: function(){ return sb.auth.signOut(); },
    list: function(){ return sb.from('documents').select('id,kind,number,client,job,total,currency,status,created_at,updated_at').order('updated_at', { ascending: false }); },
    get: function(id){ return sb.from('documents').select('*').eq('id', id).single(); },
    save: function(doc){
      var row = { kind: doc.kind, number: doc.number || null, client: doc.client || null, job: doc.job || null,
                  total: doc.total || 0, currency: doc.currency || '€', data: doc.data || {}, updated_at: new Date().toISOString() };
      if (doc.status) row.status = doc.status;
      if (doc.id) return sb.from('documents').update(row).eq('id', doc.id).select('id').single();
      return sb.from('documents').insert(row).select('id').single();
    },
    status: function(id, status){ return sb.from('documents').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id); },
    remove: function(id){ return sb.from('documents').delete().eq('id', id); }
  };
})();
