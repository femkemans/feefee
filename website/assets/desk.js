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
    login: function(email){ return sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + '/account.html' } }); },
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
