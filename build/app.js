const DATA = __DATA__;
const RO_BASE = __RO__;
const I18N_RU = __RU__;   // static page text: normalised English HTML -> Russian HTML
const $ = s => document.querySelector(s);
let lang = 'en';
try { const v = localStorage.getItem('mgs-lang'); if (v === 'ru' || v === 'en') lang = v; } catch (e) {}
const T = (en, ru) => lang === 'ru' ? ru : en;
const LOC = () => lang === 'ru' ? 'ru-RU' : 'en-GB';
const fmt = (n,d=0) => n.toLocaleString(LOC(),{minimumFractionDigits:d,maximumFractionDigits:d});
const plural = (n, en1, enN, ru1, ru2, ru5) => { if (lang !== 'ru') return n === 1 ? en1 : enN;
  const a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? ru5 : b === 1 ? ru1 : (b >= 2 && b <= 4) ? ru2 : ru5; };
const TODAY = '2026-11-12';
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs={}, parent) => { const e=document.createElementNS(SVGNS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; };

/* ================= static text translation ================= */
// Containers filled by script are translated in code with T(); everything else is matched by its English HTML.
const DYNAMIC = ['rStats','rNote','rBars','rDay','rDayTitle','rankBody','detail','result','map','shapeSummer','shapeWinter','eqSum','eqFlags','eqBody','eqDocs','eqSiteNote','eqSite','pSteps','pCtx','liveText','chipLatest','o1','o2','o3','eqCopyMsg'];
const INLINE = new Set(['A','B','I','EM','STRONG','SMALL','SUP','SUB','BR','CODE','SPAN']);
const norm = s => s.replace(/\s+/g,' ').trim();
let I18N_NODES = null;
function isDynamic(n){ for (let p=n; p; p=p.parentElement) { if (p.id && DYNAMIC.includes(p.id)) return true; if (p.tagName==='SCRIPT'||p.tagName==='STYLE'||p.tagName==='TITLE') return true; } return false; }
function inlineOnly(e){ for (const c of e.querySelectorAll('*')) { if (!INLINE.has(c.tagName)) return false; } return true; }
function collectI18n(){
  const roots = [document.querySelector('.wrap')]; const nodes = [];
  const walk = e => {
    if (isDynamic(e)) return;
    const hasText = norm(e.textContent) !== '';
    const dynInside = DYNAMIC.some(id => { const x = document.getElementById(id); return x && x !== e && e.contains(x); });
    if (hasText && !dynInside && e.tagName !== 'svg' && inlineOnly(e) && !['SELECT','TEXTAREA','INPUT'].includes(e.tagName)) { nodes.push({e, en: e.innerHTML, key: norm(e.innerHTML)}); return; }
    for (const c of [...e.childNodes]) {
      if (c.nodeType === 3 && norm(c.nodeValue) !== '' ) { const w = document.createElement('span'); w.className='i18n'; c.replaceWith(w); w.appendChild(c); nodes.push({e:w, en:w.innerHTML, key:norm(w.innerHTML)}); }
      else if (c.nodeType === 1 && c.tagName !== 'svg') walk(c);
    }
  };
  roots.forEach(walk);
  document.querySelectorAll('.wrap [aria-label], .wrap [placeholder]').forEach(e => { if (isDynamic(e)) return;
    ['aria-label','placeholder'].forEach(a => { if (e.hasAttribute(a)) nodes.push({e, attr:a, en:e.getAttribute(a), key:norm(e.getAttribute(a))}); }); });
  return nodes;
}
function applyStatic(){
  if (!I18N_NODES) I18N_NODES = collectI18n();
  for (const n of I18N_NODES) { const ru = I18N_RU[n.key]; const v = (lang === 'ru' && ru != null) ? n.en.match(/^\s*/)[0] + ru + n.en.match(/\s*$/)[0] : n.en;
    if (n.attr) n.e.setAttribute(n.attr, v); else if (n.e.innerHTML !== v) n.e.innerHTML = v; }
  document.documentElement.lang = lang;
  document.querySelectorAll('.langsw button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}
window.__i18nKeys = () => { I18N_NODES = I18N_NODES || collectI18n(); return [...new Set(I18N_NODES.map(n=>n.key))]; };

/* ---- price shape bars ---- */
function shape(id, bands){
  const s=$(id), x0=90, x1=350, max=220, X=v=>x0+(v/max)*(x1-x0); s.innerHTML='';
  [0,50,100,150,200].forEach(v=>{ el('line',{x1:X(v),x2:X(v),y1:14,y2:134,stroke:'var(--line)','stroke-width':1},s);
    const t=el('text',{x:X(v),y:152,'text-anchor':'middle','font-size':11,fill:'var(--muted)'},s); t.textContent=v; });
  const t=el('text',{x:x1,y:167,'text-anchor':'end','font-size':10.5,fill:'var(--muted)'},s); t.textContent=T('€/MWh','€/МВт·ч');
  bands.forEach((b,i)=>{ const y=30+i*52;
    const l=el('text',{x:0,y:y+15,'font-size':12.5,fill:'var(--ink)'},s); l.textContent=b.label;
    el('rect',{x:X(b.lo),y:y,width:Math.max(4,X(b.hi)-X(b.lo)),height:22,rx:3,fill:b.color},s);
    const v=el('text',{x:X(b.hi)+6,y:y+15,'font-size':11.5,fill:'var(--muted)','font-family':'IBM Plex Mono, monospace'},s); v.textContent=b.txt||`${b.lo}–${b.hi}`;
  });
}
function drawShapes(){
  shape('#shapeSummer',[{label:T('Midday','Полдень'),lo:0,hi:25,color:'var(--solar)'},{label:T('Peak','Пик'),lo:100,hi:200,color:'var(--accent)'}]);
  shape('#shapeWinter',[{label:T('Off-peak','Вне пика'),lo:97,hi:103,txt:'~100',color:'var(--muted)'},{label:T('Peak','Пик'),lo:150,hi:200,color:'var(--accent)'}]);
}

/* ---- district features ---- */
const R = 6371, rad = d => d*Math.PI/180;
const hav = (a,b) => { const dLa=rad(b[0]-a[0]), dLo=rad(b[1]-a[1]); const h=Math.sin(dLa/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const rightBank = DATA.nodes.filter(n=>!['mgr','rib'].includes(n.id));
const dist = {};
DATA.rows.forEach(r=>{
  const d = dist[r.district] ??= {key:r.district, ...DATA.districts[r.district], rows:[], mw:0, solar:0, wind:0, storageMW:0, thermal:0, vreNoStore:0, vre:0};
  r.lb = /MGRES|CERS Moldoveneasca|Bender|Ribnita/.test(r.point);
  d.rows.push(r); d.mw += r.mw; d.lbMW = (d.lbMW||0) + (r.lb ? r.mw : 0);
  const kinds = [r.solar&&'solar', r.wind&&'wind', r.thermal&&'thermal'].filter(Boolean);
  const share = kinds.length ? r.mw/kinds.length : 0;   // mixed permits split evenly across their generation types, for the mix bar only
  kinds.forEach(k=>d[k]+=share);
  if(!kinds.length && r.storage) d.storageMW += r.mw;  // pure storage permits; co-located storage size is not stated in the register
  if(r.solar||r.wind){ d.vre += r.mw; if(!r.storage) d.vreNoStore += r.mw; }
});
const D = Object.values(dist);
D.forEach(d=>{ let best=null; rightBank.forEach(n=>{ const k=hav(d.ll,n.ll); if(!best||k<best.km) best={km:k,node:n}; }); d.nearest=best; d.coLocated=d.rows.filter(r=>r.storage&&(r.solar||r.wind)).length; d.expired=d.rows.filter(r=>r.expiry<TODAY).length; });
const regionName = r => T(r, {North:'Север',Centre:'Центр',South:'Юг'}[r]||r);
const pct = (arr, v, inverse=false) => { // percentile rank 0..1, ties averaged
  const below=arr.filter(x=>inverse? x>v : x<v).length, eq=arr.filter(x=>x===v).length; return (below+ (eq-1)/2)/(arr.length-1); };
function score(){
  const w=[+$('#w1').value,+$('#w2').value,+$('#w3').value], sw=w.reduce((a,b)=>a+b,0)||1;
  const mws=D.map(d=>d.mw), gaps=D.map(d=>d.vreNoStore), kms=D.map(d=>d.nearest.km);
  D.forEach(d=>{ d.p=[pct(mws,d.mw), pct(gaps,d.vreNoStore), pct(kms,d.nearest.km,true)]; d.score=100*(d.p[0]*w[0]+d.p[1]*w[1]+d.p[2]*w[2])/sw; d.fits=fits(d); });
  D.sort((a,b)=>b.score-a.score||b.mw-a.mw);
}
/* Opportunity rules, applied in order; a district can match several */
function fits(d){
  const f=[];
  if(d.vre>=20 && d.vreNoStore>=10) f.push({c:'bess',t:T('BESS beside renewables','СНЭЭ рядом с ВИЭ'),why:T(`${fmt(d.vreNoStore,1)} MW of solar/wind permits here have no storage attached, so a co-located battery could absorb midday or windy-hour surplus.`,`${fmt(d.vreNoStore,1)} МВт разрешений на солнце/ветер здесь без накопителя, поэтому батарея рядом могла бы забирать избыток в полдень или в ветреные часы.`)});
  if(d.nearest.km<=15) f.push({c:'node',t:T('Grid-scale BESS','Сетевая СНЭЭ'),why:T(`The seat is ${fmt(d.nearest.km,0)} km from the ${d.nearest.node.name} ${d.nearest.node.kv} kV node, a strong point for a balancing battery (aFRR/mFRR) and peak shaving.`,`Райцентр в ${fmt(d.nearest.km,0)} км от узла ${d.nearest.node.name} ${d.nearest.node.kv} кВ: сильная точка сети для балансирующей батареи (aFRR/mFRR) и срезания пиков.`)});
  if(d.solar>=10) f.push({c:'load',t:T('Daytime flexible load','Гибкая дневная нагрузка'),why:T(`${fmt(d.solar,1)} MW of solar is queued. Load that can shift into 10:00–17:00 would buy at the low midday prices.`,`В очереди ${fmt(d.solar,1)} МВт солнца. Нагрузка, которую можно сдвинуть на 10:00–17:00, покупала бы по низким дневным ценам.`)});
  if(!f.length) f.push({c:'watch',t:T('Watch','Наблюдать'),why:T('Too little is queued here to point to a clear asset. Keep it on the watch list.','Здесь слишком мало в очереди, чтобы указать на конкретный актив. Оставьте в списке наблюдения.')});
  return f;
}
/* ---- ramp ---- */
const rampVar = s => s>=75?'var(--ramp3)':s>=50?'var(--ramp2)':s>=25?'var(--ramp1)':'var(--ramp0)';

/* ---- map ---- */
const map=$('#map'); map.setAttribute('viewBox','-50 0 600 690');
el('path',{d:DATA.outline,fill:'var(--accent-soft)',stroke:'var(--muted)','stroke-width':1.1,'stroke-linejoin':'round'},map);
const N = Object.fromEntries(DATA.nodes.map(n=>[n.id,n.xy]));
const link=(a,b,dash,label,anchor)=>{ el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'var(--accent)','stroke-width':3,'stroke-dasharray':dash?'7 6':'none','stroke-linecap':'round',opacity:.9},map);
  if(label){ const t=el('text',{x:b[0]+(anchor==='below'?-4:6),y:b[1]+(anchor==='below'?18:4),'font-size':12,'text-anchor':'start',fill:'var(--muted)'},map); t.textContent=label; el('circle',{cx:b[0],cy:b[1],r:3.5,fill:'var(--accent)'},map);} };
link(N.vul,DATA.ext.isa,false,'Isaccea (RO)');
link(N.vul,N.chi,false);
link(N.bal,DATA.ext.suc,true,'Suceava (RO) 2027','below');
link(N.str,DATA.ext.gut,true,'Gutinaș (RO) 2029','below');
DATA.nodes.forEach(n=>{ const g=el('g',{},map); const left=['mgr','rib'].includes(n.id);
  el('rect',{x:n.xy[0]-5,y:n.xy[1]-5,width:10,height:10,transform:`rotate(45 ${n.xy[0]} ${n.xy[1]})`,fill:left?'var(--muted)':'var(--ink)'},g);
  const t=el('text',{x:n.xy[0]+9,y:n.xy[1]-7,'font-size':11.5,'font-weight':600,fill:left?'var(--muted)':'var(--ink)'},g); t.textContent=n.name; });
const dotLayer=el('g',{},map), labelLayer=el('g',{'pointer-events':'none'},map);
let selected=null;
function drawMap(){
  map.setAttribute('aria-label', T('Map of Moldova with districts sized by permitted MW','Карта Молдовы: районы по объёму разрешённых МВт'));
  dotLayer.innerHTML=''; labelLayer.innerHTML='';
  [...D].sort((a,b)=>b.mw-a.mw).forEach(d=>{
    const r=4+Math.sqrt(d.mw)*1.7;
    const c=el('circle',{cx:d.xy[0],cy:d.xy[1],r,fill:rampVar(d.score),'fill-opacity':.88,stroke:d.key===selected?'var(--ink)':'var(--panel)','stroke-width':d.key===selected?3:1.5,class:'district-dot',tabindex:0,role:'button','aria-label':T(`${d.name}: score ${Math.round(d.score)}, ${fmt(d.mw,1)} MW permitted`,`${d.name}: балл ${Math.round(d.score)}, разрешено ${fmt(d.mw,1)} МВт`)},dotLayer);
    const tt=el('title',{},c); tt.textContent=T(`${d.name} · ${fmt(d.mw,1)} MW · score ${Math.round(d.score)}`,`${d.name} · ${fmt(d.mw,1)} МВт · балл ${Math.round(d.score)}`);
    c.addEventListener('click',()=>select(d.key)); c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(d.key);}});
    if((d.mw>=40&&!['Balti','Straseni','Chisinau'].includes(d.key))||d.key===selected){ const t=el('text',{x:d.xy[0],y:d.xy[1]+r+13,'text-anchor':'middle','font-size':12,'font-weight':600,fill:'var(--ink)',stroke:'var(--panel)','stroke-width':3,'paint-order':'stroke'},labelLayer); t.textContent=d.name; }
  });
}
/* ---- ranking table ---- */
function mixBar(d){ const tot=d.solar+d.wind+d.thermal+d.storageMW||1;
  return `<span class="mix" title="${T('solar','солнце')} ${fmt(d.solar,1)} · ${T('wind','ветер')} ${fmt(d.wind,1)} · ${T('storage-only','только накопители')} ${fmt(d.storageMW,1)} · ${T('thermal','тепловые')} ${fmt(d.thermal,1)} ${T('MW','МВт')}">${[['solar','--solar'],['wind','--wind'],['storageMW','--storage'],['thermal','--thermal']].map(([k,c])=>`<i style="width:${100*d[k]/tot}%;background:var(${c})"></i>`).join('')}</span>`; }
