/* fee fee. contracts: seven plain-language templates for freelance creatives.
   {key} is filled from the form; an empty field prints as a blank line to fill in by hand.
   Template, not legal advice. Reviewed text goes here when the legal check is done. */
(function(){
var C={
booking:{
 nl:{name:'boekingsbevestiging', title:'Boekingsbevestiging', other:'opdrachtgever', clauses:[
  ['De klus','Je boekt mij als {role} voor {job} op {dates}, op {location}. De dag begint om {calltime}.'],
  ['De fee','De fee is {fee}, excl. btw[, zoals in offerte {quote}]. Kosten zoals reizen, kit en assistenten worden gerekend zoals afgesproken in de offerte.'],
  ['Wat je krijgt','{deliver}. Alles wat extra is, offreer ik apart.'],
  ['Overwerk','Na de afgesproken lengte van de dag reken ik elk extra uur (of deel ervan) tegen 1/8 van mijn dagtarief.'],
  ['Verzetten of annuleren','Annuleren meer dan 7 dagen voor de eerste shootdag kost 50% van de fee. Binnen 7 dagen, of de datum verzetten binnen 48 uur, kost 100%. Kosten die al gemaakt zijn, worden altijd gerekend.'],
  ['Betaling','Ik factureer na de klus. Graag betalen binnen {pay} dagen.'],
  ['Gebruik','Je mag het werk gebruiken zoals beschreven in de offerte. Het gebruik gaat in zodra de factuur is betaald. Het auteursrecht blijft bij mij.'],
  ['Voorwaarden','Mijn algemene voorwaarden zijn van toepassing op deze boeking.']
 ]},
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
 nl:{name:'gebruik en licentie', title:'Licentie voor het gebruik van het werk', other:'opdrachtgever', clauses:[
  ['Waar dit over gaat','Ik geef je een licentie om {work} te gebruiken.'],
  ['Waar en hoe lang','Je mag het werk gebruiken voor {media}, in {territory}, voor {period}. Deze licentie is {excl}.'],
  ['Wanneer het ingaat','De licentie gaat in zodra de licentiefee van {fee} (excl. btw) is betaald.'],
  ['Auteursrecht','Het auteursrecht blijft bij mij. Je mag het werk niet verkopen of aan anderen doorgeven, tenzij we dat op papier afspreken.'],
  ['Wijzigingen en AI','Je mag het werk bijsnijden en verkleinen. Andere wijzigingen, en het werk gebruiken om AI te trainen of te voeden, vragen om mijn schriftelijke OK.'],
  ['Naamsvermelding','Vermeld het werk waar mogelijk als: {credit}.'],
  ['Meer gebruik','Wil je het werk langer, op meer plekken of in meer landen gebruiken? Vraag het eerst. Ik stuur een offerte voor het extra gebruik.'],
  ['Mijn portfolio','Ik mag het werk in mijn portfolio en op mijn eigen kanalen laten zien zodra het is gepubliceerd.']
 ]},
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
 nl:{name:'modelrelease', title:'Modelrelease', other:'model', clauses:[
  ['Waar je mee instemt','Je stemt ermee in dat foto\'s en video van jou, gemaakt op {shootdate} voor {project}, gebruikt mogen worden voor {use}, voor {period}.'],
  ['Wat je krijgt','{comp}.'],
  ['Wat we niet doen','Je beelden worden niet gebruikt op een manier die kwetsend is, of die suggereert dat je iets steunt wat je niet steunt. Je contactgegevens worden nooit gedeeld.'],
  ['Je privacy','Je mag vragen wat we van je bewaren, en ons vragen de beelden vanaf nu niet meer voor nieuwe dingen te gebruiken. Beelden die al gepubliceerd of gedrukt zijn, mogen in gebruik blijven.'],
  ['Jonger dan 18','Ben je jonger dan 18, dan tekent je ouder of voogd ook: {minor}.']
 ]},
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
 nl:{name:'locatierelease', title:'Locatierelease', other:'eigenaar', clauses:[
  ['De locatie','Je laat ons {address} gebruiken op {dates}, met {crew} mensen.'],
  ['De fee','De locatiefee is {fee}. We betalen binnen 14 dagen na de shoot.'],
  ['Wat mag','{allowed}. Voor al het andere vragen we het je eerst.'],
  ['Achterlaten zoals we het vonden','We laten de locatie achter zoals we hem aantroffen. Schade die wij veroorzaken, betalen wij, of onze verzekering.'],
  ['De beelden','De locatie mag op de beelden te zien zijn. De beelden mogen in alle media gebruikt worden, en je vraagt daar geen extra fee voor.'],
  ['Naamsvermelding','Wil je de locatie genoemd hebben? We vermelden hem waar dat kan.']
 ]},
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
 nl:{name:'crewovereenkomst', title:'Crewovereenkomst', other:'crewlid', clauses:[
  ['De klus','Ik boek je als {crewrole} voor {job} op {dates}. Een dag is {hours}.'],
  ['De fee','Je dagtarief is {rate}, excl. btw. Overwerk is 1/8 van het dagtarief per uur. Reizen en kosten zoals vooraf afgesproken.'],
  ['Betaling','Stuur me na de klus je factuur. Ik betaal binnen {pay} dagen.'],
  ['Annuleren','Annuleer ik binnen 48 uur voor de eerste dag, dan betaal ik 50% van je fee.'],
  ['Het werk','Wat je op deze klus maakt, is onderdeel van mijn werk voor mijn opdrachtgever. De rechten erop gaan naar mij, zodat ik mijn opdrachtgever het afgesproken gebruik kan geven.'],
  ['Vertrouwelijk','Deel geen beelden of details van de klus voordat de opdrachtgever ze heeft gepubliceerd.'],
  ['Je portfolio','Zodra het is gepubliceerd, mag je het werk in je portfolio laten zien, met credit voor het team.']
 ]},
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
 nl:{name:'geheimhouding (NDA)', title:'Geheimhoudingsovereenkomst', other:'andere partij', clauses:[
  ['Wat geheim is','Alles wat we delen over {about}: beelden, plannen, producten, namen en data.'],
  ['Wat we doen','We gebruiken het alleen voor deze klus. We delen het niet, posten het niet, en laten het aan niemand zien die het niet voor de klus nodig heeft.'],
  ['Hoe lang','Dit geldt tot {until}.'],
  ['Wat niet geheim is','Dingen die al openbaar zijn, of die we al wisten, vallen er niet onder.'],
  ['Na de lancering','Zodra het openbaar is, mag ik mijn eigen werk in mijn portfolio laten zien.'],
  ['Als het misgaat','Wie deze overeenkomst breekt, betaalt {penalty}, bovenop eventuele schade.']
 ]},
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
 nl:{name:'samenwerking', title:'Samenwerkingsovereenkomst', other:'samenwerkingspartner', clauses:[
  ['Het project','We werken samen aan {project}. Het team: {team}.'],
  ['Kosten','{costs}.'],
  ['Publiceren','We publiceren eerst: {publish}. Niemand post daarvoor, tenzij we het allemaal eens zijn.'],
  ['Het werk gebruiken','Na publicatie mag iedereen het werk gebruiken voor het eigen portfolio en social media, met credits.'],
  ['Credits','Vermeld altijd het hele team: {credits}.'],
  ['Verkopen of commercieel gebruik','Het werk verkopen, of gebruiken voor een merk, vraagt om de OK van iedereen. Een eventuele fee wordt eerlijk gedeeld.']
 ]},
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
