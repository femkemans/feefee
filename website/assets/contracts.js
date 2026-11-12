/* fee fee. contracts: seven plain-language templates for freelance creatives.
   {key} is filled from the form; an empty field prints as a blank line to fill in by hand.
   Template, not legal advice. Reviewed text goes here when the legal check is done. */
(function(){
var C={
booking:{
 name:'booking confirmation', title:'Booking confirmation',
 when:'every job: dates, fee, what you do and what happens if it moves',
 other:'client',
 fields:[['job','job','SS27 lookbook'],['dates','shoot date(s)','12 and 13 March'],['calltime','call time and length of the day','08:00, 10 hours incl. lunch'],['location','location','studio, Amsterdam'],['fee','total fee (excl. vat)','€ 2.450'],['deliver','what I deliver','40 retouched images, high res'],['pay','pay within (days)','14'],['quote','quote number (optional)','Q-2027-004']],
 clauses:[
  ['The job','You book me as {role} for {job} on {dates}, at {location}. The day starts at {calltime}.'],
  ['The fee','The fee is {fee}, excl. vat[, as in quote {quote}]. Costs like travel, kit and assistants are charged as agreed in the quote.'],
  ['What you get','{deliver}. Anything extra is quoted separately.'],
  ['Overtime','After the agreed day length, every extra hour (or part of it) is charged at 1/8 of my day rate.'],
  ['Moving or cancelling','Cancelling more than 7 days before the first shoot day costs 50% of the fee. Within 7 days, or moving the date within 48 hours, costs 100%. Costs already made are always charged.'],
  ['Payment','I invoice after the job. Please pay within {pay} days.'],
  ['Usage','You may use the work as described in the quote. Usage starts once the invoice is paid. Copyright stays with me.'],
  ['Terms','My terms and conditions apply to this booking.', true]
 ]},
licence:{
 name:'usage and licence', title:'Licence to use the work',
 when:'where, how long and for what the client may use your work',
 other:'client',
 fields:[['work','the work','40 images from the SS27 lookbook shoot of 12 March'],['media','where','online, social media and in-store print'],['territory','which countries','the Netherlands and Belgium'],['period','for how long','12 months from first use'],['excl','exclusive?','not exclusive'],['fee','licence fee (excl. vat)','€ 800'],['credit','credit line','photo: your name']],
 clauses:[
  ['What this covers','I give you a licence to use {work}.'],
  ['Where and how long','You may use the work for {media}, in {territory}, for {period}. This licence is {excl}.'],
  ['When it starts','The licence starts once the licence fee of {fee} (excl. vat) is paid.'],
  ['Copyright','Copyright stays with me. You may not sell or pass the work on to others, unless we agree that in writing.'],
  ['Changes and AI','You may crop and resize the work. Other changes, and using the work to train or feed AI, need my written OK.'],
  ['Credit','Where possible, credit the work as: {credit}.'],
  ['More use','Want to use the work longer, in more places or in more countries? Ask first. I send a quote for the extra use.'],
  ['My portfolio','I may show the work in my portfolio and on my own channels once it is published.', true]
 ]},
model:{
 name:'model release', title:'Model release',
 when:'someone recognisable is in the images',
 other:'model',
 fields:[['shootdate','shoot date','12 March 2027'],['project','project','SS27 lookbook'],['use','where the images may be used','online, social media and print, for the client of this shoot'],['period','for how long','5 years'],['comp','what the model receives','€ 300 and 10 images for their own portfolio'],['minor','under 18? name of parent or guardian','']],
 clauses:[
  ['What you agree to','You agree that images and video of you, made on {shootdate} for {project}, may be used for {use}, for {period}.'],
  ['What you receive','{comp}.'],
  ['What we will not do','Your images will not be used in a way that is offensive, or that suggests you support something you do not. Your contact details are never shared.'],
  ['Your privacy','You may ask what we keep about you, and ask us not to use the images for new things from now on. Images that are already published or printed may stay in use.'],
  ['Under 18','If you are under 18, your parent or guardian signs this too: {minor}.', true]
 ]},
location:{
 name:'location release', title:'Location release',
 when:'you shoot at someone else\'s place',
 other:'owner',
 fields:[['address','address of the location','Keizersgracht 1, Amsterdam'],['dates','dates and times','12 March, 07:00 to 20:00'],['crew','how many people','about 12'],['fee','location fee','€ 600 per day'],['allowed','what is allowed','moving furniture (put back after), lights, a small catering corner']],
 clauses:[
  ['The location','You let us use {address} on {dates}, with {crew} people.'],
  ['The fee','The location fee is {fee}. We pay it within 14 days after the shoot.'],
  ['What is allowed','{allowed}. Anything else, we ask you first.'],
  ['Leaving it as we found it','We leave the location as we found it. Damage caused by us is paid by us, or by our insurance.'],
  ['The images','The location may be seen in the images. The images may be used in all media, and you will not ask for an extra fee for that.'],
  ['Credit','Want the location named? We credit it where we can.', true]
 ]},
crew:{
 name:'crew agreement', title:'Crew agreement',
 when:'you hire an assistant or another creative',
 other:'crew member',
 fields:[['crewrole','their role','photo assistant'],['job','job','SS27 lookbook'],['dates','dates','12 and 13 March'],['rate','day rate (excl. vat)','€ 250'],['hours','length of the day','10 hours incl. lunch'],['pay','I pay within (days)','30']],
 clauses:[
  ['The job','I book you as {crewrole} for {job} on {dates}. A day is {hours}.'],
  ['The fee','Your day rate is {rate}, excl. vat. Overtime is 1/8 of the day rate per hour. Travel and costs as agreed before the job.'],
  ['Payment','Send me your invoice after the job. I pay within {pay} days.'],
  ['Cancelling','If I cancel within 48 hours of the first day, I pay 50% of your fee.'],
  ['The work','What you make on this job is part of my work for my client. The rights to it go to me, so I can give my client the agreed use.'],
  ['Confidential','Do not share images or details of the job until the client has published them.'],
  ['Your portfolio','Once it is published, you may show the work in your portfolio, with credit to the team.', true]
 ]},
nda:{
 name:'confidentiality (NDA)', title:'Confidentiality agreement',
 when:'work that can\'t be shared yet',
 other:'other party',
 fields:[['about','what it is about','the SS27 collection and campaign'],['until','secret until','the public launch, or 1 September 2027 at the latest'],['penalty','fine for breaking it (optional)','']],
 clauses:[
  ['What is secret','Everything we share about {about}: images, plans, products, names and dates.'],
  ['What we do','We use it only for this job. We do not share it, post it, or show it to anyone who does not need it for the job.'],
  ['How long','This lasts until {until}.'],
  ['What is not secret','Things that are already public, or that we knew before, are not covered.'],
  ['After the launch','Once it is public, I may show my own work in my portfolio.'],
  ['If it goes wrong','Breaking this agreement costs {penalty}, on top of any damage.', true]
 ]},
collab:{
 name:'collaboration', title:'Collaboration agreement',
 when:'own projects and editorials: credits, and who may use what',
 other:'collaborator',
 fields:[['project','project','an editorial for an online magazine'],['team','who does what','photo, styling, hair and make-up, model'],['costs','costs and who pays','everyone pays their own costs. studio split four ways'],['publish','where it is published first','to be pitched to magazines'],['credits','how to credit everyone','name + role, tagged on instagram']],
 clauses:[
  ['The project','We work together on {project}. The team: {team}.'],
  ['Costs','{costs}.'],
  ['Publishing','We publish first: {publish}. Nobody posts before that, unless we all agree.'],
  ['Using the work','After publication, everyone may use the work for their own portfolio and social media, with credits.'],
  ['Credits','Always credit the whole team: {credits}.'],
  ['Selling or commercial use','Selling the work, or using it for a brand, needs the OK of everyone. Any fee is shared fairly.']
 ]}
};
window.ffContracts=C;
})();