function drawRank(){
  $('#rankBody').innerHTML = D.filter(d=>!southOnly||d.region==='South').map(d=>`<tr tabindex="0" data-k="${d.key}" class="${d.key===selected?'sel':''}">
    <td>${d.name}<div class="label-note">${regionName(d.region)}</div></td>
    <td><span class="scorebar"><i style="width:${Math.max(2,d.score*0.6)}px"></i><span class="num">${Math.round(d.score)}</span></span></td>
    <td class="r num">${fmt(d.mw,1)}</td><td>${mixBar(d)}</td>
    <td><span class="fit ${d.fits[0].c}">${d.fits[0].t}</span>${d.fits.length>1?` <span class="label-note">+${d.fits.length-1}</span>`:''}</td></tr>`).join('');
  document.querySelectorAll('#rankBody tr').forEach(tr=>{ tr.addEventListener('click',()=>select(tr.dataset.k)); tr.addEventListener('keydown',e=>{if(e.key==='Enter'){select(tr.dataset.k);}}); });
}
/* ---- detail ---- */
const tags = r => `${r.solar?`<span class="tag s">${T('solar','солнце')}</span>`:''}${r.wind?`<span class="tag w">${T('wind','ветер')}</span>`:''}${r.storage?`<span class="tag b">${T('storage','накопитель')}</span>`:''}${r.thermal?'<span class="tag t">'+(r.type.startsWith('Motoare')?T('gas engines','газопоршневые'):T('CHP','ТЭЦ'))+'</span>':''}${r.lb?`<span class="tag lb" title="${T('Connection point names a substation in the Transnistrian region','Точка подключения называет подстанцию в Приднестровском регионе')}">${T('via MGRES/Bender','через МГРЭС/Бендеры')}</span>`:''}`;
function drawDetail(){
  const d=D.find(x=>x.key===selected); const rank=D.indexOf(d)+1;
  const pv = p => T(`${Math.round(p*100)}th pct`,`${Math.round(p*100)}-й перцентиль`);
  const nP = d.rows.length;
  $('#detail').innerHTML = `
  <div class="dhead"><div><span class="eyebrow">${T('District card','Карточка района')} · ${regionName(d.region)} · ${T(`rank ${rank} of ${D.length}`,`место ${rank} из ${D.length}`)}</span><h2>${d.name}</h2></div>
    <div class="result"><span class="big">${Math.round(d.score)}<small> / 100</small></span></div></div>
  <div class="feats">
    <div class="feat"><span class="label-note">${T('Permitted MW queued','Разрешённые МВт в очереди')}</span><span class="v">${fmt(d.mw,1)} ${T('MW','МВт')}</span><span class="p">${nP} ${plural(nP,'permit','permits','разрешение','разрешения','разрешений')} · ${pv(d.p[0])}</span></div>
    <div class="feat"><span class="label-note">${T('Solar/wind MW without storage','МВт солнца/ветра без накопителя')}</span><span class="v">${fmt(d.vreNoStore,1)} ${T('MW','МВт')}</span><span class="p">${T(`of ${fmt(d.vre,1)} MW solar/wind`,`из ${fmt(d.vre,1)} МВт солнца/ветра`)} · ${pv(d.p[1])}</span></div>
    <div class="feat"><span class="label-note">${T('Nearest 330/400 kV node','Ближайший узел 330/400 кВ')}</span><span class="v">${fmt(d.nearest.km,0)} ${T('km','км')}</span><span class="p">${d.nearest.node.name} · ${pv(d.p[2])}</span></div>
    <div class="feat"><span class="label-note">${T('Through MGRES or Bender lines','Через линии МГРЭС или Бендер')}</span><span class="v">${fmt(d.lbMW||0,1)} ${T('MW','МВт')}</span><span class="p">${d.mw?Math.round(100*(d.lbMW||0)/d.mw):0}% ${T('of permitted MW','разрешённых МВт')}</span></div>
    <div class="feat"><span class="label-note">${T('Storage in the queue','Накопители в очереди')}</span><span class="v">${fmt(d.storageMW,1)} ${T('MW','МВт')}</span><span class="p">${T(`standalone, plus ${d.coLocated} co-located ${d.coLocated===1?'permit':'permits'} of unstated size`,`автономные, плюс совмещённых разрешений неуказанного размера: ${d.coLocated}`)}</span></div>
  </div>
  ${d.fits.map(f=>`<div class="why"><span class="fit ${f.c}">${f.t}</span> ${f.why}</div>`).join('')}
  ${d.expired?`<p class="label-note"><span class="exp">${T(`${d.expired} ${d.expired>1?'permits':'permit'} past expiry`,`Истёк срок: ${d.expired} ${plural(d.expired,'','','разрешение','разрешения','разрешений')}`)}</span> ${T("on today's date. They are still counted, because the register predates their expiry and may since have been extended.",'на сегодняшнюю дату. Они учитываются, так как реестр составлен до истечения срока и разрешения могли быть продлены.')}</p>`:''}
  <div class="tablewrap"><table class="permits"><thead><tr><th>#</th><th>${T('Connection point','Точка подключения')}</th><th>${T('Type','Тип')}</th><th class="r">${T('MW','МВт')}</th><th>${T('Holder','Владелец')}</th><th>${T('Valid to','Действует до')}</th></tr></thead><tbody>
  ${[...d.rows].sort((a,b)=>b.mw-a.mw).map(r=>`<tr><td class="num">${r.nr}</td><td>${r.point}</td><td>${tags(r)}</td><td class="r num">${fmt(r.mw,1)}</td><td>${r.applicant}</td><td class="num ${r.expiry<TODAY?'exp':''}">${r.expiry}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="label-note">${T('Source:','Источник:')} <a href="#src-reg">${T('Moldelectrica permit register, 14 Aug 2026','реестр разрешений Moldelectrica, 14.08.2026')}</a>. ${T('Permits are as filed; MW is the permitted connection capacity.','Разрешения приведены как поданы; МВт — разрешённая мощность подключения. Точки подключения — на румынском, как в реестре.')}</p>`;
}
let southOnly=false;
function setFilter(s){ southOnly=s; $('#fAll').setAttribute('aria-pressed',String(!s)); $('#fSouth').setAttribute('aria-pressed',String(s)); if(s && D.find(d=>d.key===selected)?.region!=='South'){ selected=D.find(d=>d.region==='South').key; drawMap(); drawDetail(); } drawRank(); }
function select(k){ selected=k; drawMap(); drawRank(); drawDetail(); }
function refresh(){ ['1','2','3'].forEach(i=>$('#o'+i).textContent=$('#w'+i).value); score(); if(!selected) selected=D[0].key; drawMap(); drawRank(); drawDetail(); }
['#w1','#w2','#w3'].forEach(s=>$(s).addEventListener('input',refresh));
$('#fAll').addEventListener('click',()=>setFilter(false)); $('#fSouth').addEventListener('click',()=>setFilter(true));

/* ---- realised spread (Romanian day-ahead, 15 min) ---- */
const RO = new Map(RO_BASE.map(x=>[x.date,{...x,src:'stored'}]));
const tzDayStart = date => { // unix seconds of local midnight in Chișinău; DST-aware via Intl
  const [y,m,d]=date.split('-').map(Number); let guess=Date.UTC(y,m-1,d)/1000-3*3600;
  for(let k=0;k<3;k++){ const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Chisinau',hour:'2-digit',minute:'2-digit',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess*1000));
    const g=t=>+p.find(x=>x.type===t).value; const local=Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'))/1000; guess+= (Date.UTC(y,m-1,d)/1000-local); }
  return guess; };
const validDay = x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Array.isArray(x.p) && x.p.length>=92 && x.p.length<=100 && x.p.every(v=>typeof v==='number'&&isFinite(v)) && x.u===tzDayStart(x.date) && x.p.length===Math.round((tzDayStart(nextDate(x.date))-x.u)/900);
function nextDate(d){ const t=new Date(d+'T12:00:00Z'); t.setUTCDate(t.getUTCDate()+1); return t.toISOString().slice(0,10); }
function bestCycle(p,hours,rte){ const n=hours*4, ps=[0]; p.forEach(v=>ps.push(ps[ps.length-1]+v)); const avg=i=>(ps[i+n]-ps[i])/n;
  let best={m:0,c:-1,d:-1}, minC=Infinity, minI=-1;
  for(let j=n;j+n<=p.length;j++){ const a=avg(j-n); if(a<minC){minC=a;minI=j-n;} const m=hours*avg(j)-(hours/rte)*minC; if(m>best.m) best={m,c:minI,d:j}; }
  return best; }
let rSel=null;
function rDays(){ return [...RO.values()].sort((a,b)=>a.date<b.date?-1:1); }
function hhmm(q){ const h=Math.floor(q/4), m=(q%4)*15; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function renderRealised(){
  const hours=+$('#rDur').value, rte=Math.min(1,Math.max(0.5,(parseFloat($('#rte').value)||85)/100)), win=+$('#rWin').value;
  const all=rDays(); if(!all.length) return;
  const days=all.slice(-win).map(x=>({...x,c:bestCycle(x.p,hours,rte)}));
  const ms=days.map(d=>d.c.m), mean=ms.reduce((a,b)=>a+b,0)/ms.length, last=days[days.length-1];
  const capex=parseFloat($('#capex').value), opex=parseFloat($('#opex').value)||0, annual=mean*365;
  const pay = isFinite(capex)&&capex>0 && annual-opex>0 ? fmt(capex/(annual-opex),1)+T(' yrs',' лет') : T('n/a','н/д');
  $('#chipLatest').textContent=T('to ','по ')+new Date(last.date+'T12:00:00Z').toLocaleDateString(LOC(),{day:'numeric',month:'short',year:'numeric'});
  $('#rStats').innerHTML=`
    <div class="rstat"><span class="l">${T('Latest day','Последний день')} (${last.date})</span><span class="v">€${fmt(last.c.m,0)}</span><span class="l">${T('per MW, one cycle','на МВт, один цикл')}</span></div>
    <div class="rstat"><span class="l">${T(`Average over ${days.length} days`,`Среднее за ${days.length} ${plural(days.length,'','','день','дня','дней')}`)}</span><span class="v">€${fmt(mean,0)}</span><span class="l">${T('per MW per day','на МВт в день')}</span></div>
    <div class="rstat"><span class="l">${T('If every day were like this','Если бы так было каждый день')}</span><span class="v">€${fmt(annual/1000,0)}${T('k',' тыс.')}</span><span class="l">${T('per MW per year','на МВт в год')}</span></div>
    <div class="rstat"><span class="l">${T('Simple payback at your capex','Простая окупаемость при ваших капзатратах')}</span><span class="v">${pay}</span><span class="l">${T('capex and opex from the calculator below','капзатраты и опекс из калькулятора ниже')}</span></div>`;
  const spreads=days.map(d=>Math.max(...d.p)-Math.min(...d.p)), avgSpread=fmt(spreads.reduce((a,b)=>a+b,0)/spreads.length,0);
  $('#rNote').textContent=T(`${hours} h battery, ${Math.round(rte*100)}% round trip. Daily max–min price gap averaged €${avgSpread}/MWh. One season scaled to a year is not a forecast: spring and summer middays add a solar trough that autumn lacks. Network tariffs, degradation and balancing revenue are not included.`,
    `Батарея ${hours} ч, КПД цикла ${Math.round(rte*100)}%. Средний дневной разрыв между максимумом и минимумом цены — €${avgSpread}/МВт·ч. Один сезон, пересчитанный на год, — не прогноз: весной и летом добавляется полуденный солнечный провал, которого нет осенью. Сетевые тарифы, деградация и доход от балансирования не учтены.`);
  // bars
  const s=$('#rBars'); s.innerHTML=''; s.setAttribute('aria-label',T('Daily arbitrage margin per MW','Дневная маржа арбитража на МВт'));
  const W=560,H=200,L=44,B=24,TP=10, max=Math.max(...ms,1)*1.1, bw=(W-L-8)/days.length;
  const Y=v=>TP+(H-TP-B)*(1-v/max);
  const step=max>800?400:max>400?200:100; const tick=[]; for(let v=0;v<=max;v+=step) tick.push(v);
  tick.forEach(v=>{ el('line',{x1:L,x2:W-4,y1:Y(v),y2:Y(v),stroke:'var(--line)'},s); const t=el('text',{x:L-6,y:Y(v)+4,'text-anchor':'end','font-size':11,fill:'var(--muted)'},s); t.textContent=fmt(v,0); });
  const sel = rSel && days.find(d=>d.date===rSel) ? rSel : last.date;
  days.forEach((d,i)=>{ const r=el('rect',{x:L+i*bw+1,y:Y(d.c.m),width:Math.max(1,bw-2),height:Math.max(0,Y(0)-Y(d.c.m)),rx:1.5,fill:d.date===sel?'var(--accent)':'var(--ramp1)',style:'cursor:pointer',tabindex:0,role:'button','aria-label':`${d.date}: €${fmt(d.c.m,0)} ${T('per MW','на МВт')}`},s);
    const tt=el('title',{},r); tt.textContent=`${d.date}: €${fmt(d.c.m,0)}/${T('MW','МВт')}`;
    r.addEventListener('click',()=>{rSel=d.date;renderRealised();}); r.addEventListener('keydown',e=>{if(e.key==='Enter'){rSel=d.date;renderRealised();}}); });
  [0,days.length-1].forEach(i=>{ const t=el('text',{x:L+i*bw+bw/2,y:H-6,'text-anchor':i?'end':'start','font-size':11,fill:'var(--muted)'},s); t.textContent=days[i].date.slice(5); });
  // day profile
  const d=days.find(x=>x.date===sel), p=d.p, q=$('#rDay'); q.innerHTML='';
  q.setAttribute('aria-label',T('15-minute prices of the selected day with charge and discharge windows','15-минутные цены выбранного дня с окнами заряда и разряда'));
  $('#rDayTitle').textContent = T(`15-minute prices, ${d.date} (€/MWh)`,`15-минутные цены, ${d.date} (€/МВт·ч)`) + (d.c.c>=0 ? T(` · charge ${hhmm(d.c.c)}–${hhmm(d.c.c+hours*4)}, discharge ${hhmm(d.c.d)}–${hhmm(d.c.d+hours*4)}, €${fmt(d.c.m,0)}/MW`,` · заряд ${hhmm(d.c.c)}–${hhmm(d.c.c+hours*4)}, разряд ${hhmm(d.c.d)}–${hhmm(d.c.d+hours*4)}, €${fmt(d.c.m,0)}/МВт`) : '');
  const pmin=Math.min(0,Math.floor(Math.min(...p)/50)*50), pmax=Math.ceil(Math.max(...p)/50)*50, X=i=>L+(W-L-8)*i/(p.length), Yp=v=>TP+(H-TP-B)*(1-(v-pmin)/(pmax-pmin));
  if(d.c.c>=0){ const n=hours*4; el('rect',{x:X(d.c.c),y:TP,width:X(d.c.c+n)-X(d.c.c),height:H-TP-B,fill:'var(--wind)',opacity:.18},q); el('rect',{x:X(d.c.d),y:TP,width:X(d.c.d+n)-X(d.c.d),height:H-TP-B,fill:'var(--warn)',opacity:.2},q); }
  [pmin,(pmin+pmax)/2,pmax].forEach(v=>{ el('line',{x1:L,x2:W-4,y1:Yp(v),y2:Yp(v),stroke:'var(--line)'},q); const t=el('text',{x:L-6,y:Yp(v)+4,'text-anchor':'end','font-size':11,fill:'var(--muted)'},q); t.textContent=fmt(v,0); });
  el('path',{d:p.map((v,i)=>(i?'L':'M')+X(i+0.5).toFixed(1)+' '+Yp(v).toFixed(1)).join(' '),fill:'none',stroke:'var(--ink)','stroke-width':1.6,'stroke-linejoin':'round'},q);
  [0,24,48,72].forEach(i=>{ if(i<p.length){ const t=el('text',{x:X(i),y:H-6,'font-size':11,fill:'var(--muted)'},q); t.textContent=hhmm(i);} });
}
['#rDur','#rWin'].forEach(s=>$(s).addEventListener('change',()=>{rSel=null;renderRealised();}));
['#rte','#capex','#opex'].forEach(s=>$(s).addEventListener('input',renderRealised));
let liveMsg = {on:false, en:'Stored history', ru:'Сохранённая история'};
function setLive(on,en,ru){ liveMsg={on,en,ru}; $('#liveState').classList.toggle('on',on); $('#liveText').textContent=T(en,ru); }
(async()=>{ let db=null; try{ db=await window.claude?.use?.('db'); }catch(e){ db=null; }
  if(!db){ setLive(false,'Stored history only (live store not available in this view)','Только сохранённая история (живое хранилище недоступно в этом просмотре)'); return; }
  const timer=setTimeout(()=>setLive(false,'Live store not reachable yet; showing stored history','Живое хранилище пока недоступно; показана сохранённая история'),10000);
  db.collection('ro_dam').orderBy('date','desc').limit(400).onSnapshot(snap=>{
    if(!snap.metadata.fromCache) clearTimeout(timer);
    let added=0; snap.docs.forEach(doc=>{ const b=doc.data(); const x=b&&{date:b.date,u:b.first_unix,p:b.prices,src:'live'}; if(validDay(x)){ RO.set(x.date,x); added++; } });
    const latest=rDays().slice(-1)[0];
    setLive(true,`Live · ${added} ${added===1?'day':'days'} in the store · latest delivery day ${latest.date}`,`Онлайн · в хранилище ${added} ${plural(added,'','','день','дня','дней')} · последний день поставки ${latest.date}`); renderRealised();
  }, ()=>{ clearTimeout(timer); setLive(false,'Live store unavailable; showing stored history','Живое хранилище недоступно; показана сохранённая история'); });
})();

/* ---- calculator ---- */
const ids=['dur','rte','sLoLo','sHiLo','sLoHi','sHiHi','wLoLo','wHiLo','wLoHi','wHiHi','capex','opex'];
const DAYS={s:182,w:183};
function margin(E,rte,pc,pd){ return E*pd - (E/rte)*pc; }   // one cycle: deliver E MWh, buy E/rte
function calc(){
  const v=Object.fromEntries(ids.map(i=>[i,parseFloat($('#'+i).value)]));
  const E=v.dur, rte=Math.min(1,Math.max(0.5,(v.rte||85)/100));
  const seas = (lo,hi,days) => Math.max(0,margin(E,rte,lo,hi))*days;  // battery stays idle on days the spread does not cover losses
  const low = seas(v.sLoLo,v.sHiLo,DAYS.s)+seas(v.wLoLo,v.wHiLo,DAYS.w);
  const high= seas(v.sLoHi,v.sHiHi,DAYS.s)+seas(v.wLoHi,v.wHiHi,DAYS.w);
  const lo=Math.min(low,high), hi=Math.max(low,high), scale=Math.max(hi*1.15,1);
  const opex=isFinite(v.opex)?v.opex:0, k=T('k',' тыс.');
  let pay='';
  if(isFinite(v.capex)&&v.capex>0){ const pb=x=> x-opex>0 ? v.capex/(x-opex) : Infinity;
    const a=pb(hi), b=pb(lo); pay=`<tr><td>${T('Simple payback','Простая окупаемость')}</td><td class="r">${isFinite(a)?fmt(a,1):T('never','никогда')} – ${isFinite(b)?fmt(b,1):T('never','никогда')} ${T('yrs','лет')}</td></tr>`; }
  $('#result').innerHTML=`<span class="eyebrow">${T(`Arbitrage revenue, €/MW/year · ${E} h battery`,`Доход от арбитража, €/МВт/год · батарея ${E} ч`)}</span>
    <span class="big">€${fmt(lo/1000,0)}${k} – €${fmt(hi/1000,0)}${k}</span>
    <div class="rangebar" aria-hidden="true"><div class="track"></div><div class="fill" style="left:${100*lo/scale}%;width:${Math.max(1,100*(hi-lo)/scale)}%"></div></div>
    <table class="brk">
      <tr><td>${T('Spring/summer, low → high','Весна/лето, низкий → высокий')}</td><td class="r">€${fmt(seas(v.sLoLo,v.sHiLo,DAYS.s)/1000,1)}${k} → €${fmt(seas(v.sLoHi,v.sHiHi,DAYS.s)/1000,1)}${k}</td></tr>
      <tr><td>${T('Autumn/winter, low → high','Осень/зима, низкий → высокий')}</td><td class="r">€${fmt(seas(v.wLoLo,v.wHiLo,DAYS.w)/1000,1)}${k} → €${fmt(seas(v.wLoHi,v.wHiHi,DAYS.w)/1000,1)}${k}</td></tr>
      <tr><td>${T('Energy delivered per year','Отдано энергии за год')}</td><td class="r">${fmt(E*365,0)} ${T('MWh/MW','МВт·ч/МВт')}</td></tr>
      ${pay}
    </table>
    <p class="label-note">${T(`One cycle per day; each cycle buys ${E}/${(rte).toFixed(2)} MWh and sells ${E} MWh. Spring/summer is dominated by the solar midday trough; in winter, losses at about 100 €/MWh off-peak eat much of the spread. Moldova planned a tender for 246 MW of balancing storage (72 MW aFRR, 174 MW mFRR). Balancing revenue like that would come on top`,
      `Один цикл в день; каждый цикл покупает ${E}/${(rte).toFixed(2)} МВт·ч и продаёт ${E} МВт·ч. Весной и летом доход идёт от полуденного солнечного провала; зимой потери при цене около 100 €/МВт·ч вне пика съедают большую часть разницы. Молдова планировала тендер на 246 МВт балансирующих накопителей (72 МВт aFRR, 174 МВт mFRR). Такой доход от балансирования добавился бы сверху`)} (<a href="https://www.ess-news.com/2025/04/10/moldova-to-tender-246-mw-of-colocated-battery-storage/" target="_blank" rel="noopener">ESS News</a>).</p>`;
}
ids.forEach(i=>$('#'+i).addEventListener('input',calc));

/* ================= tabs ================= */
const VIEWS = ['scanner','equipment','permits'];
function showView(){
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scanner';
  VIEWS.forEach(n => { const e2 = document.getElementById('view-'+n); if (e2) e2.hidden = (n !== v); });
  document.querySelectorAll('.tabs a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#'+v ? 'page' : 'false'));
  if (v === 'permits') renderPermits();
}
window.addEventListener('hashchange', showView);

/* ================= sites ================= */
// Voltages, notes and register facts per site: registry/entities/md, Moldelectrica permit register (14.08.2026), TYNDP 2025-2034.
const SITES = [
  {id:'vul', name:'Vulcănești 400/110/35/10 kV', kv:[110,35,10], def:110, conn:'cell', south:true,
   note:['110 kV level exists. The 250 MVA autotransformer (1972) is due for replacement in 2028. The plan names N-1 overloads on 400 kV Vulcănești–Isaccea and 110 kV Vulcănești–Bolgrad as its most serious problem: expect operating limits.',
         'Уровень 110 кВ есть. Автотрансформатор 250 МВА (1972) подлежит замене в 2028 г. План называет перегрузки при N-1 на ВЛ 400 кВ Вулкэнешть–Исакча и 110 кВ Вулкэнешть–Болград самой серьёзной проблемой: ожидайте ограничений режима.']},
  {id:'cio', name:'Cioburciu 110/10 kV (Ștefan Vodă)', kv:[110,10], def:110, conn:'tap', south:true, lb:true,
   note:['The 110 kV lines here run from MGRES (Transnistrian region). A tap on MGRES–Cioburciu 1 or 2 carries that dependency. Several wind permits are already queued here.',
         'Линии 110 кВ здесь идут от МГРЭС (Приднестровский регион). Отпайка от МГРЭС–Чобручи 1 или 2 несёт эту зависимость. Здесь уже в очереди несколько ветровых разрешений.']},
  {id:'cap', name:'Caplani 110/10-6 kV (Ștefan Vodă)', kv:[110,10], def:110, conn:'tap', south:true, lb:true,
   note:['Fed by the 110 kV MGRES–Caplani line (Transnistrian-region dependency).','Питается от ВЛ 110 кВ МГРЭС–Капланы (зависимость от Приднестровского региона).']},
  {id:'stv', name:'Ștefan Vodă 110/35/10 kV', kv:[110,35,10], def:35, conn:'cell', south:true,
   note:['Răscăieții Noi–Ștefan Vodă 110 kV is to be rebuilt in 2028. A new 400/330/110 kV substation near Ștefan Vodă is in feasibility study.',
         'ВЛ 110 кВ Рэскэеций Ной–Штефан-Водэ будет перестроена в 2028 г. Новая подстанция 400/330/110 кВ у Штефан-Водэ на стадии ТЭО.']},
  {id:'ola', name:'Olănești 110/35/10 kV (Ștefan Vodă)', kv:[35,10], def:35, conn:'cell', south:true,
   note:['Wind permits at 35 kV here; neighbouring taps on MGRES–Caplani.','Ветровые разрешения на 35 кВ; рядом отпайки от МГРЭС–Капланы.']},
  {id:'pur', name:'Purcari 110/6 kV (Ștefan Vodă)', kv:[110,10], def:110, conn:'tap', south:true, lb:true,
   note:['Transformer T1 is 10 MVA, with an upgrade to 16 MVA only after 2034. 110 kV taps here are on MGRES–Purcari.','Трансформатор Т1 10 МВА, замена на 16 МВА только после 2034 г. Отпайки 110 кВ здесь — от МГРЭС–Пуркарь.']},
  {id:'cau', name:'Căușeni 110/35/10 kV', kv:[110,35,10], def:35, conn:'cell', south:true,
   note:['Substation rehabilitated (TYNDP: by end 2025). The nearby Vărnița–Bender Centru line ends in Bender (Transnistrian region).','Подстанция реконструирована (TYNDP: к концу 2025 г.). Соседняя линия Варница–Бендеры Центр заканчивается в Бендерах (Приднестровский регион).']},
  {id:'tar', name:'Taraclia Nord 110/35/10 kV (Căușeni)', kv:[110], def:110, conn:'loop', south:true,
   note:['Its one 10 MVA transformer is overloaded: 14.87 MW waiting at 35/10 kV cannot connect until a second transformer arrives after 2034. Connect at 110 kV.','Единственный трансформатор 10 МВА перегружен: 14,87 МВт на 35/10 кВ не могут подключиться до второго трансформатора после 2034 г. Подключайтесь на 110 кВ.']},
  {id:'gug', name:'Gura Galbenei 110/10 kV (Cimișlia)', kv:[110,10], def:110, conn:'tap', south:true,
   note:['Right-bank line Chișinău–Gura Galbenei 110 kV. A 50 MW wind permit is queued here.','Правобережная линия Кишинёв–Гура-Галбеней 110 кВ. Здесь в очереди ветровое разрешение на 50 МВт.']},
  {id:'cea', name:'Ceadîr-Lunga 110/10 kV', kv:[10], def:10, conn:'cell', south:true,
   note:['Two 16 MVA transformers (1970s), to be replaced after 2034. A 10 MW solar + storage permit is queued.','Два трансформатора по 16 МВА (1970-е), замена после 2034 г. В очереди разрешение на 10 МВт солнца с накопителем.']},
  {id:'chi', name:'Chișinău 330/110/35 kV', kv:[110,35], def:110, conn:'cell',
   note:['A 20 MW standalone storage permit at 35 kV and a 30 MW wind + storage permit at 110 kV are queued. The new 400 kV line from Vulcănești arrives here.','В очереди автономный накопитель 20 МВт на 35 кВ и ветер с накопителем 30 МВт на 110 кВ. Сюда приходит новая линия 400 кВ из Вулкэнешть.']},
  {id:'bal', name:'Bălți 330/110/35 kV', kv:[110,35], def:110, conn:'cell',
   note:['A 50 MW standalone storage permit at 110 kV is queued. The 400 kV Bălți–Suceava line is under contract.','В очереди автономный накопитель 50 МВт на 110 кВ. Линия 400 кВ Бельцы–Сучава законтрактована.']},
  {id:'str', name:'Strășeni 330/110 kV', kv:[110], def:110, conn:'cell', note:['The 400 kV Strășeni–Gutinaș line is planned (estimated 2032).','Линия 400 кВ Стрэшень–Гутинаш запланирована (ориентировочно 2032 г.).']},
  {id:'oth', name:'', kv:[110,35,10], def:110, conn:'tap', note:['','']},
];
const siteName = s => s.id==='oth' ? T('Other site / not decided','Другой участок / не выбран') : s.name;
// Largest permits per voltage in Moldelectrica's register (14.08.2026), used as a plausibility flag only.
const REG_MAX = {10: 16, 35: 20};
const STD_MVA = [10,16,25,32,40,63,80,100,125,160,200];

/* ================= equipment ================= */
function eqState(){
  const g = id => document.getElementById(id);
  return { type:g('eqType').value, site:SITES.find(s=>s.id===g('eqSite').value)||SITES[0], mw:Math.max(1,parseFloat(g('eqMW').value)||1),
    h:+g('eqH').value, kv:+g('eqKV').value, conn:g('eqConn').value, arb:g('svArb').checked, frr:g('svFRR').checked, fcr:g('svFCR').checked,
    cont:Math.max(0.5,parseFloat(g('asCont').value)||5), pcs:Math.max(0.5,parseFloat(g('asPcs').value)||2.5), aug:Math.max(0,parseFloat(g('asAug').value)||0)/100,
    pf:Math.min(1,Math.max(0.8,parseFloat(g('asPf').value)||0.95)), feed:Math.max(1,parseInt(g('asFeed').value)||4), n1:+g('asN1').value };
}
function operatorFor(s){
  if (s.kv===110) return T('Moldelectrica (TSO)','Moldelectrica (ОСП)');
  if (s.site.id==='oth') return T('Moldelectrica if the cell is in one of its 110/x kV substations; otherwise the DSO (Premier Energy Distribution in the centre and south, RED Nord in the north)','Moldelectrica, если ячейка в её подстанции 110/x кВ; иначе ОСР (Premier Energy Distribution в центре и на юге, RED Nord на севере)');
  return T('Moldelectrica (cell in its 110/x kV substation; the register shows Moldelectrica issuing such permits)','Moldelectrica (ячейка в её подстанции 110/x кВ; реестр показывает, что такие разрешения выдаёт Moldelectrica)');
}
let BOM = [];
function buildBOM(s){
  const rows = []; const add = (cat,item,qty,spec,basis) => rows.push({cat,item,qty,spec,basis});
  const eUse = s.mw*s.h, eBol = eUse*(1+s.aug), nCont = Math.ceil(eBol/s.cont - 1e-9);
  const sMVA = s.mw/s.pf, nBlk = Math.ceil(sMVA/s.pcs - 1e-9), nFeed = Math.ceil(nBlk/s.feed);
  const mv = s.kv===110 ? (s.mw>20 ? 35 : 10) : s.kv;
  const trMVA = STD_MVA.find(x=>x>=sMVA*1.05) || Math.ceil(sMVA*1.05);
  const hvBays = s.kv===110 ? (s.conn==='loop' ? 2 : 1) : 0;
  const coloc = s.type!=='standalone';
  const C = { bat:T('Battery','Батарея'), pc:T('Power conversion','Преобразование'), mvc:T('MV collection','Сеть СН'), hv:T('HV substation','Подстанция ВН'), cn:T('Connection','Подключение'),
    pr:T('Protection','Релейная защита'), me:T('Metering','Учёт'), pq:T('Power quality','Качество электроэнергии'), ct:T('Control','Управление'), au:T('Auxiliaries','Собственные нужды'),
    fs:T('Fire and safety','Пожарная безопасность'), cv:T('Civil and BOP','Стройчасть и BOP'), sp:T('Spares','ЗИП') };
  const kV = T('kV','кВ'), MVA = T('MVA','МВА'), MWh = T('MWh','МВт·ч'), MW = T('MW','МВт');

  add(C.bat,T('LFP battery containers (enclosure, racks, BMS, liquid cooling/HVAC, fire detection)','Контейнеры LFP-батарей (корпус, стойки, BMS, жидкостное охлаждение/HVAC, пожарная сигнализация)'), nCont,
    T(`≥ ${s.cont} MWh each at start of life; LFP chemistry; ≥ ${fmt(eBol,1)} MWh total for ${fmt(eUse,0)} MWh usable; round-trip efficiency and degradation curve guaranteed; rated for ${fmt(1/s.h,2)}C continuous charge and discharge`,
      `≥ ${s.cont} МВт·ч каждый в начале срока службы; химия LFP; всего ≥ ${fmt(eBol,1)} МВт·ч для ${fmt(eUse,0)} МВт·ч полезной ёмкости; гарантия КПД цикла и кривой деградации; номинал ${fmt(1/s.h,2)}C длительного заряда и разряда`),
    T('Sizing: usable × (1 + extra energy at start of life) ÷ container size','Расчёт: полезная ёмкость × (1 + запас на начало срока) ÷ ёмкость контейнера'));
  add(C.bat,T('Battery management system, rack and container level','Система управления батареей (BMS), уровень стойки и контейнера'), nCont, T('Cell, module and rack monitoring; SoC/SoH reporting to the EMS; safety interlocks with the PCS','Мониторинг ячеек, модулей и стоек; передача SoC/SoH в EMS; защитные блокировки с PCS'), 'IEC 62619');
  add(C.pc,T('Power blocks: bidirectional PCS + LV/MV transformer + MV ring-main unit (skid)','Силовые блоки: двунаправленный PCS + трансформатор НН/СН + КРУ СН (на раме)'), nBlk,
    T(`${s.pcs} MVA each, ${mv} kV output; grid-forming capable preferred; reactive capability ${s.pf} capacitive/inductive at full power; fault ride-through, LFSM-O/U and frequency withstand to ANRE Decision 108/2024`,
      `${s.pcs} МВА каждый, выход ${mv} кВ; желательно с режимом grid-forming; реактивная мощность ${s.pf} емк./инд. при полной мощности; прохождение КЗ (FRT), LFSM-O/U и устойчивость по частоте по Решению НАРЭ 108/2024`),
    T(`Sizing: ${fmt(s.mw,0)} MW ÷ ${s.pf} pf = ${fmt(sMVA,1)} MVA ÷ block size`,`Расчёт: ${fmt(s.mw,0)} МВт ÷ ${s.pf} = ${fmt(sMVA,1)} МВА ÷ размер блока`));
  add(C.mvc,T(`${mv} kV switchgear: feeder panels`,`КРУ ${mv} кВ: ячейки отходящих линий`), nFeed, T(`Metal-enclosed, vacuum breakers, ${mv} kV, protection relay per feeder`,`Металлические ячейки, вакуумные выключатели, ${mv} кВ, реле защиты на каждую линию`), T(`${s.feed} power blocks per feeder (assumption)`,`${s.feed} силовых блока на линию (допущение)`));
  add(C.mvc,T(`${mv} kV switchgear: incomer, metering, auxiliary transformer and spare panels`,`КРУ ${mv} кВ: вводные, измерительная, ТСН и резервная ячейки`), s.kv===110 ? 3+s.n1 : 3, T('Incomer per main transformer, VT/metering panel, auxiliary supply panel, 1 spare','Ввод на каждый главный трансформатор, ячейка ТН/учёта, ячейка собственных нужд, 1 резервная'), T('Standard single-busbar arrangement','Стандартная схема с одной системой шин'));
  add(C.mvc,T(`${mv} kV cables between power blocks and switchgear`,`Кабели ${mv} кВ между силовыми блоками и КРУ`), T('by layout','по планировке'), T(`Al or Cu XLPE, ${mv} kV, sized for ${fmt(s.pcs*s.feed,1)} MVA per feeder; fibre-optic cable in the same trench`,`Al или Cu, изоляция XLPE, ${mv} кВ, на ${fmt(s.pcs*s.feed,1)} МВА на линию; ВОК в той же траншее`), T('Lengths come from the site layout','Длины — из генплана'));
  if (s.kv===110){
    add(C.hv,T(`Main transformer 110/${mv} kV`,`Главный трансформатор 110/${mv} кВ`), s.n1, T(`${trMVA} MVA, ONAN/ONAF, on-load tap changer, YNd or per operator; losses guaranteed`,`${trMVA} МВА, ONAN/ONAF, РПН, YNd или по требованию оператора; гарантия потерь`), T(`${fmt(sMVA,1)} MVA + 5% margin, next standard size${s.n1===2?'; N-1: each transformer full size':''}`,`${fmt(sMVA,1)} МВА + 5% запаса, ближайший стандартный размер${s.n1===2?'; N-1: каждый на полную мощность':''}`));
    add(C.hv,T('110 kV transformer bay: circuit breaker, disconnectors with earthing switch, CTs, surge arresters','Ячейка трансформатора 110 кВ: выключатель, разъединители с заземлителем, ТТ, ОПН'), s.n1, T('SF6 or SF6-free breaker, 110 kV, CTs with protection and metering cores','Выключатель SF6 или без SF6, 110 кВ, ТТ с обмотками защиты и учёта'), T('One bay per main transformer','Одна ячейка на главный трансформатор'));
    add(C.hv, s.conn==='cell' ? T("110 kV line bay in the operator's substation (built to Moldelectrica's specification)",'Линейная ячейка 110 кВ на подстанции оператора (по спецификации Moldelectrica)') : T('110 kV line bays at your substation','Линейные ячейки 110 кВ на вашей подстанции'), hvBays,
      T('Breaker, disconnectors, CTs, VTs, surge arresters; protection and control cubicle per bay','Выключатель, разъединители, ТТ, ТН, ОПН; шкаф защиты и управления на ячейку'),
      s.conn==='loop' ? T('Loop-in (intrare-ieșire) needs two line bays and a busbar','Заход-выход (intrare-ieșire) требует двух линейных ячеек и шин') : s.conn==='tap' ? T('Tap (derivație) needs one line bay','Отпайка (derivație) требует одной линейной ячейки') : T('New cell in an existing substation, as in the register (e.g. 110 kV cells at Chișinău and Bălți)','Новая ячейка на существующей подстанции, как в реестре (напр. ячейки 110 кВ в Кишинёве и Бельцах)'));
    add(C.hv, s.conn==='cell' ? T('110 kV cable or overhead line from your site to the substation','Кабель или ВЛ 110 кВ от вашего участка до подстанции') : T('110 kV connection line to the tap/loop point','Линия 110 кВ до точки отпайки/захода'), 1,
      T('Route length from the permit; OPGW or ADSS fibre for protection and SCADA','Трасса по разрешению; ВОК OPGW или ADSS для РЗА и SCADA'), T('The connection permit sets the route and the point of connection','Разрешение на подключение задаёт трассу и точку подключения'));
    if (s.conn!=='cell') add(C.hv,T('110 kV busbar, structures, and HV voltage transformers','Шины 110 кВ, конструкции и трансформаторы напряжения ВН'), 1, T('Single busbar; VTs for protection, metering and synchronisation','Одна система шин; ТН для защиты, учёта и синхронизации'), T('Own substation','Собственная подстанция'));
  } else {
    add(C.cn,T(`${s.kv} kV connection cell in the operator's substation and cable to site`,`Ячейка подключения ${s.kv} кВ на подстанции оператора и кабель до участка`), 1, T(`${s.kv} kV breaker cell to the operator's specification; cable sized for ${fmt(sMVA,1)} MVA`,`Ячейка с выключателем ${s.kv} кВ по спецификации оператора; кабель на ${fmt(sMVA,1)} МВА`), T('The permit names the cell, e.g. "celula 10 kV nr. … din SE …" in the register','Разрешение называет ячейку, напр. «celula 10 kV nr. … din SE …» в реестре'));
  }
  add(C.pr,T('Protection and control cubicles: transformer differential, line distance/differential, busbar, feeder protection, anti-islanding','Шкафы РЗА: дифзащита трансформатора, дистанционная/дифзащита линии, защита шин, защита линий СН, защита от островного режима'), s.kv===110 ? s.n1+hvBays+1 : 2,
    T('Two independent, redundant protection groups; settings coordinated with the operator','Два независимых резервированных комплекта защит; уставки согласуются с оператором'), T('ANRE Decision 108/2024 pt. 14, 22 (two independent groups; no unintended islanding)','Решение НАРЭ 108/2024 п. 14, 22 (два независимых комплекта; без непреднамеренного острова)'));
  add(C.me,T('Commercial metering at the connection point: main and check meters with dedicated CT/VT cores','Коммерческий учёт в точке подключения: основной и контрольный счётчики с отдельными обмотками ТТ/ТН'), 2,
    T('Bidirectional, interval metering, remote reading; accuracy class as set in the connection permit and the ANRE metering rules','Двунаправленный, интервальный, с дистанционным считыванием; класс точности — по разрешению на подключение и правилам учёта НАРЭ'), T('The operator sets the metering point and class in the permit','Оператор задаёт точку и класс учёта в разрешении'));
  if (coloc) add(C.me,T('Separate metering of the battery and the generator behind the shared connection','Раздельный учёт батареи и генерации за общей точкой подключения'), 1, T('Lets the operator and ANRE tell storage flows from generation flows (licensing, support schemes)','Позволяет оператору и НАРЭ отделить потоки накопителя от генерации (лицензии, схемы поддержки)'), T('Co-located assets with different licences and support','Совмещённые объекты с разными лицензиями и поддержкой'));
  add(C.pq,T('Power-quality analyser at the connection point','Анализатор качества электроэнергии в точке подключения'), 1, T('Harmonics to the 50th, flicker, unbalance; at least 3 months of data stored','Гармоники до 50-й, фликер, несимметрия; хранение данных не менее 3 месяцев'), T('ANRE Decision 108/2024 pt. 6, 16, 24 (EN 50160)','Решение НАРЭ 108/2024 п. 6, 16, 24 (EN 50160)'));
  add(C.ct,T('Power plant controller (PPC)','Контроллер станции (PPC)'), 1, T(`P, Q, V and pf control at the connection point; ramp-rate limits 1–20% Pmax/min; setpoints from the operator within 2 s${coloc?'; coordinates the battery and the '+(s.type==='wind'?'wind farm':'solar plant'):''}`,`Регулирование P, Q, U и cos φ в точке подключения; ограничение скорости 1–20% Pmax/мин; уставки от оператора за 2 с${coloc?'; координирует батарею и '+(s.type==='wind'?'ветропарк':'солнечную станцию'):''}`), T('ANRE Decision 108/2024 pt. 11, 19, 25a','Решение НАРЭ 108/2024 п. 11, 19, 25a'));
  add(C.ct,T('SCADA, RTU and gateway to Moldelectrica dispatch','SCADA, RTU и шлюз к диспетчеру Moldelectrica'), 1, T('Real-time data exchange (P, Q, U, f, breaker states, tap positions); remote stop within 5 s; protocol and data list from Moldelectrica','Обмен данными в реальном времени (P, Q, U, f, положения выключателей, отпаек РПН); дистанционный останов за 5 с; протокол и перечень сигналов — от Moldelectrica'), T('ANRE Decision 108/2024 pt. 4, 7, 15b, 23b (real-time data above 200 kW)','Решение НАРЭ 108/2024 п. 4, 7, 15b, 23b (данные в реальном времени свыше 200 кВт)'));
  add(C.ct,T('Telecom: two independent channels to the dispatch centre','Связь: два независимых канала до диспетчерского центра'), 1, T('Fibre plus a backup channel; time synchronisation (GPS)','Оптика плюс резервный канал; синхронизация времени (GPS)'), T('Redundancy for protection and balancing signals','Резервирование для РЗА и сигналов балансирования'));
  if (s.frr) add(C.ct,T('aFRR/mFRR interface: setpoint receiver and response logging','Интерфейс aFRR/mFRR: приём уставок и журнал отклика'), 1, T('Receives activation signals from Moldelectrica; logs delivered power per dispatch interval for settlement','Принимает сигналы активации от Moldelectrica; фиксирует поставленную мощность по интервалам для расчётов'), T('Moldelectrica balancing service provider qualification (ANRE-approved procedure)','Квалификация поставщика балансирующих услуг Moldelectrica (процедура, утверждённая НАРЭ)'));
  if (s.fcr) add(C.ct,T('Frequency measurement and FCR (RSF) control function','Измерение частоты и функция FCR (RSF)'), 1, T('Delivers full contracted power during a deviation for the duration in the qualification procedure (15/30 min)','Выдаёт всю контрактную мощность при отклонении частоты в течение времени по процедуре квалификации (15/30 мин)'), T('Moldelectrica terms for balancing service providers','Условия Moldelectrica для поставщиков балансирующих услуг'));
  if (s.arb || s.frr) add(C.ct,T('Energy management system (EMS) with market interface','Система управления энергией (EMS) с рыночным интерфейсом'), 1,
    T(`Schedules charging and discharging, bids to ${[s.arb?'OPEM day-ahead/intraday':null,s.frr||s.fcr?'Moldelectrica balancing auctions':null].filter(Boolean).join(' and ')}; respects SoC and warranty limits`,`Планирует заряд и разряд, подаёт заявки на ${[s.arb?'рынок на сутки вперёд/внутрисуточный OPEM':null,s.frr||s.fcr?'балансирующие аукционы Moldelectrica':null].filter(Boolean).join(' и ')}; соблюдает пределы SoC и гарантии`), T('Revenue streams selected','Выбранные источники дохода'));
  add(C.ct,T('Disturbance/fault recorder','Регистратор аварийных событий'), 1, T('Records events at the connection point for the operator','Записывает события в точке подключения для оператора'), T('ANRE Decision 108/2024 pt. 25f (type C)','Решение НАРЭ 108/2024 п. 25f (тип C)'));
  add(C.au,T('Auxiliary transformer and LV switchboard','Трансформатор собственных нужд и щит НН'), 1, T(`Supplies cooling, controls and lighting; sized from container HVAC load (≈ ${fmt(nCont*0.04,1)} MW at 40 kW per container: check with supplier)`,`Питает охлаждение, управление и освещение; по нагрузке HVAC контейнеров (≈ ${fmt(nCont*0.04,1)} МВт при 40 кВт на контейнер: уточнить у поставщика)`), T('Supplier load data','Данные поставщика о нагрузке'));
  add(C.au,T('DC system for protection and control (batteries and chargers), UPS for SCADA','Система постоянного тока для РЗА (АБ и зарядные), ИБП для SCADA'), 1, T('110 or 220 V DC, 2 × 100% chargers; UPS for RTU and telecom','110 или 220 В пост. тока, 2 × 100% зарядных; ИБП для RTU и связи'), T('Protection must work without AC','Защита должна работать без переменного тока'));
  add(C.fs,T('Fire detection, gas detection and suppression per container; explosion venting or deflagration control','Пожарная и газовая сигнализация и пожаротушение в каждом контейнере; сброс давления взрыва или защита от дефлаграции'), nCont, T('Tested to UL 9540A at cell, module and unit level; deflagration protection per NFPA 68/69','Испытания по UL 9540A на уровне ячейки, модуля и установки; защита от дефлаграции по NFPA 68/69'), 'IEC 62933-5-2; NFPA 855');
  add(C.fs,T('Site firefighting water supply, hydrants, access roads for fire brigade, separation distances','Противопожарное водоснабжение, гидранты, подъезды для пожарных, противопожарные разрывы'), 1, T('Per Moldovan fire-safety rules and the building permit','По молдавским правилам пожарной безопасности и разрешению на строительство'), T('Fire-safety rules HG 847/2022','Правила пожарной безопасности ПП 847/2022'));
  add(C.cv,T('Foundations for containers, power blocks and transformers; oil pits for transformers','Фундаменты под контейнеры, силовые блоки и трансформаторы; маслоприёмники'), nCont+nBlk+(s.kv===110?s.n1:0), T('Geotechnical survey first','Сначала инженерно-геологические изыскания'), T('Count = containers + power blocks + transformers','Количество = контейнеры + силовые блоки + трансформаторы'));
  add(C.cv,T('Earthing grid and lightning protection','Контур заземления и молниезащита'), 1, T('Designed for the site fault level from the operator','Проект по току КЗ площадки от оператора'), T('Connection permit gives the fault level','Ток КЗ указан в разрешении на подключение'));
  add(C.cv,T('Cable trenches, internal roads, drainage, fencing, gates, lighting','Кабельные траншеи, внутренние дороги, дренаж, ограждение, ворота, освещение'), 1, T('Fence and access per site plan (PUD / building permit)','Ограждение и подъезды по генплану (PUD / разрешение на строительство)'), T('Urban Planning Code 434/2023','Кодекс о градостроительстве 434/2023'));
  add(C.cv,T('CCTV and intrusion detection','Видеонаблюдение и охранная сигнализация'), 1, T('Remote monitoring','Удалённый мониторинг'), T('Insurance and security','Страхование и безопасность'));
  add(C.cv,T('Control building or e-house for MV switchgear, protection, SCADA and telecom','Здание управления или блок-модуль для КРУ СН, РЗА, SCADA и связи'), 1, T('Climate-controlled','С климат-контролем'), '');
  add(C.sp,T('Strategic spares: battery modules, PCS power stacks, MV breaker, relays','Стратегический ЗИП: модули батарей, силовые модули PCS, выключатель СН, реле'), 1, T('Typically 1–2% of modules and one spare power module per type','Обычно 1–2% модулей и один запасной силовой модуль каждого типа'), T('O&M','Эксплуатация'));
  BOM = rows; return {eUse,eBol,nCont,sMVA,nBlk,nFeed,mv,trMVA,hvBays};
}
function renderEquipment(){
  const s = eqState(); const r = buildBOM(s);
  document.getElementById('eqSiteNote').textContent = T(s.site.note[0], s.site.note[1]);
  document.getElementById('eqSum').innerHTML = `
    <div class="kpi"><span class="v">${fmt(s.mw,0)} <small>${T('MW','МВт')}</small> / ${fmt(r.eUse,0)} <small>${T('MWh','МВт·ч')}</small></span><span class="l">${T('Usable power / energy','Полезная мощность / ёмкость')}</span></div>
    <div class="kpi"><span class="v">${r.nCont}</span><span class="l">${T('Battery containers','Контейнеров батарей')}</span><span class="s">${T(`${fmt(r.eBol,1)} MWh installed at ${s.cont} MWh each`,`установлено ${fmt(r.eBol,1)} МВт·ч, по ${s.cont} МВт·ч`)}</span></div>
    <div class="kpi"><span class="v">${r.nBlk}</span><span class="l">${T('Power blocks','Силовых блоков')}</span><span class="s">${T(`${s.pcs} MVA each, ${r.mv} kV`,`по ${s.pcs} МВА, ${r.mv} кВ`)}</span></div>
    <div class="kpi"><span class="v">${s.kv===110? s.n1+' × '+r.trMVA+' <small>'+T('MVA','МВА')+'</small>' : T('none','нет')}</span><span class="l">${T(`Main transformer 110/${r.mv} kV`,`Главный трансформатор 110/${r.mv} кВ`)}</span><span class="s">${s.kv===110?'':T('connection at '+s.kv+' kV','подключение на '+s.kv+' кВ')}</span></div>`;
  const flags = [];
  if (REG_MAX[s.kv] && s.mw > REG_MAX[s.kv]) flags.push(['warn',T(`${fmt(s.mw,0)} MW at ${s.kv} kV is above the largest permit at that voltage in Moldelectrica's register (${REG_MAX[s.kv]} MW). Expect the operator to ask for a higher voltage.`,`${fmt(s.mw,0)} МВт на ${s.kv} кВ — больше крупнейшего разрешения на этом напряжении в реестре Moldelectrica (${REG_MAX[s.kv]} МВт). Оператор, вероятно, потребует более высокое напряжение.`)]);
  if (!s.site.kv.includes(s.kv)) flags.push(['warn',T(`${siteName(s.site)} has no ${s.kv} kV level available for new connections in the data here. Choose ${s.site.kv.join(' or ')} kV.`,`У ${siteName(s.site)} нет уровня ${s.kv} кВ для новых подключений по имеющимся данным. Выберите ${s.site.kv.join(' или ')} кВ.`)]);
  if (s.site.lb && s.kv===110) flags.push(['risk',T('The 110 kV lines at this site run from MGRES in the Transnistrian region. Ask Moldelectrica how secure the connection is before ordering.','Линии 110 кВ здесь идут от МГРЭС в Приднестровском регионе. До заказа выясните у Moldelectrica, насколько надёжно это подключение.')]);
  if (s.mw > 20) flags.push(['info',T('Above 20 MW the plant needs a Government authorisation (Law 164/2025 art. 4(1)(g)). See the Permits tab.','Свыше 20 МВт нужно разрешение Правительства (Закон 164/2025, ст. 4(1)(g)). См. вкладку «Разрешения».')]);
  if (s.frr || s.fcr) flags.push(['info',T("Balancing equipment and plant less than 36 months old at commissioning are conditions in Moldelectrica's balancing capacity tenders.",'Оборудование для балансирования и установка моложе 36 месяцев на момент ввода — условия тендеров Moldelectrica на балансирующую мощность.')]);
  flags.push(['info',T('Connection permit issued by: ','Разрешение на подключение выдаёт: ')+operatorFor(s)+'.']);
  document.getElementById('eqFlags').innerHTML = flags.map(([k,t])=>`<p class="flag ${k}">${t}</p>`).join('');
  let cat='';
  document.getElementById('eqBody').innerHTML = BOM.map(x=>{ const head = x.cat!==cat ? `<tr class="cat"><td colspan="4">${x.cat}</td></tr>` : ''; cat=x.cat;
    return head+`<tr><td>${x.item}</td><td class="r num">${x.qty}</td><td>${x.spec}</td><td class="basis">${x.basis}</td></tr>`; }).join('');
  document.getElementById('eqDocs').innerHTML = [
    T('Battery: IEC 62619 certificate; UL 9540A test reports (cell, module, unit); cycle-life and degradation warranty; augmentation plan','Батарея: сертификат IEC 62619; отчёты UL 9540A (ячейка, модуль, установка); гарантия ресурса и деградации; план доукомплектации'),
    T('PCS and plant: compliance with ANRE Decision 108/2024 (frequency/voltage withstand, fault ride-through, reactive capability, LFSM, remote control) with type-test reports and a simulation model the operator accepts','PCS и станция: соответствие Решению НАРЭ 108/2024 (устойчивость по частоте/напряжению, FRT, реактивная мощность, LFSM, дистанционное управление), протоколы типовых испытаний и модель, принимаемая оператором'),
    T('Safety: IEC 62477-1 (power converters), IEC 62933-5-2 (storage safety), EMC to IEC 61000','Безопасность: IEC 62477-1 (преобразователи), IEC 62933-5-2 (безопасность накопителей), ЭМС по IEC 61000'),
    T('Transformers and HV gear: IEC 60076 / IEC 62271 type tests; loss guarantees','Трансформаторы и оборудование ВН: типовые испытания IEC 60076 / IEC 62271; гарантия потерь'),
    T('Documents for the authorisations: equipment datasheets and single-line diagram (connection permit, building permit, ANRE licence file)','Документы для разрешений: техпаспорта оборудования и однолинейная схема (разрешение на подключение, разрешение на строительство, досье на лицензию НАРЭ)'),
    (s.frr||s.fcr) ? T("Balancing: proof the plant can pass Moldelectrica's technical qualification; manufacture date (equipment under 36 months old at commissioning in the 2025 tender)",'Балансирование: подтверждение, что станция пройдёт техническую квалификацию Moldelectrica; дата изготовления (оборудование моложе 36 месяцев на момент ввода в тендере 2025 г.)') : null,
  ].filter(Boolean).map(t=>`<li>${t}</li>`).join('');
}
function bomCSV(){
  const s = eqState(); const q = v => '"'+String(v).replace(/"/g,'""')+'"';
  const head = T(`# Moldova Grid Scanner equipment list: ${s.type}, ${siteName(s.site)}, ${s.mw} MW / ${s.mw*s.h} MWh, ${s.kv} kV, ${s.conn}. Preliminary scope, not a final design.`,
    `# Moldova Grid Scanner, перечень оборудования: ${s.type}, ${siteName(s.site)}, ${s.mw} МВт / ${s.mw*s.h} МВт·ч, ${s.kv} кВ, ${s.conn}. Предварительный объём, не окончательный проект.`);
  return [head, [T('Category','Категория'),T('Item','Позиция'),T('Qty','Кол-во'),T('Specification','Спецификация'),T('Basis','Основание')].map(q).join(','), ...BOM.map(x=>[x.cat,x.item,x.qty,x.spec,x.basis].map(q).join(','))].join('\n');
}
function fillSites(){
  const site = document.getElementById('eqSite'); const cur = site.value || SITES[0].id;
  site.innerHTML = `<optgroup label="${T('South','Юг')}">`+SITES.filter(s=>s.south).map(s=>`<option value="${s.id}">${siteName(s)}</option>`).join('')+'</optgroup>'
    + `<optgroup label="${T('Backbone and other','Магистральные и другие')}">`+SITES.filter(s=>!s.south).map(s=>`<option value="${s.id}">${siteName(s)}</option>`).join('')+'</optgroup>';
  site.value = cur;
}
function setupEquipment(){
  const site = document.getElementById('eqSite'); fillSites();
  site.addEventListener('change', ()=>{ const s=SITES.find(x=>x.id===site.value); document.getElementById('eqKV').value=String(s.def); document.getElementById('eqConn').value=s.conn; renderEquipment(); });
  document.getElementById('eqForm').addEventListener('input', renderEquipment);
  document.getElementById('eqForm').addEventListener('change', renderEquipment);
  document.getElementById('eqForm').addEventListener('submit', e=>e.preventDefault());
  document.getElementById('eqCopy').addEventListener('click', ()=>{
    const msg=document.getElementById('eqCopyMsg'); const text=bomCSV(); const blocked=T('Copy was blocked here; use Download CSV instead.','Копирование заблокировано; используйте «Скачать CSV».');
    try { navigator.clipboard.writeText(text).then(()=>{ msg.textContent=T('Copied. Paste into a spreadsheet.','Скопировано. Вставьте в таблицу.'); }, ()=>{ msg.textContent=blocked; }); }
    catch(e){ msg.textContent=blocked; }
  });
  (async()=>{ let dl=null; try{ dl = await window.claude?.use?.('downloads'); }catch(e){ dl=null; }
    if(!dl) return; const b=document.getElementById('eqDl'); b.hidden=false;
    b.addEventListener('click', async()=>{ const msg=document.getElementById('eqCopyMsg'); try{ await dl.save({filename:'moldova-bess-equipment.csv', data:bomCSV()}); msg.textContent=T('Saved.','Сохранено.'); }catch(e){ msg.textContent=T('Download was not completed.','Загрузка не завершена.'); } });
  })();
  const s0 = SITES[0]; document.getElementById('eqKV').value=String(s0.def); document.getElementById('eqConn').value=s0.conn;
}

/* ================= permits ================= */
const L = { // sources
  lic:'https://anre.md/conditiile-de-licentiere-3-63', fee:'https://anre.md/termene-si-taxa-pentru-licenta-3-135',
  gov:'https://gov.md/sites/default/files/media/documents/sedinte-de-guvern/2026-07/NU-580-MEn-2026.pdf',
  conn:'https://energy-wind.md/anre-pune-reguli-noi-la-racordarea-centralelor-electrice-garantii-pentru-proiectele-mari-si-solutii-flexibile-pentru-retelele-congestionate/',
  guar:'https://energie.gov.md/ro/content/30-de-avize-de-racordare-la-retea-cu-o-capacitate-totala-de-peste-109-mw-au-fost-returnate',
  guar200:'https://www.energie.gov.md/ro/content/titularii-de-avize-de-racordare-vor-fi-obligati-sa-depuna-garantii-financiare-pentru',
  reg:'https://rdp.moldelectrica.md/files/docs/14/Registrul%20de%20evidenta%20AR_14.08.2026.pdf',
  eia:'https://www.undp.org/sites/g/files/zskgke326/files/2023-05/Indrumar%20EIM%20RO.pdf',
  land:'https://gov.md/sites/default/files/media/documents/sedinte-de-guvern/2026-11/1036-MAIA-2026.pdf',
  adm:'https://renergy.md/noul-regulament-de-admitere-in-exploatare-a-instalatiilor-electrice-anre-propune-o-redactie-integrala-cu-stocare-iluminat-public-si-procedura-exclusiv-electronica/',
  bal:'https://rdp.moldelectrica.md/files/docs/market/[Aprob_HANRE647_04112025]_Licitatii_integrate_capacitati_echilibrare_aprobare.pdf',
  fse:'https://mail.moldelectrica.md/files/docs/market/3_(Moldelectrica)-TCM-FSE_08.12.2025.pdf',
  rfg:'https://www.premierenergydistribution.md/sites/default/files/inline-files/tarife-si-reglementari/legislatie-si-reglementare/legislatia-secundara/Hotarare_nr_108_privind_aprobarea_Cerintelor_cu_aplicabilitate_generala_pentru_unitatile_generatoare.pdf',
  opem:'https://opcom.ro/opcom/uploads/doc/Comunicate/OPCOM_CP%20EN%2021.08.2026_Record%20de%20tranzactionare%20pe%20PZU-MD.pdf',
  tax:'https://watchdog.md/wp-content/uploads/2026/07/Research-on-renewable-energy-in-Moldova-WatchDog.MD_.pdf',
  guarantee:'https://www.infomarket.md/en/news/the-region-s-energy-shortage-has-reached-moldova-batteries-will-solve-only-part-of-the-problem',
  wind:'https://energie.gov.md/sites/default/files/stadiul_proiectelorprogramelor_de_infrastructura_ale_men_-actualizare_14.07.2026.pdf',
};
const src = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
function renderPermits(){
  const s = eqState(); const land = document.getElementById('pLand').value; const op = operatorFor(s);
  const typeName = {standalone:T('standalone BESS','автономная СНЭЭ'),wind:T('BESS co-located with wind','СНЭЭ совместно с ветром'),solar:T('BESS co-located with solar','СНЭЭ совместно с солнцем')}[s.type];
  document.getElementById('pCtx').innerHTML = T(`<b>Project from the Equipment tab:</b> ${typeName}, ${fmt(s.mw,0)} MW / ${fmt(s.mw*s.h,0)} MWh at ${siteName(s.site)}, ${s.kv} kV. <a href="#equipment">Change it</a>.`,
    `<b>Проект из вкладки «Оборудование»:</b> ${typeName}, ${fmt(s.mw,0)} МВт / ${fmt(s.mw*s.h,0)} МВт·ч, ${siteName(s.site)}, ${s.kv} кВ. <a href="#equipment">Изменить</a>.`);
  const big = s.mw > 20, coloc = s.type!=='standalone';
  const steps = [
    { t:T('Secure the land','Оформите землю'), st: land==='ind' ? 'check' : 'req', who:T('Landowner; cadastre office; Government for a change of land category','Собственник земли; кадастр; Правительство — для смены категории земли'),
      how: land==='agri' ? T('Get ownership, lease or superficies rights and a cadastral plan. Agricultural land needs a change of category before you build (Land Code 22/2024 art. 58–59), backed by a pedological study and a site layout approved by the local architect. Compensation for lost agricultural production is calculated under Law 239/2025. The example found was decided by the Government on state land: confirm with the cadastre office or counsel who decides for private land.',
                             'Получите право собственности, аренды или суперфиция и кадастровый план. Сельхозземля до строительства требует смены категории (Земельный кодекс 22/2024, ст. 58–59) с почвенным исследованием и схемой участка, утверждённой местным архитектором. Возмещение потерь сельхозпроизводства — по Закону 239/2025. Найденный пример решён Правительством для государственной земли: кто решает для частной земли, уточните в кадастре или у юриста.')
         : land==='state' ? T('State land is reclassified by Government decision (Land Code 22/2024 art. 5(d), 58). Written consent from any existing lessees is needed. Compensation for lost agricultural production applies unless the land is inside the built-up area and the general urban plan.',
                              'Государственная земля переводится в другую категорию постановлением Правительства (Земельный кодекс 22/2024, ст. 5(d), 58). Нужно письменное согласие действующих арендаторов. Возмещение потерь сельхозпроизводства применяется, если земля не в черте населённого пункта и генплане.')
         : T('Confirm the land category and your rights with a cadastral extract. If the site is already zoned for industry or energy, no change of category is needed.','Подтвердите категорию земли и свои права выпиской из кадастра. Если участок уже предназначен для промышленности или энергетики, смена категории не нужна.'),
      docs:T('Title or lease; cadastral plan; pedological study (agricultural land); site layout approved by the local architect','Право собственности или аренда; кадастровый план; почвенное исследование (сельхозземля); схема участка, утверждённая архитектором'),
      time:T('Months: a Government decision, with opinions due within 10 working days in the example found','Месяцы: постановление Правительства; в найденном примере заключения — в течение 10 рабочих дней'),
      basis:T('Land Code no. 22/2024 art. 58–60; Law 239/2025 (loss compensation)','Земельный кодекс № 22/2024, ст. 58–60; Закон 239/2025 (возмещение потерь)'), ref:src(L.land,T('Government draft decision 1036/MAIA/2026 (procedure example)','Проект постановления 1036/MAIA/2026 (пример процедуры)')) },
    { t:T('Apply for the grid-connection permit (aviz de racordare)','Подайте на разрешение на подключение (aviz de racordare)'), st:'req', who: op,
      how:T('File the application with the operator. The permit fixes the connection point, voltage, power and technical conditions, including metering and protection. Where capacity is short, it can be issued on "flexible conditions", with limits on injection or withdrawal. Several 2026 permits in Moldelectrica\'s register carry that flag, and one carries "zero extragere" (no withdrawal).',
            'Подайте заявку оператору. Разрешение фиксирует точку подключения, напряжение, мощность и технические условия, включая учёт и защиту. При нехватке мощности его могут выдать на «гибких условиях» с ограничением выдачи или потребления. Несколько разрешений 2026 г. в реестре Moldelectrica имеют такую отметку, одно — «zero extragere» (без потребления из сети).'),
      docs:T('Application; site plan and title; single-line diagram; equipment data (see the Equipment tab)','Заявление; план участка и правоустанавливающие документы; однолинейная схема; данные оборудования (см. вкладку «Оборудование»)'),
      time:T('Most permits in the register run 2 years (some 2026 ones 3–4 years) and are extendable. The plant may only be commissioned while the permit is valid (Moldelectrica).','Большинство разрешений в реестре действуют 2 года (некоторые 2026 г. — 3–4 года) и продлеваются. Ввод в эксплуатацию возможен только в срок действия разрешения (Moldelectrica).'),
      basis:T('Law 164/2025; ANRE connection regulation. A new regulation is in draft (consultation from 12 Nov 2025, reopened 26 Jan 2026): a performance guarantee within 2 months for storage of at least 1 MW injection, flexible connection, a waiting list, and capacity auctions in congested transmission zones.',
              'Закон 164/2025; регламент НАРЭ о подключении. Новый регламент в проекте (консультации с 12.11.2025, повторно с 26.01.2026): гарантия исполнения в течение 2 месяцев для накопителей с выдачей от 1 МВт, гибкое подключение, лист ожидания и аукционы мощности в перегруженных зонах передающей сети.'),
      ref:src(L.conn,T('ANRE draft connection regulation','Проект регламента НАРЭ о подключении'))+' · '+src(L.reg,T('Moldelectrica permit register','Реестр разрешений Moldelectrica')) },
    { t:T('Post the connection guarantee','Внесите гарантию по подключению'), st:'req', who:T('The operator that issued the permit','Оператор, выдавший разрешение'),
      how:T('Holders of permits above 200 kW must post a financial guarantee. If the capacity is not used, a non-use fee is charged against it.','Владельцы разрешений свыше 200 кВт обязаны внести финансовую гарантию. Если мощность не используется, из неё взимается плата за неиспользование.'),
      docs:T('Bank guarantee','Банковская гарантия'), time:T('Within 2 months of the permit, under the draft regulation','В течение 2 месяцев после разрешения, по проекту регламента'),
      basis:T('1,000 lei/kW, set by ANRE; non-use fee 50–70% of that amount (Ministry of Energy, Jul 2025)','1 000 леев/кВт, установлено НАРЭ; плата за неиспользование 50–70% этой суммы (Министерство энергетики, июль 2025)'),
      ref:src(L.guar,T('Ministry of Energy, Jul 2025','Министерство энергетики, июль 2025'))+' · '+src(L.guar200,T('Ministry of Energy: guarantees above 200 kW','Министерство энергетики: гарантии свыше 200 кВт')) },
    { t:T('Government authorisation (plants above 20 MW)','Разрешение Правительства (станции свыше 20 МВт)'), st: big ? 'req' : 'no', who:T('Ministry of Energy; authorisation commission; Government decision','Министерство энергетики; комиссия по авторизации; постановление Правительства'),
      how:T("Apply to the Ministry of Energy. An authorisation commission checks fit with energy policy, how credible the grid connection is, technical credibility, and land eligibility. The Government then authorises by decision. The 2026 example found is a 30 MW solar plant with storage. Whether a standalone battery above 20 MW falls under this article is worth confirming with the Ministry: ANRE's licence conditions apply the 20 MW rule to new plants in general.",
            'Подайте заявку в Министерство энергетики. Комиссия по авторизации проверяет соответствие энергополитике, надёжность подключения, техническую состоятельность и пригодность земли. Затем Правительство выдаёт разрешение постановлением. Найденный пример 2026 г. — солнечная станция 30 МВт с накопителем. Подпадает ли под эту статью автономная батарея свыше 20 МВт, стоит уточнить в Министерстве: условия лицензирования НАРЭ применяют правило 20 МВт к новым станциям в целом.'),
      docs:T('Connection permit; land rights; environmental agreement; technical description','Разрешение на подключение; права на землю; экологическое согласие; техническое описание'),
      time:T('Example: application 21 Apr 2026, commission acceptance 14 May 2026. The decision is valid 60 months.','Пример: заявка 21.04.2026, одобрение комиссии 14.05.2026. Постановление действует 60 месяцев.'),
      basis:T('Law 164/2025 art. 4(1)(g)','Закон 164/2025, ст. 4(1)(g)'), ref:src(L.gov,T('Draft Government decision 580/MEn/2026 and note','Проект постановления 580/MEn/2026 и записка')) },
    { t:T('Environmental assessment','Экологическая оценка'), st: s.type==='wind' ? 'req' : 'check', who:T('Environment Agency (Agenția de Mediu)','Агентство окружающей среды (Agenția de Mediu)'),
      how: s.type==='wind' ? T('Wind turbines over 20 m fall under Annex 2 of Law 86/2014, so file a preliminary evaluation request. The Agency decides whether a full EIA is needed.','Ветротурбины выше 20 м подпадают под Приложение 2 Закона 86/2014: подайте заявку на предварительную оценку. Агентство решит, нужна ли полная ОВОС.')
         : T('Battery storage is not listed in Law 86/2014. File a preliminary evaluation request anyway, or ask the Agency in writing: a new overhead line, or a solar plant alongside, can bring the project in. The 2026 example (30 MW solar with storage) holds an environmental agreement.','Накопители в Законе 86/2014 не перечислены. Всё равно подайте заявку на предварительную оценку или письменно запросите Агентство: новая ВЛ или солнечная станция рядом могут сделать оценку обязательной. У примера 2026 г. (30 МВт солнца с накопителем) есть экологическое согласие.'),
      docs:T('Request with the Annex 3 content (project description, site, expected effects)','Заявка с содержанием по Приложению 3 (описание проекта, участок, ожидаемое воздействие)'),
      time:T('Publication within 5 days; local authorities 10 working days; decision 20 working days. With a full EIA, add a report, 30 working days of consultation and a final decision within 30 working days. The agreement is valid 4 years, extendable by 1.','Публикация в течение 5 дней; местные органы — 10 рабочих дней; решение — 20 рабочих дней. При полной ОВОС добавляются отчёт, 30 рабочих дней консультаций и итоговое решение в течение 30 рабочих дней. Согласие действует 4 года, продлевается на 1 год.'),
      basis:T('Law 86/2014 on EIA, Annex 2 pt. 3(b), 3(i)','Закон 86/2014 об ОВОС, Приложение 2, п. 3(b), 3(i)'), ref:src(L.eia,T('UNDP guide to Law 86/2014','Руководство ПРООН по Закону 86/2014')) },
    { t:T('Urban planning certificate, detailed plan and building permit','Градостроительный сертификат, детальный план и разрешение на строительство'), st:'req', who:T('Town hall (primăria) of the site; architect; State Construction Inspectorate at completion','Примэрия по месту участка; архитектор; Государственная инспекция в строительстве при завершении'),
      how:T('Get the urban planning certificate for design, prepare a detailed urban plan (PUD) where required, have the project verified, then apply for the building permit. Fire-safety rules apply to the design. At the end, a completion and final acceptance procedure must be signed before the plant is energised.','Получите градостроительный сертификат на проектирование, при необходимости подготовьте детальный градостроительный план (PUD), пройдите проверку проекта, затем подайте на разрешение на строительство. К проекту применяются правила пожарной безопасности. В конце до подачи напряжения должна быть подписана приёмка по завершении и окончательная приёмка.'),
      docs:T('Certificate application; land documents; PUD; verified technical project; environmental agreement; connection permit','Заявление на сертификат; документы на землю; PUD; проверенный технический проект; экологическое согласие; разрешение на подключение'),
      time:T('Set by the Urban Planning and Construction Code; ask the town hall for its timetable','Определяется Кодексом о градостроительстве и строительстве; уточните сроки в примэрии'),
      basis:T('Urban Planning and Construction Code no. 434/2023; fire-safety rules HG 847/2022','Кодекс о градостроительстве и строительстве № 434/2023; правила пожарной безопасности ПП 847/2022'), ref:src(L.gov,T('Note to draft decision 580/MEn/2026 (lists PUD, certificate, building permit)','Записка к проекту 580/MEn/2026 (PUD, сертификат, разрешение)')) },
    { t:T('ANRE storage licence','Лицензия НАРЭ на хранение энергии'), st:'req', who:T('ANRE','НАРЭ (ANRE)'),
      how:T('Apply at ANRE headquarters, by registered post, by email with a qualified electronic signature, or through the permits portal (actpermisiv.gov.md). Storage is its own licence type under the new law. A co-located plant also needs a production licence for the generator.','Подайте заявление в НАРЭ лично, заказным письмом, по e-mail с квалифицированной электронной подписью или через портал разрешительных документов (actpermisiv.gov.md). По новому закону хранение — отдельный вид лицензии. Совмещённой станции нужна ещё лицензия на производство для генерации.'),
      docs:T("Declaration form (from ANRE's site); company registration; last year's financial statements, or a bank extract for a new company; documents showing the installation is technically compliant; qualified staff or a service contract; the administrator's education and clean record",'Форма заявления (на сайте НАРЭ); регистрация компании; финотчётность за прошлый год или банковская выписка для новой компании; документы о технической пригодности установки; квалифицированный персонал или договор обслуживания; образование и несудимость администратора'),
      time:T("ANRE's page gives no deadline; ask ANRE",'Срок на сайте НАРЭ не указан; уточните в НАРЭ'),
      basis:T('Law 164/2025 art. 20; licence fee 3,250 lei (Law 160/2011 art. 12¹⁰)','Закон 164/2025, ст. 20; сбор за лицензию 3 250 леев (Закон 160/2011, ст. 12¹⁰)'), ref:src(L.lic,T('ANRE licence conditions','Условия лицензирования НАРЭ'))+' · '+src(L.fee,T('ANRE fees','Сборы НАРЭ')) },
    { t:T('Grid-code compliance and admission into operation','Соответствие сетевым требованиям и допуск в эксплуатацию'), st:'req', who:T('Authorised electrician; the system operator','Аттестованный электрик; системный оператор'),
      how:T("Show compliance with the general connection requirements (ANRE Decision 108/2024) through tests and documents. Under the new law, storage installations are admitted into operation on an authorised electrician's declaration, issued through ANRE's eExamen system. The operator then issues the connection certificate.",'Подтвердите соответствие общим требованиям к подключению (Решение НАРЭ 108/2024) испытаниями и документами. По новому закону накопители допускаются в эксплуатацию по декларации аттестованного электрика через систему eExamen НАРЭ. Затем оператор выдаёт сертификат подключения.'),
      docs:T("Electrician's declaration (new form with a storage section); handover file; laboratory test report; compliance tests",'Декларация электрика (новая форма с разделом о накопителях); исполнительная документация; протокол лабораторных испытаний; испытания на соответствие'),
      time:T('The declaration is valid 3 years. The new ANRE regulation is planned to apply from 1 Jan 2027, replacing HCA 475/2021.','Декларация действует 3 года. Новый регламент НАРЭ планируется с 01.01.2027 вместо HCA 475/2021.'),
      basis:T('Law 164/2025 art. 72(18); ANRE Decision 108/2024','Закон 164/2025, ст. 72(18); Решение НАРЭ 108/2024'), ref:src(L.adm,T('ANRE draft admission regulation (summary)','Проект регламента НАРЭ о допуске (обзор)'))+' · '+src(L.rfg,T('ANRE Decision 108/2024','Решение НАРЭ 108/2024')) },
    { t:T('Register to trade','Зарегистрируйтесь для торговли'), st: s.arb ? 'req' : 'no', who:T('OPEM (day-ahead and intraday market operator)','OPEM (оператор рынка на сутки вперёд и внутрисуточного)'),
      how:T("Register as a market participant to buy and sell on the Moldovan day-ahead and intraday markets, and arrange balancing responsibility for your imbalances. OPEM's market has run commercially since December 2025.",'Зарегистрируйтесь участником рынка для покупки и продажи на молдавских рынках на сутки вперёд и внутрисуточном и оформите балансовую ответственность за свои небалансы. Рынок OPEM работает коммерчески с декабря 2025 г.'),
      docs:T("Per OPEM's participation rules",'По правилам участия OPEM'), time:T('Ask OPEM','Уточните в OPEM'), basis:T('ANRE designated OPEM as NEMO in 2025','НАРЭ назначило OPEM оператором NEMO в 2025 г.'), ref:src(L.opem,T('OPCOM/OPEM release, Aug 2026','Сообщение OPCOM/OPEM, август 2026')) },
    { t:T('Qualify for balancing services','Пройдите квалификацию на балансирующие услуги'), st: (s.frr||s.fcr) ? 'req' : 'no', who:'Moldelectrica',
      how:T("Pass Moldelectrica's technical qualification for the products you offer (RSF = FCR, RRFa = aFRR, RRFm = mFRR), then bid in the daily capacity auctions or the capacity tenders. Storage is explicitly eligible. In the 2025 tender, bids had to be at least 1 MW, equipment under 36 months old at commissioning, and connection approvals valid. Winners signed a capacity contract (CFCE) within 10 working days and posted a performance guarantee within 10 working days of signing.",
            'Пройдите техническую квалификацию Moldelectrica по предлагаемым продуктам (RSF = FCR, RRFa = aFRR, RRFm = mFRR), затем участвуйте в ежедневных аукционах мощности или тендерах. Накопители прямо допускаются. В тендере 2025 г. заявка — не менее 1 МВт, оборудование моложе 36 месяцев на момент ввода, действующие разрешения на подключение. Победители подписывали договор мощности (CFCE) в течение 10 рабочих дней и вносили гарантию исполнения в течение 10 рабочих дней после подписания.'),
      docs:T('Technical file; declaration of grid-code compliance; connection permit; action plan with milestones','Техническое досье; декларация соответствия сетевым требованиям; разрешение на подключение; план действий с этапами'),
      time:T('Daily auctions for contracts of up to one day; tenders as announced','Ежедневные аукционы на контракты до суток; тендеры — по объявлению'),
      basis:T('ANRE Decision 561/2025 (public service obligation); Electricity Market Rules (ANRE Decision 283/2020); Law 164/2025 art. 92(9)','Решение НАРЭ 561/2025 (обязательство публичной услуги); Правила рынка электроэнергии (Решение НАРЭ 283/2020); Закон 164/2025, ст. 92(9)'),
      ref:src(L.bal,T('Moldelectrica balancing capacity tender','Тендер Moldelectrica на балансирующую мощность'))+' · '+src(L.fse,T('Moldelectrica terms for providers','Условия Moldelectrica для поставщиков')) },
    { t:T('Incentives and financing','Льготы и финансирование'), st:'check', who:T('Customs Service; Ministry of Energy; banks','Таможенная служба; Министерство энергетики; банки'),
      how:T('The customs duty on batteries was cut from 5% to 0%. A state credit-guarantee instrument for storage loans was being set up in 2026. Wind projects from the second auction must add at least 0.25 MWh of storage per MW, so they are possible partners.','Таможенная пошлина на батареи снижена с 5% до 0%. В 2026 г. создавался государственный механизм гарантирования кредитов на накопители. Ветровые проекты второго аукциона обязаны добавить не менее 0,25 МВт·ч накопителя на МВт — это возможные партнёры.'),
      docs:T('Per instrument','По каждому инструменту'), time:'—', basis:T('Customs tariff change (WatchDog.MD, 2026); Ministry of Energy','Изменение таможенного тарифа (WatchDog.MD, 2026); Министерство энергетики'),
      ref:src(L.tax,'WatchDog.MD p.19')+' · '+src(L.guarantee,T('InfoMarket, Aug 2026','InfoMarket, август 2026'))+' · '+src(L.wind,T('Ministry of Energy, Jul 2026','Министерство энергетики, июль 2026')) },
  ];
  const label = {req:T('Required','Обязательно'), check:T('Check','Проверить'), no:T('Not needed for this project','Не нужно для этого проекта')};
  const dl = [T('Who','Кто'),T('How','Как'),T('Bring','Документы'),T('Time','Сроки'),T('Legal basis','Правовая основа'),T('Source','Источник')];
  document.getElementById('pSteps').innerHTML = steps.map(x=>`<li class="step ${x.st}">
    <div class="shead"><h3>${x.t}</h3><span class="pill ${x.st}">${label[x.st]}</span></div>
    <dl><dt>${dl[0]}</dt><dd>${x.who}</dd><dt>${dl[1]}</dt><dd>${x.how}</dd><dt>${dl[2]}</dt><dd>${x.docs}</dd><dt>${dl[3]}</dt><dd>${x.time}</dd><dt>${dl[4]}</dt><dd>${x.basis}</dd><dt>${dl[5]}</dt><dd>${x.ref}</dd></dl></li>`).join('');
}
document.getElementById('pLand').addEventListener('change', renderPermits);

/* ================= language ================= */
function renderAll(){ applyStatic(); drawShapes(); refresh(); calc(); renderRealised(); setLive(liveMsg.on, liveMsg.en, liveMsg.ru); fillSites(); renderEquipment(); renderPermits(); }
function setLang(l){ lang = l; try { localStorage.setItem('mgs-lang', l); } catch (e) {} renderAll(); }
document.querySelectorAll('.langsw button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
setupEquipment();
renderAll();
showView();
