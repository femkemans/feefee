/* fee fee. report: a small "report" link under answers and jobs.
   ffReport.link(kind, target) returns a button. Clicking it asks why, then stores a row
   in public.reports (supabase/admin.sql). Only femke sees reports, in the back office. */
(function(){
  var css = '.ffr{background:none;border:0;padding:0;margin:8px 0 0;font:11px "Space Mono",monospace;color:#8A8E86;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px}'
    + '.ffr:hover{color:#1C1E1A;text-decoration-color:#1F3FD1}.ffr:disabled{cursor:default;text-decoration:none}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  function link(kind, target){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ffr'; b.textContent = 'report';
    b.onclick = function(){
      var D = window.ffDesk; if (!D) return;
      var why = prompt('what is wrong with this ' + kind + '? femke reads every report.', '');
      if (why === null) return;
      b.disabled = true; b.textContent = 'sending…';
      D.sb.from('reports').insert({ kind: kind, target: String(target).slice(0, 120), reason: why.replace(/[<>]/g, '').trim().slice(0, 500) || null }).then(function(r){
        b.textContent = r.error ? 'couldn’t send. mail hello@feefee.co' : 'thanks. femke will look.';
      });
    };
    return b;
  }
  window.ffReport = { link: link };
})();
