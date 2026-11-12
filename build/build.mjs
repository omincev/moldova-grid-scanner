import fs from 'fs';
import * as topo from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
const lines = fs.readFileSync(process.argv[2]||'../data/moldelectrica_permits_2026-08-14.psv','utf8').trim().split('\n').slice(1);
const seats = {
 "Briceni":[48.36,27.08,"North"],"Donduseni":[48.22,27.61,"North"],"Soroca":[48.16,28.30,"North"],"Singerei":[47.64,28.14,"North"],
 "Glodeni":[47.77,27.52,"North"],"Falesti":[47.57,27.71,"North"],"Drochia":[48.03,27.81,"North"],"Riscani":[47.95,27.56,"North"],
 "Floresti":[47.89,28.30,"North"],"Balti":[47.76,27.93,"North"],
 "Orhei":[47.38,28.82,"Centre"],"Rezina":[47.75,28.96,"Centre"],"Soldanesti":[47.82,28.80,"Centre"],"Telenesti":[47.50,28.37,"Centre"],
 "Straseni":[47.14,28.61,"Centre"],"Ialoveni":[46.94,28.78,"Centre"],"Hincesti":[46.83,28.59,"Centre"],"Nisporeni":[47.08,28.18,"Centre"],
 "Ungheni":[47.21,27.80,"Centre"],"Chisinau":[47.01,28.86,"Centre"],"Anenii Noi":[46.88,29.23,"Centre"],
 "Stefan Voda":[46.51,29.66,"South"],"Causeni":[46.64,29.41,"South"],"Cimislia":[46.52,28.78,"South"],"Leova":[46.48,28.25,"South"],"Ceadir-Lunga":[46.06,28.83,"South"]};
const disp = {"Donduseni":"Dondușeni","Singerei":"Sîngerei","Falesti":"Fălești","Riscani":"Rîșcani","Floresti":"Florești","Balti":"Bălți",
 "Soldanesti":"Șoldănești","Telenesti":"Telenești","Straseni":"Strășeni","Hincesti":"Hîncești","Chisinau":"Chișinău","Stefan Voda":"Ștefan Vodă",
 "Causeni":"Căușeni","Cimislia":"Cimișlia","Ceadir-Lunga":"Ceadîr-Lunga"};
const typeMap = s => ({solar:/Solar|Fotovolt/.test(s), wind:/Eolian/.test(s), storage:/Stocare/.test(s), thermal:/Cogenerare|Motoare/.test(s)});
const rows = lines.map(l => { const [nr,issue,exp,ext,expExt,loc,point,type,mw,app] = l.split('|');
  let d = (loc.match(/r-(?:nul|l) ([A-Za-z\- ]+)$/)||loc.match(/r-nul ([A-Za-z\- ]+),/)||loc.match(/(?:mun\.|or\.) ([A-Za-z\- ]+)$/)||[])[1];
  if (!d && /Stefan Voda/.test(loc)) d='Stefan Voda';
  d = d.trim(); if(!seats[d]) throw new Error('no seat '+loc);
  const kv = (point.match(/(\d+) kV/)||[])[1];
  const sub = (point.match(/SE ([A-Z][A-Za-z\-\. ]+?) \d{2,3}\//)||point.match(/(CET Nord)/)||[])[1]||null;
  const eff = expExt||exp; const [dd,mm,yy]=eff.split('.');
  return {nr:+nr, issue, expiry:`${yy}-${mm}-${dd}`, district:d, name:disp[d]||d, point, kv: kv?+kv:null, sub, type, mw:+mw, applicant:app, ...typeMap(type)}; });
const proj = geoMercator();
const topoData = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-10m.json'));
const fc = topo.feature(topoData, topoData.objects.countries);
const md = fc.features.find(f=>f.properties.name==='Moldova');
const W=520,H=640; proj.fitExtent([[24,24],[W-24,H-24]], md);
const path = geoPath(proj); const pathD = path(md).replace(/(\d+\.\d{1})\d+/g,'$1');
const P = ([lat,lon]) => proj([lon,lat]).map(v=>+v.toFixed(1));
const districts = Object.fromEntries(Object.entries(seats).map(([k,[la,lo,r]])=>[k,{name:disp[k]||k, region:r, xy:P([la,lo]), ll:[la,lo]}]));
const nodes = [
 {id:"chi",name:"Chișinău",kv:"400/330/110",ll:[47.00,28.90]},{id:"bal",name:"Bălți",kv:"330/110",ll:[47.78,27.95]},
 {id:"str",name:"Strășeni",kv:"330",ll:[47.13,28.58]},{id:"vul",name:"Vulcănești",kv:"400",ll:[45.68,28.40]},
 {id:"mgr",name:"MGRES",kv:"400/330",ll:[46.62,29.92]},{id:"rib",name:"Rîbnița",kv:"330",ll:[47.77,29.00]}].map(n=>({...n,xy:P(n.ll)}));
const ext = {isa:P([45.27,28.46]), suc:P([47.65,26.25]), gut:P([46.55,26.85])};
const data = JSON.stringify({rows, districts, nodes, ext, outline:pathD, W, H});
fs.writeFileSync('data.json', data);
fs.writeFileSync('../site/index.html', fs.readFileSync('template.html','utf8').replace('__DATA__', data));
const agg={}; rows.forEach(r=>{agg[r.district]??={mw:0,n:0}; agg[r.district].mw+=r.mw; agg[r.district].n++;});
console.log(Object.entries(agg).sort((a,b)=>b[1].mw-a[1].mw).map(([k,v])=>`${k}:${v.mw.toFixed(1)}/${v.n}`).join('  '));
console.log('total', rows.reduce((s,r)=>s+r.mw,0).toFixed(1), rows.length, 'pathlen', pathD.length);
