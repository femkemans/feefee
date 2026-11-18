/* fee fee. ready-made emails for quotes and invoices: send it, and a friendly reminder.
   Works from the saved document data (quote.html fields). Opens the member's own
   mail app with a mailto link: nothing is sent by fee fee, nothing leaves the browser. */
(function(){
  function nl(d){ return d && d.lang === 'nl'; }
  function money(x, d){
    var loc = nl(d) ? 'nl-NL' : 'en-GB';
    return (d.cur || '€') + ' ' + (Math.round((+x || 0) * 100) / 100).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function docDate(d){ return d.docdate ? new Date(d.docdate + 'T12:00:00') : new Date(); }
  function dueDate(d){ return new Date(docDate(d).getTime() + (parseInt(d.valid, 10) || 14) * 864e5); }
  function fmt(dt, d){ return dt.toLocaleDateString(nl(d) ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function total(d){ return d._grand != null ? d._grand : (d._sub || 0); }
  function first(d){ var c = (d.contact || '').trim(); return c ? c.split(/\s+/)[0] : ''; }
  function sender(d){ return [d.me, d.biz && d.biz !== d.me ? d.biz : ''].filter(Boolean).join('\n'); }
  function holder(d){ return [d.me, d.biz].filter(Boolean).join(' – '); }

  /* days late: 0 when not late (or not a sent invoice) */
  function late(doc){
    var d = doc.data || {};
    if (doc.kind !== 'invoice' || doc.status !== 'sent' || d.creditnote === '1') return 0;
    var today = new Date(); today.setHours(12, 0, 0, 0);
    var days = Math.floor((today - dueDate(d)) / 864e5);
    return days > 0 ? days : 0;
  }

  function send(d){
    var inv = d.kind === 'invoice', cr = inv && d.creditnote === '1', n = d.qno || '', job = d.job ? ' · ' + d.job : '';
    var hi = first(d), subject, body;
    if (nl(d)) {
      subject = (cr ? 'Creditnota ' : inv ? 'Factuur ' : 'Offerte ') + n + job;
      body = (hi ? 'Hoi ' + hi + ',' : 'Hoi,') + '\n\n' +
        (cr ? 'In de bijlage vind je creditnota ' + n + (d.ref ? ' voor factuur ' + d.ref : '') + '.'
         : inv ? 'In de bijlage vind je factuur ' + n + (d.job ? ' voor ' + d.job : '') + ', voor ' + money(total(d), d) + '.\n' +
                 'Graag overmaken vóór ' + fmt(dueDate(d), d) + (d.iban ? ' naar ' + d.iban : '') + (holder(d) ? ' t.n.v. ' + holder(d) : '') + ', met het factuurnummer erbij.'
         : 'In de bijlage vind je mijn offerte ' + n + (d.job ? ' voor ' + d.job : '') + '. Hij is geldig tot ' + fmt(dueDate(d), d) + '.\n' +
           'Akkoord? Dan is een korte bevestiging per mail genoeg. Vragen of iets aanpassen kan altijd.') +
        '\n\nDank je wel!\n\n' + sender(d);
    } else {
      subject = (cr ? 'Credit note ' : inv ? 'Invoice ' : 'Quote ') + n + job;
      body = (hi ? 'Hi ' + hi + ',' : 'Hi,') + '\n\n' +
        (cr ? 'Attached is credit note ' + n + (d.ref ? ' for invoice ' + d.ref : '') + '.'
         : inv ? 'Attached is invoice ' + n + (d.job ? ' for ' + d.job : '') + ', for ' + money(total(d), d) + '.\n' +
                 'Please transfer it before ' + fmt(dueDate(d), d) + (d.iban ? ' to ' + d.iban : '') + (holder(d) ? ' in the name of ' + holder(d) : '') + ', with the invoice number.'
         : 'Attached is my quote ' + n + (d.job ? ' for ' + d.job : '') + '. It is valid until ' + fmt(dueDate(d), d) + '.\n' +
           'Happy with it? A short confirmation by email is enough. Questions or changes are always welcome.') +
        '\n\nThank you!\n\n' + sender(d);
    }
    return { to: d.cemail || '', subject: subject, body: body };
  }

  function reminder(doc){
    var d = doc.data || {}, days = late(doc), n = d.qno || doc.number || '', hi = first(d), subject, body;
    if (nl(d)) {
      subject = 'Herinnering factuur ' + n + (d.job ? ' · ' + d.job : '');
      body = (hi ? 'Hoi ' + hi + ',' : 'Hoi,') + '\n\n' +
        'Een vriendelijke herinnering: factuur ' + n + (d.job ? ' voor ' + d.job : '') + ' (' + money(total(d), d) + ') stond open tot ' + fmt(dueDate(d), d) + '.' +
        ' Misschien is hij tussen de andere mail geglipt, dat gebeurt.\n\n' +
        'Wil je hem de komende dagen overmaken' + (d.iban ? ' naar ' + d.iban : '') + (holder(d) ? ' t.n.v. ' + holder(d) : '') + ', met het factuurnummer erbij? De factuur zit nog een keer in de bijlage.\n\n' +
        'Al betaald? Dan is deze mail niet nodig en zeg ik dank je wel!\n\n' + sender(d);
    } else {
      subject = 'Reminder: invoice ' + n + (d.job ? ' · ' + d.job : '');
      body = (hi ? 'Hi ' + hi + ',' : 'Hi,') + '\n\n' +
        'A friendly reminder: invoice ' + n + (d.job ? ' for ' + d.job : '') + ' (' + money(total(d), d) + ') was due on ' + fmt(dueDate(d), d) + '.' +
        ' Maybe it slipped through, that happens.\n\n' +
        'Could you transfer it in the next few days' + (d.iban ? ' to ' + d.iban : '') + (holder(d) ? ' in the name of ' + holder(d) : '') + ', with the invoice number? I have attached the invoice again.\n\n' +
        'Already paid? Then please ignore this, and thank you!\n\n' + sender(d);
    }
    return { to: d.cemail || '', subject: subject, body: body, days: days };
  }

  /* mailto link; only a plain email address goes in the "to" part */
  function href(m){
    var to = /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]+$/.test(m.to || '') ? m.to : '';
    return 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
  }

  window.ffMail = { send: send, reminder: reminder, late: late, due: dueDate, href: href, money: money };
})();
