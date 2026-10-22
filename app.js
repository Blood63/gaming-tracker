"use strict";
/* ========== utilitaires ========== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TZ={timeZone:'Europe/Paris'};
const fdate=s=>s?new Date(s).toLocaleDateString('fr-FR',{...TZ,day:'numeric',month:'short',year:'numeric'}):'—';
const fshort=s=>s?new Date(s).toLocaleDateString('fr-FR',{...TZ,day:'numeric',month:'short'}):'—';
const fnum=(v,d=0)=>v==null||isNaN(v)?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const num=v=>typeof v=='number'&&isFinite(v)?v:null;
const ago=t=>{const d=Math.floor((Date.now()-t)/864e5);return d<=0?"aujourd'hui":d==1?'hier':d<30?`il y a ${d} j`:d<365?`il y a ${Math.round(d/30)} mois`:`il y a ${Math.round(d/365)} an(s)`};
const get=async(f,j=true)=>{try{const r=await fetch(f+'?v='+Date.now());if(!r.ok)return null;return j?await r.json():await r.text()}catch(e){return null}};
const jl=async f=>((await get(f,false))||'').trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(Boolean);
const COL={cy:'#22d3ee',vi:'#a855f7',gr:'#4ade80',pk:'#e879f9',warn:'#fbbf24',bad:'#fb7185',bl:'#60a5fa',or:'#fb923c',rlA:'#3b82f6',rlB:'#22c55e'};
COL.val='#ff4655';
document.addEventListener('touchstart',()=>{},{passive:true});
{const up=()=>document.querySelectorAll('.press').forEach(e=>e.classList.remove('press'));document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest(document.body.dataset.skin=='px'?'.px,.back':'.px');if(b&&e.pointerType!='mouse')b.classList.add('press')},{passive:true});['pointerup','pointercancel','scroll'].forEach(t=>document.addEventListener(t,up,{passive:true,capture:true}))}
const COL0={...COL},THC={rl1:{cy:'#ff9fd2',vi:'#b57bff',pk:'#ffc6e6',bl:'#c3a6ff',or:'#f3e6f0',gr:'#7ee0b5',rlA:'#ff9fd2',rlB:'#b57bff'},
 rl2:{cy:'#ff3fb4',vi:'#62d0ff',pk:'#ff7fcf',bl:'#62d0ff',or:'#ff9a3c',rlA:'#ff3fb4',rlB:'#62d0ff'},
 cod:{cy:'#4fd3ff',vi:'#ff8a3d',pk:'#9be7ff',bl:'#4fd3ff',or:'#ff8a3d'},
 omen:{cy:'#a594ff',vi:'#7c5cff',pk:'#c9a8ff',bl:'#6f8bff',val:'#a594ff'},
 sage:{cy:'#3ee6b8',vi:'#2cc4d9',pk:'#8ff5d6',bl:'#2cc4d9',gr:'#3ee6b8',val:'#3ee6b8'}},THM={rl1:['#d6c2d4','rgba(255,159,210,.13)'],rl2:['#b8bcc8','rgba(255,63,180,.12)'],cod:['#a9bfd0','rgba(79,211,255,.12)'],omen:['#b8b0dc','rgba(165,148,255,.12)'],sage:['#a8cfc5','rgba(62,230,184,.12)']};
const rlCar=()=>localStorage.getItem('gt-rl-car')=='2'?2:1;
// RL : un seul thème « rl » (règles communes) + data-car (1 = Huracán rose/nacre/violet, 2 = Fennec noir carbone/rose néon/bleu phares)
function setTheme(t){const b=document.body,car=t=='rl'?String(rlCar()):'';if(b.dataset.theme==(t||'')&&(b.dataset.car||'')==car)return;b.dataset.theme=t||'';if(car)b.dataset.car=car;else delete b.dataset.car;const k=t=='rl'?'rl'+car:t;Object.assign(COL,COL0,THC[k]||{});if(window.Chart){Chart.defaults.color=THM[k]?.[0]||'#9692c2';Chart.defaults.borderColor=THM[k]?.[1]||'rgba(160,150,255,.1)'}}
const AGENTS=[{id:'omen',n:'Omen',d:'assets/val-omen.webp',m:'assets/val-omen-m.webp',av:'assets/val-omen-av.webp',q:'Ombres et téléportation',alt:'Omen, agent de l\'ombre violet, orbe lumineux'},{id:'sage',n:'Sage',d:'assets/val-sage.webp',m:'assets/val-sage-m.webp',av:'assets/val-sage-av.webp',q:'Soins et murs de cristal',alt:'Sage, visage partagé entre peau et cristal turquoise'}];
const valAgent=()=>localStorage.getItem('gt-val-agent')=='sage'?'sage':'omen';
function valHero(A,M){const c=valAgent();return `<div class="garage vhero" id="vhero" role="group" aria-label="Agent du thème Valorant">${AGENTS.map(x=>`<picture><source media="(max-width:700px)" srcset="${x.m}" width="760" height="465"><img src="${x.d}" width="1100" height="460" alt="${esc(x.alt)}" decoding="async" ${x.id==c?'class="on" fetchpriority="high"':'loading="lazy"'} data-ag="${x.id}"></picture>`).join('')}<div class="sw">${AGENTS.map(x=>`<button type="button" data-agb="${x.id}" aria-pressed="${x.id==c}"><img src="${x.av}" width="24" height="30" alt="">${x.n}</button>`).join('')}</div><div class="ov">${A.card?`<img class="vcard" src="${esc(A.card)}" width="52" height="52" alt="">`:''}<div><h3>Valorant</h3><span class="pill">${esc(A.name)}#${esc(A.tag)}</span><span class="pill">Niv. ${fnum(A.level)}</span><span class="pill">${esc((A.region||'').toUpperCase())}</span><span class="pill vq">${esc(AGENTS.find(x=>x.id==c).q)}</span></div></div></div>`}
function bindValHero(){const g=$('#vhero');if(!g)return;const set=id=>{localStorage.setItem('gt-val-agent',id);g.querySelectorAll('img[data-ag]').forEach(i=>i.classList.toggle('on',i.dataset.ag==id));g.querySelectorAll('[data-agb]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.agb==id));const q=g.querySelector('.vq');if(q)q.textContent=AGENTS.find(x=>x.id==id).q;setTheme(id);charts.forEach(ch=>{try{ch.destroy()}catch(e){}});charts=[];valPage()};
 g.onclick=e=>{const b=e.target.closest('[data-agb]');if(b){e.stopPropagation();if(b.dataset.agb!=valAgent())set(b.dataset.agb);return}set(valAgent()=='omen'?'sage':'omen')}}
const CARS=[{id:1,n:'Huracán STO',d:'assets/rl-car1.webp',m:'assets/rl-car1-m.webp',alt:'Lamborghini Huracán STO rose et blanche, étoiles et cœurs, jantes violettes'},{id:2,n:'Fennec',d:'assets/rl-car2.webp',m:'assets/rl-car2-m.webp',alt:'Fennec noir déco Gentle Mates, roues Torque roses, chapeau cactus'}];
function rlGarage(){const c=+(localStorage.getItem('gt-rl-car')||1);return `<div class="garage" id="garage" role="group" aria-label="Mon garage Rocket League">${CARS.map(x=>`<picture><source media="(max-width:700px)" srcset="${x.m}" width="760" height="465"><img src="${x.d}" width="1029" height="430" alt="${esc(x.alt)}" decoding="async" ${x.id==c?'class="on" fetchpriority="high"':'loading="lazy"'} data-car="${x.id}"></picture>`).join('')}<div class="sw">${CARS.map(x=>`<button type="button" data-carb="${x.id}" aria-pressed="${x.id==c}">${esc(x.n)}</button>`).join('')}</div><div class="ov"><h3>Rocket League</h3><span class="pill">443Blood · Epic</span><span class="pill">🚗 Mon garage · touche pour changer</span></div></div>`}
let carT=0;
function bindGarage(){const g=$('#garage');if(!g)return;const set=id=>{if(String(id)==String(rlCar()))return;localStorage.setItem('gt-rl-car',id);g.querySelectorAll('img').forEach(i=>i.classList.toggle('on',i.dataset.car==id));g.querySelectorAll('[data-carb]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.carb==id));
  // fondu des couleurs (transitions limitées à quelques éléments, ~0,5 s) puis graphiques recolorés ; la bannière garage est conservée pour son fondu d'image
  const B=document.body;B.classList.add('carfx');clearTimeout(carT);carT=setTimeout(()=>B.classList.remove('carfx'),700);setTheme('rl');
  const y=scrollY;charts.forEach(ch=>{try{ch.destroy()}catch(e){}});charts=[];rlManual();const n=$('#garage');if(n&&n!==g){n.replaceWith(g)}scrollTo(0,y)};
 g.onclick=e=>{const b=e.target.closest('[data-carb]');if(b){e.stopPropagation();return set(b.dataset.carb)}const cur=+(localStorage.getItem('gt-rl-car')||1);set(cur==1?2:1)}}
const PAL=[COL.cy,COL.vi,COL.gr,COL.pk,COL.warn,COL.bl,COL.or,COL.bad];
if(window.Chart){Chart.defaults.color='#9692c2';Chart.defaults.borderColor='rgba(160,150,255,.1)';Chart.defaults.font.family='Rajdhani,system-ui';Chart.defaults.font.size=12;Chart.defaults.maintainAspectRatio=false;Chart.defaults.plugins.legend.labels.boxWidth=10;Chart.defaults.plugins.legend.position='bottom';Chart.defaults.interaction={mode:'index',intersect:false,axis:'x'};Chart.defaults.plugins.tooltip={enabled:true,mode:'index',intersect:false,axis:'x',position:'nearest',caretSize:8,padding:10,titleFont:{size:13,weight:'bold'},bodyFont:{size:13},callbacks:{label:c=>` ${c.dataset.label?c.dataset.label+' : ':''}${c.parsed&&c.parsed.y!=null?fnum(c.parsed.y,Number.isInteger(c.parsed.y)?0:2):c.formattedValue}`}};Chart.defaults.elements.point.hitRadius=18;Chart.defaults.elements.point.hoverRadius=7;Chart.register({id:'gtCross',afterDatasetsDraw(ch){if(['doughnut','pie','polarArea','radar'].includes(ch.config.type))return;const a=ch.getActiveElements&&ch.getActiveElements()[0];if(!a||!a.element)return;const{ctx,chartArea:{top,bottom}}=ch,x=a.element.x;ctx.save();ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.lineWidth=1;ctx.strokeStyle='rgba(235,230,255,.6)';ctx.setLineDash([4,4]);ctx.stroke();ctx.restore()}})}
let charts=[];
const chart=(el,cfg)=>{if(!el||!window.Chart)return;try{
  cfg.options=cfg.options||{};const type=cfg.type||cfg.data?.datasets?.[0]?.type||'line',arc=['doughnut','pie','polarArea'].includes(type);
  cfg.options.interaction=arc?{mode:'nearest',intersect:true,axis:'xy'}:{mode:'index',intersect:false,axis:'x'};
  cfg.options.plugins=cfg.options.plugins||{};cfg.options.plugins.tooltip={...(cfg.options.plugins.tooltip||{}),enabled:false};
  const read=document.createElement('div');read.className='chart-read';read.innerHTML='<span class="mut">👆 Glisse sur le graphique (ou touche un point / une part) pour voir ses valeurs.</span>';const host=el.closest('.chart')||el.parentNode;if(host.previousElementSibling?.classList.contains('chart-read'))host.previousElementSibling.remove();host.parentNode.insertBefore(read,host);if(arc&&host.offsetHeight<300)host.style.height='300px';
  cfg.options.layout={padding:{top:2,bottom:2},...(cfg.options.layout||{})};
  cfg.options.plugins.legend={...(cfg.options.plugins.legend||{}),labels:{usePointStyle:true,pointStyle:'circle',boxWidth:7,boxHeight:7,padding:10,font:{size:11},...((cfg.options.plugins.legend||{}).labels||{})}};
  if(cfg.options.scales)for(const[k,v]of Object.entries(cfg.options.scales)){v.ticks={font:{size:11},maxTicksLimit:k=='x'?6:8,...(v.ticks||{})}}
  const mk=()=>{if(!el.isConnected||!read.isConnected)return;Chart.getChart(el)?.destroy();const ch=new Chart(el,cfg);ch.$read=read;charts.push(ch);bindCursor(ch,arc);
  // valeur par défaut : dernier point, pour que le cadre ne soit jamais vide
  const n=Math.max(0,...cfg.data.datasets.map(d=>(d.data||[]).length));for(let i=n-1;i>=0;i--){const els=cfg.data.datasets.map((d,di)=>({datasetIndex:di,index:i})).filter(e=>cfg.data.datasets[e.datasetIndex].data[i]!=null);if(els.length){ch.setActiveElements(els);showRead(ch,els);ch.draw();break}}};
  chartQ.push(()=>{try{mk()}catch(e){console.error(e)}});if(!chartQ.t)chartQ.t=requestAnimationFrame(()=>setTimeout(chartRun,0));
 }catch(e){console.error(e)}};
const chartQ=[];function chartRun(){const f=chartQ.shift();if(f)f();if(chartQ.length)chartQ.t=requestAnimationFrame(()=>setTimeout(chartRun,0));else chartQ.t=0}
const mkDP=(ch,di,idx)=>{const ds=ch.data.datasets[di],raw=ds.data[idx];return{dataset:ds,datasetIndex:di,dataIndex:idx,label:ch.data.labels?ch.data.labels[idx]:'',raw,parsed:{y:raw&&typeof raw=='object'?raw.y:raw,x:raw&&typeof raw=='object'?raw.x:idx},formattedValue:raw==null?'—':(typeof raw=='object'?String(raw.y??''):String(raw))}};
function showRead(ch,els){if(!ch.$read||!els.length)return;const cb=ch.config.options?.plugins?.tooltip?.callbacks||{};
  const dps=els.map(e=>mkDP(ch,e.datasetIndex,e.index));let title='';
  if(cb.title){try{title=cb.title(dps)}catch(e){}} if(!title)title=dps[0].raw&&dps[0].raw.x?fdate(dps[0].raw.x):String(dps[0].label||'');
  const lines=dps.map(dp=>{let lab='';if(cb.label){try{lab=cb.label(dp)}catch(e){}}
    if(!lab){const v=dp.parsed.y;lab=`${dp.dataset.label?dp.dataset.label+' : ':''}${v==null?'—':fnum(v,Number.isInteger(v)?0:2)}`}
    let col=dp.dataset.borderColor||dp.dataset.backgroundColor;if(Array.isArray(col))col=col[dp.dataIndex];
    return `<span class="cri"><i style="background:${col||'#aab'}"></i>${esc(String(lab).trim())}</span>`}).join('');
  if(title&&lines.replace(/<[^>]+>/g,'').trim().startsWith(String(title).trim()))title='';
  ch.$read.innerHTML=`${title?`<b>${esc(String(title))}</b> `:''}${lines}`}
function bindCursor(ch,arc){const c=ch.canvas;let down=false;
  const pick=e=>{const els=ch.getElementsAtEventForMode(e,arc?'nearest':'index',{intersect:arc,axis:arc?'xy':'x'},true);if(els.length){ch.setActiveElements(els);showRead(ch,els);ch.draw()}};
  c.addEventListener('pointerdown',e=>{down=true;pick(e)});
  c.addEventListener('pointermove',e=>{if(e.pointerType=='mouse'||down)pick(e)});
  const end=()=>{down=false};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('pointerleave',()=>{ch.setActiveElements([]);ch.draw()});
}
const lineDS=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color+'2a',fill:true,tension:.35,pointRadius:3,pointHoverRadius:6,borderWidth:2,spanGaps:true,...extra});
const bar=(p,cls='')=>p==null?'':`<div class="bar ${cls}"><i data-w="${Math.max(0,Math.min(100,p))}"></i></div>`;
const animBars=()=>setTimeout(()=>$$('.bar i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'),80);
const stat=(k,v,d='',cls='')=>`<div class="glass stat ${cls}"><div class="k">${esc(k)}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)};

const SETUP_ISSUE='https://github.com/Blood63/gaming-tracker/issues/new?template=setup.yml';
const RTIERS=['Novice','Vétéran','Élite','Pro','Maître','Grand Maître','Légendaire'],RICON=['🔰','🥉','🥈','🥇','💎','👑','🔥'];
/* Échelle COD Mobile (vérifiée oct. 2026) : divisions I–V de Novice à Pro, puis points seuls. Seuils = points de rang. */
const COD_SUB=['I','II','III','IV','V'];
const COD_LADDER=[['Novice',0,5],['Vétéran',1001,5],['Élite',2001,5],['Pro',3001,5],['Maître',4501,0],['Grand Maître',6001,0],['Légendaire',8001,0]];
const COD_STEPS=[];COD_LADDER.forEach(([n,p,d],ti)=>{if(d)for(let i=0;i<d;i++)COD_STEPS.push({tier:n,sub:COD_SUB[i],pts:p+Math.round(i*(ti<3?200:300))});else COD_STEPS.push({tier:n,sub:null,pts:p})});
const codStepVal=(tier,sub)=>{const i=COD_STEPS.findIndex(x=>x.tier==tier&&(x.sub||null)==(sub||null));return i<0?null:i+1};
const codPtsOf=(tier,sub,points)=>points!=null?points:(COD_STEPS[codStepVal(tier,sub)-1]?.pts??null);
const codBtn=(cls='')=>`<a class="btn ${cls}" href="#/cod/ajouter">📸 Ajouter une partie COD</a>`;

/* ========== données ========== */
const D={};
async function load(){
  const [steamH,store,val,rl,cod,codp,codr,setup,vh,gj,rlm,bc,sach]=await Promise.all([jl('history/steam.jsonl'),get('store.json'),jl('history/valorant.jsonl'),jl('history/rocket_league.jsonl'),get('cod_mobile.json'),get('cod_profile.json'),get('cod_ranks.json'),get('setup.json'),get('valorant.json'),get('goals.json'),get('rocket_league.json'),get('ballchasing_latest.json'),get('steam_achievements.json')]);
  D.steamH=steamH.filter(x=>x.games&&x.games.length);D.steam=D.steamH.at(-1)||null;D.store=(store&&store.apps)||{};D.storeAt=store&&store.fetched_at;
  D.val=val;D.rl=rl;D.codRepo=((cod&&cod.matches)||[]);D.cod=[];
  D.games=(D.steam?.games||[]).map(g=>{const s=D.store[g.appid]||{};return{...g,st:s,pct:g.ach_total?Math.round(100*(g.ach_unlocked||0)/g.ach_total):null,
    img:s.header_image||`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,genres:s.genres||[],last:g.rtime_last_played?g.rtime_last_played*1000:null}});
  D.codCard=(codp&&codp.player_card)||null;{const p=LS.get('gt-cod-card',null);if(p&&D.codCard&&p.level==D.codCard.level&&p.clan==D.codCard.clan&&p.likes==D.codCard.likes)localStorage.removeItem('gt-cod-card')}D.codP=((codp&&codp.history)||[]).sort((a,b)=>a.date<b.date?-1:1);D.cp=D.codP.at(-1)||null;
  D.ranksRepo={MP:(codr?.MP||[]).slice().sort((a,b)=>a.date<b.date?-1:1),BR:(codr?.BR||[]).slice().sort((a,b)=>a.date<b.date?-1:1)};D.ranks={MP:[],BR:[]};for(const m of['MP','BR'])D.ranksRepo[m]=D.ranksRepo[m].map(codRankNorm);codRankRefresh();
  D.setup=setup;D.vh=vh&&vh.mmr?vh:null;D.goals=(gj&&gj.goals)||[];codRefresh();D.rlm=rlm&&rlm.playlists?rlm:null;D.bc=bc||null;D.sach=sach&&sach.games?sach:null;
  D.totalH=D.games.reduce((a,x)=>a+(x.hours||0),0);
  D.ach=D.games.reduce((a,x)=>a+(x.ach_unlocked||0),0);D.achT=D.games.reduce((a,x)=>a+(x.ach_total||0),0);
  D.vOk=trnOk(D.val);D.rOk=trnOk(D.rl);
  const last=[D.steam?.fetched_at,D.vh?.fetched_at,D.val.at(-1)?.fetched_at,D.rl.at(-1)?.fetched_at].filter(Boolean).sort().at(-1);
  if(last)$('#upd').innerHTML=`MAJ<br>${fshort(last)}`;
  computeXP();
}
/* COD */
const sum=(a,k)=>a.reduce((s,x)=>s+(num(x[k])||0),0);
const kdOf=a=>{const k=a.filter(x=>num(x.kills)!=null&&num(x.deaths)!=null);return k.length?sum(k,'kills')/Math.max(1,sum(k,'deaths')):null};
const isWin=x=>x.result=='win'||(x.type=='BR'&&x.placement==1);
const wr=a=>{const r=a.filter(x=>x.result||(x.type=='BR'&&x.placement!=null));return r.length?100*r.filter(isWin).length/r.length:null};
const avg=(a,k)=>{const v=a.map(x=>num(x[k])).filter(v=>v!=null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};
/* tracker.gg */
const trnOk=h=>h.filter(x=>x.status=='ok'&&x.raw&&x.raw.data);
const segs=x=>(x?.raw?.data?.segments||[]);
const overview=x=>segs(x).find(s=>s.type=='overview')||segs(x)[0];
const S=(seg,k)=>seg&&seg.stats&&seg.stats[k];
const sv=(x,k)=>num(S(overview(x),k)?.value);

/* ========== niveau / XP ========== */
const TIERS=[{n:'Recrue',e:'🥚',l:1},{n:'Apprenti',e:'🎮',l:5},{n:'Soldat',e:'🪖',l:10},{n:'Vétéran',e:'🛡️',l:15},{n:'Élite',e:'⚔️',l:22},{n:'Champion',e:'🏆',l:30},{n:'Maître',e:'💠',l:40},{n:'Grand Maître',e:'👑',l:50},{n:'Légende',e:'🔥',l:65}];
const needXP=L=>75*L*(L-1); // XP cumulée pour atteindre le niveau L
function computeXP(){
  const perfect=D.games.filter(g=>g.ach_total&&g.ach_unlocked==g.ach_total).length;
  const vl=D.vOk.at(-1),rl=D.rOk.at(-1);
  const src=[
    ['⏱️ Temps de jeu Steam',`${fnum(D.totalH,1)} h × 10`,Math.round(D.totalH*10)],
    ['🏆 Succès Steam',`${D.ach} × 25`,D.ach*25],
    ['💯 Jeux complétés à 100 %',`${perfect} × 500`,perfect*500],
    ['⭐ Niveau Steam',`${D.steam?.level??0} × 100`,(D.steam?.level||0)*100],
    ['🔫 Parties COD Mobile',`${D.cod.length} × 20 + victoires × 30 + kills × 2`,D.cod.length*20+D.cod.filter(m=>m.result=='win').length*30+sum(D.cod,'kills')*2]];
  if(D.cp){const mp=D.cp.multiplayer||{},br=D.cp.battle_royale||{};src.push(['🪖 Carrière COD Mobile',`(${fnum((mp.matches||0)+(br.matches||0))} parties) × 2 + victoires BR × 10 + meilleur joueur × 5`,Math.round(((mp.matches||0)+(br.matches||0))*2+(br.wins||0)*10+((mp.mvp||0)+(br.mvp||0))*5)])}
  if(D.vh){const se=D.vh.mmr.seasons,g=se.reduce((a,x)=>a+(x.games||0),0),w=se.reduce((a,x)=>a+(x.wins||0),0),nc=D.vh.matches.filter(x=>x.mode!='Competitive').length;src.push(['🎯 Valorant',`(${fnum(g)} parties classées + ${nc} autres) × 20 + ${fnum(w)} victoires × 30 + niv. ${D.vh.account.level} × 20`,(g+nc)*20+w*30+(D.vh.account.level||0)*20])}
  else if(vl)src.push(['🎯 Valorant',`parties × 20 + victoires × 30`,Math.round((sv(vl,'matchesPlayed')||0)*20+(sv(vl,'matchesWon')||0)*30)]);
  if(rl)src.push(['⚽ Rocket League',`victoires × 30`,Math.round((sv(rl,'wins')||0)*30)]);
  const xp=src.reduce((a,x)=>a+x[2],0);let L=1;while(needXP(L+1)<=xp)L++;
  const tier=[...TIERS].reverse().find(t=>L>=t.l),next=TIERS[TIERS.indexOf(tier)+1];
  D.xp={xp,src,L,tier,next,cur:xp-needXP(L),span:needXP(L+1)-needXP(L)};
}
const ring=(p,size=96)=>{const r=42,c=2*Math.PI*r;return `<svg viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${COL.cy}"/><stop offset="1" stop-color="${COL.vi}"/></linearGradient></defs><circle cx="48" cy="48" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="8" fill="none"/><circle class="rg" cx="48" cy="48" r="${r}" stroke="url(#g)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c*(1-p/100)}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 0 6px ${COL.cy})"/></svg>`};
const animRings=()=>setTimeout(()=>$$('circle.rg').forEach(c=>c.style.strokeDashoffset=c.dataset.off),80);
const levelCard=(link=true)=>{const x=D.xp,p=100*x.cur/x.span;return `<${link?'a href="#/profil"':'div'} class="glass prof" style="color:var(--txt)"><div class="lvl">${ring(p)}<div class="c"><small>NIV.</small><b>${x.L}</b></div></div>
 <div style="flex:1;min-width:0"><div class="tiername">${x.tier.e} ${x.tier.n}</div><div class="mut" style="font-size:.85rem">${fnum(x.xp)} XP · ${fnum(x.span-x.cur)} XP avant le niv. ${x.L+1}</div>${bar(p,'big')}
 ${x.next?`<div class="mut" style="font-size:.78rem;margin-top:.3rem">Prochain rang : ${x.next.e} ${x.next.n} (niv. ${x.next.l})</div>`:''}</div>${link?'<span class="chev">›</span>':''}</${link?'a':'div'}>`};

/* ========== genres / styles ========== */
const SKIP_GENRES=['Free-to-Play','Free To Play','Indépendant','Accès anticipé','Gratuit'];
const STYLES=['Action','Aventure / Narratif','RPG','Tir / FPS','Stratégie','Sport / Course','Social / Multi'];
const isShooter=g=>/call of duty|counter-strike|valorant|battlefield|apex|overwatch/i.test(g.name||'');
function tastes(){
  const genres={},styles=Object.fromEntries(STYLES.map(s=>[s,0]));const notes=[];
  const add=(k,h)=>genres[k]=(genres[k]||0)+h;
  for(const g of D.games){if(!(g.hours>0))continue;
    const gs=g.genres.filter(x=>!SKIP_GENRES.includes(x));const list=gs.length?gs:['Autre'];
    list.forEach(x=>add(x,g.hours/list.length));
    const st=new Set();gs.forEach(x=>{if(/action/i.test(x))st.add('Action');if(/aventure/i.test(x))st.add('Aventure / Narratif');if(/rpg/i.test(x))st.add('RPG');if(/strat|simul/i.test(x))st.add('Stratégie');if(/sport|course/i.test(x))st.add('Sport / Course');if(/massivement|occasionnel/i.test(x))st.add('Social / Multi')});
    if(isShooter(g))st.add('Tir / FPS');if((g.st.categories||[]).some(c=>/JcJ|multijoueur en ligne/i.test(c)))st.add('Social / Multi');
    if(!st.size)st.add('Action');st.forEach(s=>styles[s]+=g.hours/st.size);}
  const ext=[];
  const v=D.vOk.at(-1),r=D.rOk.at(-1);
  if(D.vh){const se=D.vh.mmr.seasons,g=se.reduce((a,x)=>a+(x.games||0),0)+D.vh.matches.filter(x=>x.mode!='Competitive').length,L=D.vh.matches.filter(x=>x.length_s),ml=L.length?L.reduce((a,x)=>a+x.length_s,0)/L.length/3600:0.6,h=g*ml;if(h){add('FPS tactique',h);styles['Tir / FPS']+=h;styles['Social / Multi']+=h/3;notes.push(`Valorant : ${fnum(g)} parties × ${fnum(ml*60,0)} min en moyenne ≈ ${fnum(h,0)} h (estimation)`)}}
  else if(v){const h=(sv(v,'timePlayed')||0)/3600||(sv(v,'matchesPlayed')||0)*0.6;if(h){add('FPS tactique',h);styles['Tir / FPS']+=h;ext.push('Valorant')}}
  if(r){const m=segs(r).filter(s=>s.type=='playlist').reduce((a,s)=>a+(num(S(s,'matchesPlayed')?.value)||0),0)||(sv(r,'wins')||0)*2;const h=m*0.1;if(h){add('Sport / Voiture',h);styles['Sport / Course']+=h;ext.push('Rocket League')}}
  const codH=D.cp?.recap_2025?.online_hours_2025;
  if(codH){add('FPS',codH);styles['Tir / FPS']+=codH;styles['Social / Multi']+=codH/2;notes.push(`COD Mobile : ${codH} h en ligne en 2025 (rétrospective en jeu)`)}
  else if(D.cod.length){const h=D.cod.length*0.15;add('FPS',h);styles['Tir / FPS']+=h;styles['Social / Multi']+=h/2;notes.push('COD Mobile : ≈9 min par partie (estimation)')}
  if(ext.length)notes.push(ext.join(', ')+' : temps estimé à partir des parties');
  return{genres:Object.entries(genres).sort((a,b)=>b[1]-a[1]),styles,notes};
}

/* ========== badges ========== */
function badges(){
  const g=D.games,maxH=Math.max(0,...g.map(x=>x.hours||0)),played=g.filter(x=>x.hours>0||x.last),gen=new Set(g.filter(x=>x.hours>0).flatMap(x=>x.genres.filter(y=>!SKIP_GENRES.includes(y))));
  const perfect=g.filter(x=>x.ach_total&&x.ach_unlocked==x.ach_total).length,last10=D.cod.slice(-10),goalsDone=goals().filter(x=>goalProg(x).p>=100).length;
  const B=[['🎮','Première manette','Jouer 1 h',D.totalH,1],['💯','Centurion','100 h de jeu au total',D.totalH,100],['🌋','Millénaire','1 000 h de jeu',D.totalH,1000],
   ['📚','Collectionneur','Posséder 15 jeux',g.length,15],['🏃','Marathonien','50 h sur un même jeu',maxH,50],['🏆','Chasseur de trophées','100 succès débloqués',D.ach,100],
   ['🎖️','Perfectionniste','Un jeu à 100 % des succès',perfect,1],['🧭','Explorateur','Jouer à 6 genres différents',gen.size,6],
   ['🔥','En forme','Jouer dans les 2 dernières semaines',(D.steam?.recent?.games||[]).length,1],['🧹','Zéro backlog','Lancer tous ses jeux',played.length,g.length||1],
   ['🔫','Premier sang','1ʳᵉ partie COD Mobile enregistrée',D.cod.length,1],['📈','Régulier','10 parties COD Mobile',D.cod.length,10],
   ['💀','Machine à tuer','K/D ≥ 1,5 sur les 10 dernières parties COD',last10.length>=10?kdOf(last10)||0:0,1.5],
   ['🎖️','Vétéran COD','10 000 parties COD Mobile (carrière)',(D.cp?.multiplayer?.matches||0)+(D.cp?.battle_royale?.matches||0),10000],['💥','Faucheur','100 000 éliminations COD Mobile',(D.cp?.multiplayer?.kills||0)+(D.cp?.battle_royale?.kills||0),100000],['🐔','Survivant','500 victoires Battle Royale',D.cp?.battle_royale?.wins||0,500],['👑','Légendaire','Atteindre le grade Légendaire en classé',(/l[ée]gendaire/i.test(D.cp?.recap_2025?.best_rank_ever||'')||[...D.ranks.MP,...D.ranks.BR].some(x=>x.tier=='Légendaire'))?1:0,1],
   ['🎯','Agent','Valorant connecté',D.vh?1:D.vOk.length,1],['🚗','Pilote','Rocket League connecté',D.rOk.length,1],['🎯','Déterminé','Atteindre un objectif',goalsDone,1]];
  return B.map(([e,n,d,c,t])=>({e,n,d,c,t,ok:c>=t,p:Math.min(100,100*c/t)}));
}

/* ========== objectifs (stockés sur l'appareil) ========== */
const GK='gt-goals',PK='gt-pending',SK='gt-sync-at',GH_NEW='https://github.com/Blood63/gaming-tracker/issues/new';
/* Lien d'issue robuste : les données sont dans le corps ET en fin de titre (gt:{…}), car l'appli GitHub mobile ne garde que le titre (ni modèle, ni étiquette, ni corps). */
const ghNew=(title,data,label)=>{const j=JSON.stringify(data);return `${GH_NEW}?labels=${label}&title=${encodeURIComponent(title+' gt:'+j)}&body=${encodeURIComponent('Créée par l\'app Gaming Tracker — ne rien modifier, valide simplement.\n\n```json\n'+j+'\n```\n')}`};
const ghTitleOk=(title,data)=>(title+' gt:'+JSON.stringify(data)).length<=250;
// Local d'abord : un objectif ajouté est enregistré tout de suite sur l'appareil (sans expiration) et s'affiche immédiatement.
// La synchro (goals.json dans le dépôt, identique sur tous les appareils) passe par un formulaire GitHub pré-rempli ; les copies locales disparaissent quand goals.json les contient.
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const repoIds=()=>new Set((D.goals||[]).map(g=>g.id));
const localGoals=()=>{const ids=repoIds(),L=LS.get(GK,[]).map(g=>({...g,id:+g.id})).filter(g=>g.id&&g.type);
  // reprise de l'ancienne file « en attente » (version précédente de l'app)
  const old=LS.get(PK,{});if(old&&old.adds&&old.adds.length){old.adds.forEach(g=>{if(!L.some(x=>x.id==g.id))L.push(gClean(g))});old.adds=[];LS.set(PK,old)}
  const same=(a,b)=>a.type==b.type&&a.target==b.target&&(a.playlist||'')==(b.playlist||'')&&(a.mode||'')==(b.mode||'')&&(a.appid||0)==(b.appid||0)&&(a.div||1)==(b.div||1);
  const r=L.filter(g=>!ids.has(g.id)&&!(D.goals||[]).some(x=>same(x,g)));LS.set(GK,r);return r};
const pendDels=()=>{const ids=repoIds(),old=LS.get(PK,{}),d=[...new Set([...(LS.get('gt-dels',[])),...((old.dels||[]).map(x=>x.id))])].filter(id=>ids.has(id));LS.set('gt-dels',d);if(old.dels){old.dels=[];LS.set(PK,old)}return d};
const goals=()=>{const del=new Set(pendDels());return[...(D.goals||[]).map(g=>del.has(g.id)?{...g,pending:3}:g),...localGoals().map(g=>({...g,pending:2}))]};
const unsynced=()=>({adds:localGoals(),dels:pendDels()});
const gClean=g=>Object.fromEntries(Object.entries(g).filter(([k,v])=>v!==undefined&&v!==''&&v!==null&&!['pending','_t'].includes(k)));
const syncURLs=()=>{const u=unsynced(),n=u.adds.length+u.dels.length;if(!n)return [];
  const data=u.dels.length&&!u.adds.length?{action:'delete',ids:u.dels}:{action:'sync',goals:u.adds.map(gClean),...(u.dels.length?{delete:u.dels}:{})};
  const resume=[u.adds.length?`ajouter ${u.adds.length} objectif${u.adds.length>1?'s':''}`:'',u.dels.length?`supprimer ${u.dels.length} objectif${u.dels.length>1?'s':''}`:''].filter(Boolean).join(' et ');
  if(ghTitleOk('Objectifs – '+resume,data))return [ghNew('Objectifs – '+resume,data,'objectif')];
  // trop long pour le titre : une demande par changement
  return [...u.adds.map(g=>ghNew('Objectifs – ajouter 1 objectif',{action:'sync',goals:[gClean(g)]},'objectif')),...(u.dels.length?[ghNew(`Objectifs – supprimer ${u.dels.length}`,{action:'delete',ids:u.dels},'objectif')]:[])]};
const syncURL=()=>syncURLs()[0]||null;
function addGoal(o){if(goals().some(x=>x.type==o.type&&x.target==o.target&&(x.playlist||'')==(o.playlist||'')&&(x.mode||'')==(o.mode||'')&&(x.appid||0)==(o.appid||0)&&(x.div||1)==(o.div||1)&&x.pending!=3)){toast('ℹ️ Cet objectif existe déjà');return false}const g=gClean({id:Date.now(),created:new Date().toISOString(),...o}),L=LS.get(GK,[]);L.push(g);
  if(!LS.set(GK,L)){toast('⚠️ Impossible d\'enregistrer sur cet appareil (stockage bloqué / navigation privée ?)');return false}
  toast('✅ Objectif ajouté sur cet appareil — touche « Synchroniser » pour l\'avoir partout');return true}
function delGoal(id){const g=goals().find(x=>x.id==id);if(!g)return;
  if(g.pending==2){LS.set(GK,LS.get(GK,[]).filter(x=>+x.id!=id));toast('Objectif supprimé');return}
  const d=LS.get('gt-dels',[]);if(!d.includes(id))d.push(id);LS.set('gt-dels',d);toast('Objectif masqué ici — touche « Synchroniser » pour le supprimer partout')}
function syncBox(){const u=unsynced(),n=u.adds.length+u.dels.length;if(!n)return '';
  const at=LS.get(SK,0),late=at&&Date.now()-at>6e5;
  return `<div class="glass pad" id="syncbox" style="border-color:var(--warn);margin:.6rem 0">
   <b>📲 ${n} changement${n>1?'s':''} seulement sur cet appareil</b>
   ${late?`<p class="down" style="font-size:.85rem;margin:.3rem 0">⚠️ La dernière synchronisation n'a pas abouti (formulaire GitHub non validé, pas connecté à GitHub, ou erreur du robot). Réessaie ; s'il y a une erreur, elle est expliquée en commentaire de la demande sur GitHub.</p><div id="syncerr"></div>`:''}
   <p class="mut" style="font-size:.85rem;margin:.3rem 0 .6rem">Tes objectifs fonctionnent déjà ici. Pour les retrouver sur ton téléphone ET ton PC : touche « Synchroniser », connecte-toi à GitHub si besoin, puis valide avec <b>« Create »</b> (sans rien modifier). Mise à jour sous ~2 min.</p>
   ${(L=>L.map((u,i)=>`<a class="btn full gsync" ${i?'':'id="gsync"'} style="margin-top:${i?'.4rem':'0'}" href="${esc(u)}" target="_blank" rel="noopener">🔄 Synchroniser (GitHub)${L.length>1?` ${i+1}/${L.length}`:''}</a>`).join(''))(syncURLs())}</div>`}
function bindSync(){$$('.gsync').forEach(a=>a.onclick=()=>{LS.set(SK,Date.now());toast('📝 Valide la demande GitHub (« Create » / « Submit ») pour terminer')});
  if($('#syncerr'))fetch('https://api.github.com/repos/Blood63/gaming-tracker/issues?labels=objectif&state=open&per_page=5').then(r=>r.ok?r.json():[]).then(a=>{if(a.length)$('#syncerr').innerHTML=a.map(i=>`<a href="${esc(i.html_url)}" target="_blank" rel="noopener" style="font-size:.85rem">Voir la demande #${i.number} non traitée ›</a>`).join('<br>')}).catch(()=>{})}
function goalProg(x){
  const g=D.games.find(y=>y.appid==x.appid);
  switch(x.type){
    case 'game_hours':return{label:`${g?.name||'Jeu'} : ${x.target} h`,cur:g?.hours||0,t:x.target,u:'h',p:100*(g?.hours||0)/x.target};
    case 'game_ach':return{label:`${g?.name||'Jeu'} : ${x.target} % des succès`,cur:g?.pct||0,t:x.target,u:'%',p:100*(g?.pct||0)/x.target};
    case 'total_hours':return{label:`${x.target} h de jeu au total (Steam)`,cur:D.totalH,t:x.target,u:'h',p:100*D.totalH/x.target};
    case 'achievements':return{label:`${x.target} succès Steam`,cur:D.ach,t:x.target,u:'',p:100*D.ach/x.target};
    case 'cod_kd':{const k=kdOf(D.cod.slice(-10));return{label:`K/D COD ≥ ${x.target} (10 dernières)`,cur:k??0,t:x.target,u:'',p:k==null?0:100*k/x.target,dec:2}}
    case 'cod_matches':return{label:`${x.target} parties COD Mobile`,cur:D.cod.length,t:x.target,u:'',p:100*D.cod.length/x.target};
    case 'val_rank':case 'rl_rank':case 'cod_rank':return rankGoal(x);
    case 'level':return{label:`Atteindre le niveau ${x.target}`,cur:D.xp.L,t:x.target,u:'',p:100*D.xp.L/x.target};
  }return{label:'?',cur:0,t:1,p:0}
}

/* ========== objectifs de rang ========== */
const VAL_T=(()=>{const a=[];['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal'].forEach((t,i)=>[1,2,3].forEach(n=>a.push({id:3+i*3+n-1,n:`${t} ${n}`})));a.push({id:27,n:'Radiant'});return a})();
const RL_T=(()=>{const a=[];['Bronze','Argent','Or','Platine','Diamant','Champion','Grand Champion'].forEach(t=>['I','II','III'].forEach(n=>a.push(`${t} ${n}`)));a.push('Supersonic Legend');return a})();
const RL_PL={'1v1':'Duel 1v1','2v2':'Double 2v2','3v3':'Standard 3v3'};
const codLbl=v=>{v=codNormStep(v);const x=COD_STEPS[v-1];return x?x.tier+(x.sub?' '+x.sub:''):'?'};
const codNormStep=v=>{if(v<=23)return v;const t=Math.floor((v-1)/5);return t>=7?23:t==6?22:t==5?21:t==4?16+((v-1)%5):v};
function valEst(){ // gains/pertes moyens de RR (parties classées récentes)
  const H=D.vh?.mmr_history||[],ms=Object.fromEntries((D.vh?.matches||[]).map(m=>[m.id,m]));
  const w=H.filter(h=>h.change>0).map(h=>h.change),l=H.filter(h=>h.change<0).map(h=>-h.change),
    rs=(D.vh?.matches||[]).filter(m=>m.mode=='Competitive'&&m.result),wr=rs.length?rs.filter(m=>m.result=='win').length/rs.length:null;
  const ag=w.length?w.reduce((a,b)=>a+b,0)/w.length:null,al=l.length?l.reduce((a,b)=>a+b,0)/l.length:null;
  return{ag,al,wr,n:H.length,net:ag!=null&&al!=null&&wr!=null?wr*ag-(1-wr)*al:null};
}
function rankGoal(x){
  const dl=x.deadline?Math.ceil((new Date(x.deadline+'T23:59')-Date.now())/864e5):null;
  if(x.type=='val_rank'){const T=VAL_T.find(t=>t.id==x.target)||{n:'?'},lab=`Valorant : atteindre ${vTier(T.n)}`;
    if(!D.vh)return{label:lab,wait:'En attente des données Valorant',cur:0,t:1,p:0,dl};
    const M=D.vh.mmr,cur=(M.tier_id-3)*100+(M.rr||0),tgt=(x.target-3)*100,start=x.start??cur,rem=Math.max(0,tgt-cur),E=valEst();
    const p=tgt<=start?(cur>=tgt?100:0):100*(cur-start)/(tgt-start);
    let info=rem<=0?'':`${fnum(rem)} RR restants (${vTier(M.tier)} · ${M.rr} RR → ${vTier(T.n)})`;
    if(rem>0&&E.ag){const wins=Math.ceil(rem/E.ag);info+=`<br>≈ ${wins} victoire${wins>1?'s':''} sans défaite (gain moyen +${fnum(E.ag,0)} RR)`;
      if(E.net>0){const g=Math.ceil(rem/E.net);info+=` · ≈ ${g} parties à ton rythme actuel (${fnum(100*E.wr,0)} % de victoires, perte moy. −${fnum(E.al,0)} RR)`}
      else if(E.net!=null)info+=' · à ton rythme actuel, le solde de RR est négatif : il faut gagner plus souvent';
      info+=' <i>(estimation)</i>'}
    return{label:lab,cur:Math.max(0,cur-start),t:Math.max(1,tgt-start),u:'RR',p:Math.max(0,Math.min(100,p)),info,dl,done:cur>=tgt,icon:vIcon(x.target,22)}}
  if(x.type=='rl_rank'){const lab=`Rocket League ${RL_PL[x.playlist]||x.playlist} : ${RL_T[x.target]||'?'}${x.div&&x.target<RL_T.length-1?' div. '+['I','II','III','IV'][x.div-1]:''}`;
    const pl=D.rlm?.playlists?.find(p=>p.id==x.playlist);
    if(!pl)return{label:lab,wait:'En attente de données Rocket League (intégration ballchasing.com prévue)',cur:0,t:1,p:0,dl};
    const cur=rlVal(pl.tier,pl.div),tgt=rlVal(x.target,x.div||1),start=x.start??cur,rem=tgt-cur,p=tgt<=start?(cur>=tgt?100:0):100*(cur-start)/(tgt-start);
    return{label:lab,cur:0,t:1,u:'RR',p:Math.max(0,Math.min(100,p)),done:cur>=tgt,dl,info:rem>0?`Actuel : ${esc(pl.tier_name)} div. ${RL_DIV[pl.div-1]} (${fnum(pl.mmr)} MMR, record ${fnum(pl.best_mmr)}) · encore ${rem} division${rem>1?'s':''}. <i>Données manuelles (captures tracker.gg).</i>`:''}}
  if(x.type=='cod_rank'){x.target=codNormStep(x.target);const a=D.ranks[x.mode]||[],c=a.at(-1),lab=`COD Mobile ${x.mode=='BR'?'Battle Royale':'Multijoueur'} : ${codLbl(x.target)}`;
    if(!c)return{label:lab,wait:'Enregistre ton rang actuel (bouton « changement de rang » sur la page COD)',cur:0,t:1,p:0,dl};
    const start=x.start??c.value,p=x.target<=start?(c.value>=x.target?100:0):100*(c.value-start)/(x.target-start),rem=Math.max(0,x.target-c.value);
    return{label:lab,cur:c.value-start,t:Math.max(1,x.target-start),u:'',p:Math.max(0,Math.min(100,p)),info:rem?`Actuel : ${esc(c.label)} · encore ${rem} palier${rem>1?'s':''}`:'',dl,done:c.value>=x.target}}
}


/* ========== timeline ========== */
function timeline(){
  const ev=[];
  D.games.forEach(g=>{if(g.last)ev.push({t:g.last,c:COL.cy,i:'🕹️',h:`Session sur <b>${esc(g.name)}</b>`,link:`#/steam/${g.appid}`})});
  const byDay=[];D.steamH.forEach(s=>{const d=s.fetched_at.slice(0,10);if(byDay.length&&byDay.at(-1).fetched_at.slice(0,10)==d)byDay[byDay.length-1]=s;else byDay.push(s)});
  for(let i=1;i<byDay.length;i++){const a=byDay[i-1],b=byDay[i];
    b.games.forEach(g=>{const o=a.games.find(x=>x.appid==g.appid);
      if(!o){ev.push({t:new Date(b.fetched_at).getTime(),c:COL.gr,i:'🆕',h:`Nouveau jeu : <b>${esc(g.name)}</b>`,link:`#/steam/${g.appid}`});return}
      const dh=(g.hours||0)-(o.hours||0),da=(g.ach_unlocked||0)-(o.ach_unlocked||0);
      if(dh>=0.1)ev.push({t:new Date(b.fetched_at).getTime(),c:COL.vi,i:'⏱️',h:`+${fnum(dh,1)} h sur <b>${esc(g.name)}</b> cette semaine`,link:`#/steam/${g.appid}`});
      if(da>0)ev.push({t:new Date(b.fetched_at).getTime(),c:COL.warn,i:'🏆',h:`+${da} succès sur <b>${esc(g.name)}</b>`,link:`#/steam/${g.appid}`});});}
  D.cod.forEach(m=>ev.push({t:new Date(m.date).getTime(),c:COL.or,i:{win:'✅',loss:'❌',draw:'➖'}[m.result]||'🔫',h:`COD Mobile${m.mode?' · '+esc(m.mode):''}${m.map?' · '+esc(m.map):''} — ${m.kills??'?'}/${m.deaths??'?'}${m.kd!=null?' (K/D '+fnum(m.kd,2)+')':''}`,link:'#/cod'}));
  if(D.vh){D.vh.matches.forEach(x=>ev.push({t:new Date(x.date).getTime(),c:'#ff4655',i:{win:'✅',loss:'❌',draw:'➖'}[x.result]||'🎯',h:`Valorant · ${esc(vMode(x.mode))} · ${esc(x.map||'')} — ${esc(x.agent||'')} ${x.kills}/${x.deaths}/${x.assists}${x.rr_change!=null?` (${x.rr_change>0?'+':''}${x.rr_change} RR)`:''}`,link:'#/valorant/'+x.id}));const Hh=D.vh.mmr_history;for(let i=1;i<Hh.length;i++)if(Hh[i].tier!=Hh[i-1].tier)ev.push({t:new Date(Hh[i].date).getTime(),c:COL.pk,i:'📊',h:`Valorant : rang <b>${esc(vTier(Hh[i].tier))}</b> (avant ${esc(vTier(Hh[i-1].tier))})`,link:'#/valorant'})}
  (D.bc?.replays||[]).filter(r=>r.date&&r.m&&!r.bots).forEach(x=>ev.push({t:new Date(x.date).getTime(),c:'#3b82f6',i:'🚗',h:`Rocket League · ${esc(x.playlist||'')} · ${esc(x.map||'')} — ${x.team_goals}-${x.opp_goals} (${x.goals??0} but${(x.goals||0)>1?'s':''}, ${x.assists??0} passe${(x.assists||0)>1?'s':''}, ${x.saves??0} arrêt${(x.saves||0)>1?'s':''})`,link:'#/rl/'+x.id}));
  ['MP','BR'].forEach(m=>{const a=D.ranks[m]||[];a.forEach((x,i)=>ev.push({t:new Date(x.date).getTime(),c:COL.or,i:'🎖️',h:`COD Mobile ${m=='BR'?'Battle Royale':'Multijoueur'} : rang <b>${esc(x.label)}</b>${i&&a[i-1].label!=x.label?` (avant ${esc(a[i-1].label)})`:''}${x.points!=null?' · '+fnum(x.points)+' pts':''}`,link:'#/cod'}))});
  goals().forEach(x=>{if(x.created)ev.push({t:new Date(x.created).getTime(),c:COL.vi,i:'🎯',h:`Objectif fixé : <b>${esc(goalProg(x).label)}</b>`,link:'#/objectifs'})});
  [[D.vh?[]:D.vOk,'Valorant','#/valorant',x=>S(overview(x),'rank')?.metadata?.tierName],[D.rOk,'Rocket League','#/rl',x=>segs(x).filter(s=>s.type=='playlist').map(s=>S(s,'tier')?.metadata?.tierName).filter(Boolean)[0]]].forEach(([h,n,l,f])=>{
    for(let i=1;i<h.length;i++){const a=f(h[i-1]),b=f(h[i]);if(b&&a!=b)ev.push({t:new Date(h[i].fetched_at).getTime(),c:COL.pk,i:'📊',h:`${n} : rang <b>${esc(b)}</b>${a?' (avant '+esc(a)+')':''}`,link:l})}});
  return ev.filter(e=>e.t&&!isNaN(e.t)).sort((a,b)=>b.t-a.t);
}
const tlHTML=ev=>ev.length?`<div class="tl">${ev.map(e=>`<a class="glass ev" style="--c:${e.c};display:block;color:var(--txt)" href="${e.link}"><div class="d">${fdate(e.t)} · ${ago(e.t)}</div>${e.i} ${e.h}</a>`).join('')}</div>`:'<div class="glass empty">Aucune activité pour le moment.</div>';

/* ========== Valorant (HenrikDev) ========== */
const VT='https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/';
const vIcon=(id,sz=28)=>id?`<img src="${VT}${id}/smallicon.png" alt="" style="width:${sz}px;height:${sz}px;vertical-align:middle" onerror="this.remove()">`:'';
const VFR={Iron:'Fer',Bronze:'Bronze',Silver:'Argent',Gold:'Or',Platinum:'Platine',Diamond:'Diamant',Ascendant:'Ascendant',Immortal:'Immortel',Radiant:'Radiant',Unrated:'Non classé'};
const vTier=t=>t?String(t).replace(/^(\w+)/,w=>VFR[w]||w):'—';
const VMODE={Competitive:'Compétition',Unrated:'Non classé',Swiftplay:'Vélocité',Deathmatch:'Combat à mort','Team Deathmatch':'Combat à mort par équipe',Spikerush:'Spike Rush',Premier:'Premier'};
const vMode=m=>VMODE[m]||m||'—';
const vAgg=a=>{const s=k=>a.reduce((t,x)=>t+(num(x[k])||0),0),r=a.filter(x=>x.result),sh=s('head')+s('body')+s('leg'),rd=a.filter(x=>x.rounds),fk=a.filter(x=>x.first_kills!=null);
  return{n:a.length,w:r.filter(x=>x.result=='win').length,wr:r.length?100*r.filter(x=>x.result=='win').length/r.length:null,kd:s('deaths')?s('kills')/s('deaths'):null,kda:s('deaths')?(s('kills')+s('assists'))/s('deaths'):null,
   hs:sh?100*s('head')/sh:null,adr:rd.length?rd.reduce((t,x)=>t+(x.dmg||0),0)/rd.reduce((t,x)=>t+x.rounds,0):null,acs:rd.length?rd.reduce((t,x)=>t+(x.score||0),0)/rd.reduce((t,x)=>t+x.rounds,0):null,
   k:s('kills'),d:s('deaths'),a:s('assists'),fk:fk.length?fk.reduce((t,x)=>t+x.first_kills,0):null,fkn:fk.length}};
const vRes=x=>({win:'✅',loss:'❌',draw:'➖'}[x.result]||'—');
function valPage(){
  const V=D.vh,M=V.mmr,A=V.account,all=V.matches,f=sessionStorage.getItem('valQ')||'Competitive';
  const m=f=='all'?all:all.filter(x=>x.mode==f),g=vAgg(m),H=V.mmr_history,last=all.at(-1);
  const modes=[...new Set(all.map(x=>x.mode))];
  let h=`${valHero(A,M)}
  <div class="glass pad" style="display:flex;gap:1rem;align-items:center;margin-top:.7rem">${vIcon(M.tier_id,64)}<div style="flex:1;min-width:0"><div class="mut" style="font-size:.8rem">RANG ACTUEL</div><div style="font-size:1.4rem;font-weight:800">${esc(vTier(M.tier))} · ${fnum(M.rr)} RR</div>${bar(M.rr)}
   <div class="mut" style="font-size:.85rem;margin-top:.3rem">Dernier match : <b class="${M.last_change>0?'up':M.last_change<0?'down':''}">${M.last_change>0?'+':''}${fnum(M.last_change)} RR</b> · Rang max : ${vIcon(M.peak_id,20)} <b>${esc(vTier(M.peak))}</b>${M.peak_season?' ('+esc(M.peak_season.toUpperCase())+')':''}</div></div></div>
  <h2>Statistiques</h2><div class="seg" id="vq">${[['Competitive','Compétition'],['all','Tout'],...modes.filter(x=>x!='Competitive').map(x=>[x,vMode(x)])].map(([k,n])=>`<button class="${k==f?'on':''}" data-q="${esc(k)}">${esc(n)} (${k=='all'?all.length:all.filter(x=>x.mode==k).length})</button>`).join('')}</div>
  <div class="stats">${stat('Parties',fnum(g.n),fnum(g.w)+' victoires')}${stat('Victoires',g.wr!=null?fnum(g.wr,0)+' %':'—')}${stat('K/D',fnum(g.kd,2),`${fnum(g.k)} / ${fnum(g.d)} / ${fnum(g.a)}`)}${stat('KDA',fnum(g.kda,2))}${stat('Headshots',g.hs!=null?fnum(g.hs,1)+' %':'—')}${stat('ADR',fnum(g.adr,0),'dégâts / manche')}${stat('ACS',fnum(g.acs,0),'score / manche')}${g.fk!=null?stat('Premières élim.',fnum(g.fk),'sur '+g.fkn+' parties détaillées'):''}</div>
  <p class="mut" style="font-size:.78rem">Calculé à partir des ${fnum(all.length)} parties récupérées depuis ${fdate(all[0]?.date)} (historique conservé et complété à chaque relevé).</p>
  <h2>Évolution du rang</h2><div class="glass chart"><canvas id="v1"></canvas></div>
  <h2>Saisons</h2><div class="glass tbl"><table><tr><th>Acte</th><th>Parties</th><th>Victoires</th><th>Rang final</th></tr>${M.seasons.slice().reverse().map(s=>`<tr><td>${esc((s.season||'').toUpperCase())}</td><td>${fnum(s.games)}</td><td>${fnum(s.wins)} (${s.games?fnum(100*s.wins/s.games,0):'—'} %)</td><td>${vIcon(s.end_tier_id,20)} ${esc(vTier(s.end_tier))}${s.end_rr!=null?' · '+s.end_rr+' RR':''}</td></tr>`).join('')}</table></div>
  <div class="glass chart"><canvas id="v2"></canvas></div>`;
  const grp=k=>{const o={};m.forEach(x=>(o[x[k]||'?']??=[]).push(x));return Object.entries(o).map(([n,a])=>[n,vAgg(a)]).sort((a,b)=>b[1].n-a[1].n)};
  const tb=(t,k)=>`<h2>${t}</h2><div class="glass tbl"><table><tr><th>${t=='Par agent'?'Agent':'Carte'}</th><th>Parties</th><th>Vict.</th><th>K/D</th><th>HS</th><th>ADR</th><th>ACS</th></tr>${grp(k).map(([n,a])=>`<tr><td>${esc(n)}</td><td>${a.n}</td><td>${a.wr!=null?fnum(a.wr,0)+' %':'—'}</td><td>${fnum(a.kd,2)}</td><td>${a.hs!=null?fnum(a.hs,0)+' %':'—'}</td><td>${fnum(a.adr,0)}</td><td>${fnum(a.acs,0)}</td></tr>`).join('')}</table></div>`;
  h+=tb('Par agent','agent')+tb('Par carte','map');
  h+=`<h2>Parties récentes</h2><p class="mut" style="font-size:.8rem">Touche une partie pour le détail.</p><div class="glass tbl"><table><tr><th>Date</th><th>Mode</th><th>Carte</th><th>Agent</th><th>Rés.</th><th>Score</th><th>K/D/A</th><th>RR</th></tr>${m.slice().reverse().slice(0,40).map(x=>`<tr data-v="${esc(x.id)}" style="cursor:pointer"><td>${fdate(x.date)}${x.pending?' <span class="pill warn" title="Pas encore synchronisée">📲</span>':''}</td><td>${esc(vMode(x.mode))}</td><td>${esc(x.map||'—')}</td><td>${esc(x.agent||'—')}</td><td>${vRes(x)}</td><td>${x.rounds_won??'—'}-${x.rounds_lost??'—'}</td><td>${x.kills??'—'}/${x.deaths??'—'}/${x.assists??'—'}</td><td class="${x.rr_change>0?'up':x.rr_change<0?'down':''}">${x.rr_change!=null?(x.rr_change>0?'+':'')+x.rr_change:''}</td></tr>`).join('')}</table></div>
  <p class="mut" style="font-size:.78rem">Source : ${esc(V.source)} · relevé le ${fdate(V.fetched_at)} · mis à jour 2 fois par jour. ADR/ACS/HS % = calculés.</p>`;
  const nx=[1,3].map(k=>VAL_T.find(t=>t.id==Math.min(27,M.tier_id+k))).filter(Boolean);
  h=h.replace('<h2>Statistiques</h2>',goalsBlock(['val_rank'])+`<div class="seg" style="margin-top:.5rem">${nx.map(t=>`<button data-vg="${t.id}">🎯 ${esc(vTier(t.n))}</button>`).join('')}</div><h2>Statistiques</h2>`);
  app.innerHTML=h;bindValHero();bindGoalDel(valPage);animBars();
  $$('[data-vg]').forEach(b=>b.onclick=()=>{if(addGoal({type:'val_rank',target:+b.dataset.vg,start:(M.tier_id-3)*100+(M.rr||0)}))valPage()});
  $$('#vq button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('valQ',b.dataset.q);valPage()});
  $$('tr[data-v]').forEach(r=>r.onclick=()=>go('#/valorant/'+r.dataset.v));
  app.insertAdjacentHTML('beforeend',`<details class="glass pad" style="margin-top:.7rem"><summary><b>Comment ces chiffres sont calculés</b></summary><p class="mut" style="font-size:.85rem">K/D, HS %, ADR et ACS sont calculés depuis le détail de tes parties HenrikDev (balles tête/corps/jambes, dégâts et rounds). Les RR viennent de l'historique MMR. Touche un point d'un graphique pour voir la date et la valeur exacte.</p></details>`);chart($('#v1'),{type:'line',data:{labels:H.map(x=>fshort(x.date)),datasets:[lineDS('Points de rang (elo)',H.map(x=>x.elo),COL.val)]},options:{plugins:{legend:{display:false},title:{display:true,text:'Elo (100 = 1 palier) — dernières parties classées'},tooltip:{callbacks:{label:c=>`${vTier(H[c.dataIndex].tier)} · ${H[c.dataIndex].rr} RR (${H[c.dataIndex].change>0?'+':''}${H[c.dataIndex].change})`}}}}});
  chart($('#v2'),{type:'bar',data:{labels:M.seasons.map(s=>(s.season||'').toUpperCase()),datasets:[{label:'Victoires %',data:M.seasons.map(s=>s.games?100*s.wins/s.games:null),backgroundColor:COL.val+'99',borderRadius:6}]},options:{scales:{y:{min:0,max:100}},plugins:{legend:{display:false},title:{display:true,text:'Taux de victoire par acte (%)'}}}});
}
function valMatch(id){
  const x=D.vh.matches.find(m=>m.id==id);if(!x){go('#/valorant');return}
  const r=x.rounds,sh=(x.head||0)+(x.body||0)+(x.leg||0);
  let h=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,${x.result=='win'?'#22c55e66':x.result=='loss'?'#ff465566':'#94a3b866'},transparent 65%)"><div class="ttl"><h3>${esc(x.map||'Partie')} · ${x.rounds_won??'?'}-${x.rounds_lost??'?'}</h3><span class="pill">${esc(vMode(x.mode))}</span><span class="pill">${{win:'Victoire',loss:'Défaite',draw:'Égalité'}[x.result]||'—'}</span><span class="pill">${fdate(x.date)}</span></div></div>
  <div class="stats">${stat('Agent',esc(x.agent||'—'))}${stat('K / D / A',`${x.kills}/${x.deaths}/${x.assists}`,'K/D '+fnum(x.deaths?x.kills/x.deaths:x.kills,2))}${stat('ACS',r?fnum(x.score/r,0):'—','score '+fnum(x.score))}${stat('ADR',r&&x.dmg!=null?fnum(x.dmg/r,0):'—','dégâts '+fnum(x.dmg))}${stat('Headshots',sh?fnum(100*x.head/sh,1)+' %':'—',`${x.head||0} tête · ${x.body||0} corps · ${x.leg||0} jambes`)}${x.first_kills!=null?stat('Premières élim.',fnum(x.first_kills)):''}${x.rr_change!=null?stat('RR',`<span class="${x.rr_change>0?'up':x.rr_change<0?'down':''}">${x.rr_change>0?'+':''}${x.rr_change}</span>`,x.tier_after?'→ '+vTier(x.tier_after):''):''}${x.length_s?stat('Durée',Math.round(x.length_s/60)+' min'):''}${x.mvp?stat('MVP','🏅','de l\'équipe'):''}</div>`;
  if(x.scoreboard){const tm=[...new Set(x.scoreboard.map(p=>p.team))].sort(a=>a==x.team?-1:1);
    h+=tm.map(t=>`<h2>${t==x.team?'Ton équipe':'Adversaires'}</h2><div class="glass tbl"><table><tr><th>Joueur</th><th>Agent</th><th>Rang</th><th>ACS</th><th>K/D/A</th><th>HS</th></tr>${x.scoreboard.filter(p=>p.team==t).map(p=>{const s=p.hs+p.bs+p.ls;return `<tr${p.me?' style="background:rgba(255,70,85,.15);font-weight:700"':''}><td>${esc(p.name)}</td><td>${esc(p.agent)}</td><td>${esc(vTier(p.tier))}</td><td>${r?fnum(p.score/r,0):'—'}</td><td>${p.k}/${p.d}/${p.a}</td><td>${s?fnum(100*p.hs/s,0)+' %':'—'}</td></tr>`}).join('')}</table></div>`).join('')}
  else h+=`<p class="mut" style="font-size:.85rem;margin-top:1rem">Tableau des scores complet disponible uniquement pour les parties récentes (relevées après leur fin).</p>`;
  app.innerHTML=h+`<a class="btn ghost" style="margin-top:1rem" href="#/valorant">‹ Retour Valorant</a>`;
}


/* ========== Rocket League (données manuelles) ========== */
const RL_DIV=['I','II','III','IV'],rlVal=(t,d)=>t*4+((d||1)-1),rlLbl=(t,d)=>RL_T[t]+(d&&t<RL_T.length-1?' div. '+RL_DIV[d-1]:'');
const rlIcon=t=>['🟤','⚪','🟡','🔷','💎','🟣','🔴','🌟'][Math.min(7,Math.floor(t/3))]||'🚗';
const rlNext=pl=>Math.min(RL_T.length-1,pl.tier+1);


/* ========== RL : analyse des replays ========== */
const BCM={shooting_pct:['Précision de tir','%'],avg_boost:['Boost moyen',''],pct_zero_boost:['Temps à 0 boost','%'],pct_full_boost:['Temps à 100 boost','%'],pct_supersonic:['Temps supersonique','%'],pct_slow:['Temps lent','%'],pct_behind_ball:['Derrière la balle','%'],pct_def_third:['Tiers défensif','%'],pct_off_third:['Tiers offensif','%'],pct_most_forward:['Joueur le plus avancé','%'],pct_most_back:['Dernier défenseur','%'],pct_closest_ball:['Plus près de la balle','%'],bpm:['Boost ramassé / min',''],overfill_pct:['Boost gaspillé','%'],pct_high_air:['Temps haut dans les airs','%'],demos:['Démolitions',''],clears:['Dégagements',''],aerial_hits:['Touches aériennes','']};
const bcv=(k,v)=>v==null?'—':fnum(v,BCM[k]?.[1]=='%'?1:0)+(BCM[k]?.[1]||'');
const bcReps=()=>(D.bc?.replays||[]).filter(r=>r.m&&!r.bots);
function bcWeekly(){const W=(D.bc?.weekly||[]).at(-1);if(!W)return '';const f=W.focus;
  return `<h2>Bilan de la semaine</h2><div class="glass pad"><div class="stats">${stat('Parties',W.matches,'semaine du '+fdate(W.start))}${stat('Victoires',fnum(100*W.wins/W.matches,0)+' %',W.wins+' / '+W.matches)}${stat('Précision',bcv('shooting_pct',W.avg.shooting_pct))}${stat('Boost moyen',bcv('avg_boost',W.avg.avg_boost))}${stat('Supersonique',bcv('pct_supersonic',W.avg.pct_supersonic))}${stat('Derrière la balle',bcv('pct_behind_ball',W.avg.pct_behind_ball))}</div>
   ${f?`<div class="glass pad" style="margin-top:.6rem;border-color:var(--cy)"><b>🎯 Focus de la semaine : ${esc(f.label)}</b><p style="margin:.3rem 0">${esc(f.txt)}</p><p class="mut" style="margin:0">🏋️ ${esc(f.drill)}</p></div>`:''}</div>`}
function bcProgress(){const R=bcReps();if(R.length<2)return R.length?`<h2>Progression</h2><p class="mut" style="font-size:.85rem">Les courbes de progression apparaîtront à partir de 2 replays analysés.</p>`:'';
  const ks=['shooting_pct','avg_boost','pct_zero_boost','pct_supersonic','pct_behind_ball','pct_def_third','pct_most_forward','bpm'],cur=sessionStorage.getItem('bcK')||'shooting_pct';
  return `<h2>Progression</h2><div class="seg" id="bck">${ks.map(k=>`<button class="${k==cur?'on':''}" data-k="${k}">${esc(BCM[k][0])}</button>`).join('')}<button class="${cur=='wr'?'on':''}" data-k="wr">Victoires</button></div><div class="glass chart"><canvas id="bc1"></canvas></div>
  ${(D.bc.weekly||[]).length>1?`<div class="glass tbl"><table><tr><th>Semaine</th><th>Parties</th><th>Vict.</th><th>Précision</th><th>Boost</th><th>Supersonique</th><th>Derrière balle</th><th>Arrêts/m</th></tr>${D.bc.weekly.slice().reverse().map(w=>`<tr><td>${esc(w.week)}</td><td>${w.matches}</td><td>${fnum(100*w.wins/w.matches,0)} %</td><td>${bcv('shooting_pct',w.avg.shooting_pct)}</td><td>${bcv('avg_boost',w.avg.avg_boost)}</td><td>${bcv('pct_supersonic',w.avg.pct_supersonic)}</td><td>${bcv('pct_behind_ball',w.avg.pct_behind_ball)}</td><td>${fnum(w.saves,1)}</td></tr>`).join('')}</table></div>`:''}`}
function bcProgressChart(){const c=$("#bc1");if(!c)return;Chart.getChart(c)?.destroy();const R=bcReps(),k=sessionStorage.getItem('bcK')||'shooting_pct';
  const v=k=='wr'?R.map(r=>r.result=='win'?100:0):R.map(r=>r.m[k]),roll=v.map((_,i)=>{const a=v.slice(Math.max(0,i-4),i+1).filter(x=>x!=null);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null});
  chart(c,{type:'line',data:{labels:R.map(r=>fshort(r.date)),datasets:[lineDS(k=='wr'?'Résultat (100 = victoire)':BCM[k][0],v,COL.rlA,{fill:false,showLine:false,pointRadius:5}),lineDS('Moyenne glissante (5)',roll,COL.cy)]},options:{plugins:{title:{display:true,text:(k=='wr'?'Taux de victoire':BCM[k][0])+' par replay'}}}});
  $$('#bck button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('bcK',b.dataset.k);$$('#bck button').forEach(x=>x.classList.toggle('on',x==b));bcProgressChart()})}
function rlReplay(id){const x=(D.bc?.replays||[]).find(r=>r.id==id);if(!x){go('#/rl');return}const m=x.m||{},A=x.analysis||{weaknesses:[],strengths:[]};
  const grp=(t,ks)=>`<h2>${t}</h2><div class="stats">${ks.filter(k=>m[k]!=null).map(k=>stat(BCM[k][0],bcv(k,m[k]))).join('')}</div>`;
  app.innerHTML=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,${x.result=='win'?'#22c55e66':'#ff465566'},transparent 65%)"><div class="ttl"><h3>${esc(x.map||'Replay')} · ${x.team_goals}-${x.opp_goals}</h3><span class="pill">${esc(x.playlist)}</span><span class="pill">${x.result=='win'?'Victoire':'Défaite'}</span><span class="pill">${fdate(x.date)}</span></div></div>
  <div class="stats">${stat('Buts',x.goals)}${stat('Passes',x.assists)}${stat('Arrêts',x.saves)}${stat('Tirs',x.shots,'précision '+bcv('shooting_pct',m.shooting_pct))}${stat('Score',x.score,x.mvp?'🏅 MVP':'')}${stat('Démolitions',m.demos??'—','subies : '+(m.demos_taken??'—'))}</div>
  <h2>Points forts</h2>${A.strengths.length?`<div class="list">${A.strengths.map(s=>`<div class="glass pad">✅ <b>${esc(s.txt)}</b> <span class="mut">(${esc(s.label)} : ${bcv(s.k,s.value)})</span></div>`).join('')}</div>`:'<p class="mut">—</p>'}
  <h2>À travailler</h2>${A.weaknesses.length?`<div class="list">${A.weaknesses.map(w=>`<div class="glass pad" style="border-color:var(--warn)">⚠️ <b>${esc(w.label)} : ${bcv(w.k,w.value)}</b> <span class="mut">(repère Or : ${w.bench[0]!=null?'≥ '+w.bench[0]:''}${w.bench[0]!=null&&w.bench[1]!=null?' et ':''}${w.bench[1]!=null?'≤ '+w.bench[1]:''})</span><p style="margin:.3rem 0">${esc(w.txt)}</p><p class="mut" style="margin:0">🏋️ ${esc(w.drill)}</p></div>`).join('')}</div>`:'<p class="mut">Rien de marquant : bon match !</p>'}
  ${grp('Boost',['avg_boost','bpm','pct_zero_boost','pct_full_boost','overfill_pct'])}${grp('Placement',['pct_behind_ball','pct_def_third','pct_off_third','pct_most_back','pct_most_forward','pct_closest_ball'])}${grp('Mouvement',['pct_supersonic','pct_slow','pct_high_air','aerial_hits','clears'])}
  <p class="mut" style="font-size:.78rem">${esc(D.bc.bench_note||'')} Conseils générés automatiquement (avis). Données : ballchasing.com.</p>
  <a class="btn ghost" href="https://ballchasing.com/replay/${esc(x.id)}" target="_blank" rel="noopener">Voir sur ballchasing ›</a> <a class="btn ghost" href="#/rl">‹ Retour</a>`}
function bcHTML(){const B=D.bc;
  if(!B)return '';
  if(!B.replays_count)return `<h2>Replays ballchasing.com</h2><div class="glass wait"><div class="ico">🎬</div><h3>En attente de replays</h3><p class="mut">Ta clé ballchasing.com est connectée ✅ (vérifiée le ${fdate(B.fetched_at)}), mais aucun replay de 443Blood n'a encore été envoyé. Dès les premiers envois, tes stats détaillées par playlist (buts, tirs, arrêts, passes, boost, victoires) apparaîtront ici, relevées 2 fois par jour.</p>
   <div style="text-align:left;font-size:.85rem;margin-top:.6rem"><b>Activer l'envoi automatique (PC, une seule fois) :</b><ol style="margin:.3rem 0 0 1.1rem;padding:0"><li>Installe BakkesMod (bakkesplugins.com) et lance-le avant Rocket League.</li><li>Dans le jeu, touche F2 › Plugins › Plugin Manager › active « AutoReplayUploader » (ou installe « Ballchasing.com auto upload »).</li><li>Dans ses réglages, coche Ballchasing.com et colle ta clé API (ballchasing.com › Upload › API key).</li><li>Choisis « Ranked + Casual », joue une partie : le replay est envoyé automatiquement.</li></ol></div></div>`;
  const P=B.playlists,R=B.replays.slice().reverse().slice(0,15);
  return `<h2>Replays ballchasing.com</h2><p class="mut" style="font-size:.8rem">${fnum(B.replays_count)} replays analysés · relevé le ${fdate(B.fetched_at)} · ratios calculés.</p>
  <div class="glass tbl"><table><tr><th>Playlist</th><th>Parties</th><th>Vict.</th><th>Buts</th><th>Tirs</th><th>Préc.</th><th>Passes</th><th>Arrêts</th><th>Score moy.</th><th>Boost moy.</th><th>Rang</th></tr>${Object.entries(P).map(([k,a])=>`<tr><td>${esc(k)}</td><td>${a.matches}</td><td>${fnum(a.win_rate,0)} %</td><td>${a.goals}</td><td>${a.shots}</td><td>${a.shot_pct!=null?fnum(a.shot_pct,0)+' %':'—'}</td><td>${a.assists}</td><td>${a.saves}</td><td>${fnum(a.score_avg,0)}</td><td>${fnum(a.boost_avg,0)}</td><td>${esc(a.rank||'—')}</td></tr>`).join('')}</table></div>
  ${bcWeekly()}${bcProgress()}
  <h2>Derniers replays</h2><p class="mut" style="font-size:.8rem">Touche un replay pour son analyse et des conseils.</p><div class="glass tbl"><table><tr><th>Date</th><th>Playlist</th><th>Carte</th><th>Rés.</th><th>B/P/A/T</th><th>Score</th><th></th></tr>${R.map(x=>`<tr data-bc="${esc(x.id)}" style="cursor:pointer"><td>${fdate(x.date)}</td><td>${esc(x.playlist||'—')}</td><td>${esc(x.map||'—')}</td><td>${x.result=='win'?'✅':'❌'} ${x.team_goals}-${x.opp_goals}</td><td>${x.goals}/${x.assists}/${x.saves}/${x.shots}</td><td>${x.score}${x.mvp?' 🏅':''}</td><td>›</td></tr>`).join('')}</table></div>`}
function rlManual(){
  const R=D.rlm,P=R.playlists,H=R.mmr_history,pf=R.performance||{};
  let h=`${rlGarage()}<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,color-mix(in srgb,var(--rl) 40%,transparent),transparent 65%)"><div class="ttl"><h3>Profil</h3><span class="pill">${esc(R.player)} · ${esc(R.platform)}</span><span class="pill">${esc(R.season)}</span>${R.reward_level?`<span class="pill">Récompenses : ${esc(R.reward_level)}</span>`:''}</div></div>
  <p class="mut" style="font-size:.8rem;margin-top:.5rem">📸 Source : captures tracker.gg, mise à jour manuelle (${fdate(R.updated)}). Base conservée ; les stats détaillées viennent des replays ballchasing.com (ci-dessous).</p>
  <h2>Rangs classés</h2><div class="list">${P.map(p=>`<div class="glass row" style="align-items:center"><span class="ic" style="font-size:1.8rem;width:44px;text-align:center">${rlIcon(p.tier)}</span><span class="n"><b>${esc(p.name)}</b><br><span style="font-size:1.05rem;font-weight:700">${esc(p.tier_name)} · div. ${RL_DIV[p.div-1]}</span><br><small class="mut">Meilleur : ${fnum(p.best_mmr)} MMR (${esc(p.best_season)})${p.matches?' · '+fnum(p.matches)+' parties':''}${p.percentile?' · '+esc(p.percentile):''}${p.streak?` · <span class="${p.streak.type=='loss'?'down':'up'}">série de ${p.streak.count} ${p.streak.type=='loss'?'défaites':'victoires'}</span>`:''}</small></span><span class="p" style="text-align:right"><b style="font-size:1.2rem">${fnum(p.mmr)}</b><br><small class="mut">MMR</small><br><small class="${p.mmr<p.best_mmr?'down':'up'}">${p.mmr-p.best_mmr} vs record</small></span></div>`).join('')}</div>
  <div class="stats" style="margin-top:.6rem">${(R.other||[]).map(o=>stat(o.name,o.mmr!=null?fnum(o.mmr):'≈ '+o.mmr_range.join('–'),o.note||'MMR')).join('')}</div>
  ${goalsBlock(['rl_rank'])}
  <div class="seg" style="margin-top:.5rem">${P.map(p=>`<button data-rg="${p.id}">🎯 ${esc(p.id)} → ${esc(RL_T[rlNext(p)])}</button>`).join('')}</div>
  <h2>Évolution du MMR (3v3)</h2><div class="glass chart"><canvas id="r1"></canvas></div>
  <h2>Sessions récentes</h2><div class="glass tbl"><table><tr><th>Date</th><th>Parties</th><th>Vict.</th><th>%</th><th>Buts / tirs</th><th>Passes</th><th>Arrêts</th><th>MMR</th></tr>${R.sessions.map(x=>`<tr><td>${fdate(x.date)}</td><td>${x.matches??(x.note?esc(x.note):'—')}</td><td>${x.wins??'—'}</td><td>${x.matches&&x.wins!=null?fnum(100*x.wins/x.matches,1)+' %':'—'}</td><td>${x.goals!=null?x.goals+' / '+x.shots:'—'}</td><td>${x.assists??'—'}</td><td>${x.saves??'—'}</td><td>${x.mmr?Object.entries(x.mmr).map(([k,v])=>`${k} ${v[0]}→${v[1]} <span class="${v[1]<v[0]?'down':'up'}">(${v[1]-v[0]>0?'+':''}${v[1]-v[0]})</span>`).join(' '):'—'}</td></tr>`).join('')}</table></div>
  <h2>Répartition des actions</h2><div class="two"><div class="glass chart"><canvas id="r2"></canvas></div><div class="glass pad"><div class="kv"><span>⚽ Buts</span><span>${fnum(pf.goals_pct,1)} %</span><span>🛡️ Arrêts</span><span>${fnum(pf.saves_pct,1)} %</span><span>🤝 Passes décisives</span><span>${fnum(pf.assists_pct,1)} %</span></div><p class="mut" style="font-size:.8rem;margin-top:.5rem">Part de chaque action dans tes contributions (tracker.gg). Profil plutôt offensif : tu marques plus que tu ne défends.</p></div></div>
  <p class="mut" style="font-size:.78rem">Source : captures tracker.gg, mise à jour manuelle. Les valeurs ≈ sont approximatives.</p>${bcHTML()}`;
  app.innerHTML=h;bindGarage();bindGoalDel(rlManual);animBars();bcProgressChart();$$('tr[data-bc]').forEach(r=>r.onclick=()=>go('#/rl/'+r.dataset.bc));
  $$('[data-rg]').forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id==b.dataset.rg);if(addGoal({type:'rl_rank',playlist:p.id,target:rlNext(p),div:1,start:rlVal(p.tier,p.div)}))rlManual()});
  chart($('#r1'),{type:'line',data:{labels:H.map(x=>fshort(x.date)+' · '+(x.note||'').replace('de session','')),datasets:[lineDS('MMR 3v3',H.map(x=>x.mmr),COL.rlA),lineDS('Record S38 (654)',H.map(()=>654),COL.rlB,{fill:false,borderDash:[6,4],pointRadius:0})]},options:{plugins:{title:{display:true,text:'MMR 3v3 (relevés des captures)'}}}});
  chart($('#r2'),{type:'doughnut',data:{labels:['Buts','Arrêts','Passes'],datasets:[{data:[pf.goals_pct,pf.saves_pct,pf.assists_pct],backgroundColor:[COL.rlA,COL.rlB,COL.vi],borderWidth:0}]},options:{plugins:{legend:{position:'bottom'}}}});
}

/* ========== COD : ajout de partie depuis l'app (OCR des 2 captures) ========== */
const CPK='gt-cod-pending',CK=['date','mode','map','result','score_team','score_enemy','ranked','mvp','team_place','score','kills','deaths','assists','kd','impact','objective_time','rank_xp','xp_gained','accuracy_pct','headshot_pct','damage','capture_kills','distance'];
const codPend=()=>{const repo=D.codRepo||[],mn=t=>Math.floor(new Date(t).getTime()/6e4),keys=new Set(repo.map(m=>mn(m.date)));const a=LS.get(CPK,[]).filter(m=>m&&m.date&&!keys.has(mn(m.date))&&!repo.some(r=>r.id==m.id));LS.set(CPK,a);return a};
function codRefresh(){const ok=m=>m.date&&(m.type||m.kills!=null);D.cod=[...(D.codRepo||[]).filter(ok),...codPend().map(m=>({...m,pending:1}))].sort((a,b)=>new Date(a.date)-new Date(b.date))}
const parisISO=s=>{if(!s)return null;if(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(s))s+=':00';const d=new Date(s);if(isNaN(d))return null;const o=-d.getTimezoneOffset(),p=n=>String(Math.floor(Math.abs(n))).padStart(2,'0');return s.slice(0,19)+(o>=0?'+':'-')+p(o/60)+':'+p(o%60)};
const codSyncURLs=()=>codPend().map(m=>{const row=CK.map(k=>typeof m[k]=='boolean'?+m[k]:m[k]??null);while(row.length&&row.at(-1)==null)row.pop();
  const t=new Date(m.date).toLocaleString('fr-FR',{...TZ,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});return [t,ghNew('COD – '+t,{action:'add',c:[row]},'cod-partie')]});
const codSyncURL=()=>codSyncURLs()[0]?.[1]||null;
function codSyncBox(){const a=codPend();if(!a.length)return '';const at=LS.get('gt-cod-sync-at',0),late=at&&Date.now()-at>6e5;
  return `<div class="glass pad" id="codsync" style="border-color:var(--warn);margin:.6rem 0"><b>📲 ${a.length} partie${a.length>1?'s':''} seulement sur cet appareil</b>
  ${late?`<p class="down" style="font-size:.85rem;margin:.3rem 0">⚠️ La dernière synchronisation n'a pas abouti (formulaire GitHub non validé ou erreur du robot, expliquée en commentaire de la demande). Réessaie.</p>`:''}
  <p class="mut" style="font-size:.85rem;margin:.3rem 0 .6rem">Elle${a.length>1?'s':''} compte${a.length>1?'nt':''} déjà dans tes stats ici. Touche « Synchroniser », connecte-toi à GitHub si besoin, puis valide avec <b>« Create »</b> sans rien modifier.</p>
  ${codSyncURLs().map(([t,u],i)=>`<a class="btn full codsync" ${i?'':'id="codsyncbtn"'} style="margin-top:${i?'.4rem':'0'}" href="${esc(u)}" target="_blank" rel="noopener">🔄 Synchroniser (GitHub)${a.length>1?' · '+esc(t):''}</a>`).join('')}</div>`}
function codSyncBind(){$$('.codsync').forEach(a=>a.onclick=()=>{LS.set('gt-cod-sync-at',Date.now());toast('📝 Valide la demande GitHub (« Create » / « Submit ») pour terminer')})}
const COD_FIELDS=[['date','Date et heure','datetime-local'],['mode','Mode','mode'],['map','Carte','map'],['result','Résultat','result'],['score_team','Score équipe','number'],['score_enemy','Score adverse','number'],
 ['ranked','Classée','bool'],['mvp','MVP','bool'],['team_place','Place dans l\'équipe','number'],['score','Score','number'],['kills','Éliminations','number'],['deaths','Morts','number'],['assists','Assistances','number'],
 ['impact','Impact','number'],['objective_time','Temps sur l\'objectif (mm:ss)','text'],['rank_xp','EXP de grade gagnée','number'],['xp_gained','EXP gagnée','number'],['kd','Ratio É/M','number'],
 ['accuracy_pct','Précision (%)','number'],['headshot_pct','Tir à la tête (%)','number'],['damage','Total de dégâts','number'],['capture_kills','Élim. en capture','number'],['distance','Distance parcourue','number']];
const CS={slots:{sb:null,det:null},busy:0};
function codAdd(){CS.slots={sb:null,det:null};CS.busy=0;
  app.innerHTML=`<h2>Ajouter une partie</h2><p class="mut" style="font-size:.88rem">Une partie = <b>2 captures</b> de l'écran de fin de partie. Les valeurs sont lues automatiquement (sur ton appareil, rien n'est envoyé), puis tu vérifies avant d'enregistrer.</p>
  <div class="two" id="slots">${[['sb','1. Tableau des scores','« Détails de la partie » : score, É/M/A, temps, impact + EXP en haut'],['det','2. Détails · Impact','« Détails », onglet Impact : total de dégâts, élim. en capture, distance']].map(([k,t,d])=>`<label class="glass pad slot" data-s="${k}" style="display:block;cursor:pointer;border-style:dashed;text-align:center;min-height:150px">
   <input type="file" accept="image/*" data-in="${k}" style="display:none"><b>${t}</b><br><small class="mut">${d}</small><div class="sv" style="margin-top:.5rem"><span style="font-size:2rem">📷</span><br><small class="mut">Toucher pour choisir</small></div></label>`).join('')}</div>
  <label class="btn ghost full" style="margin-top:.6rem;cursor:pointer">🖼️ Choisir les 2 captures d'un coup<input type="file" accept="image/*" multiple id="both" style="display:none"></label>
  <div id="ocrst" class="mut" style="margin:.6rem 0;font-size:.88rem"></div><div id="codform"></div>`;
  $$('[data-in]').forEach(i=>i.onchange=()=>{if(i.files[0])codTake([...i.files],i.dataset.in);i.value=''});
  $('#both').onchange=e=>{const f=[...e.target.files];if(f.length)codTake(f.slice(0,2),null);e.target.value=''};
  codSlotsDraw();
}
function codSlotsDraw(){for(const k of ['sb','det']){const s=CS.slots[k],el=$(`.slot[data-s="${k}"] .sv`);if(!el)continue;
  el.innerHTML=s?`<img src="${s.url}" alt="" style="width:100%;border-radius:10px;max-height:140px;object-fit:cover"><br><small class="${s.err?'down':'up'}">${s.err?'⚠️ '+esc(s.err):'✅ Lue · '+esc(s.r.header.date?fdate(parisISO(s.r.header.date)):'date ?')}</small>`:`<span style="font-size:2rem">📷</span><br><small class="mut">Toucher pour choisir</small>`;
  $(`.slot[data-s="${k}"]`).style.borderColor=s?(s.err?'var(--bad)':'var(--gr)'):''}}
async function codTake(files,want){CS.busy++;const st=$('#ocrst');
  try{for(const f of files){st.innerHTML=`⏳ Lecture de « ${esc(f.name)} »… (1ʳᵉ fois : chargement du moteur de lecture, quelques secondes)`;
    const r=await COD_OCR.analyse(f,'NVCBlood'),k=r.kind=='scoreboard'?'sb':r.kind=='details'?'det':null,url=URL.createObjectURL(f);
    if(!k){const slot=want||(!CS.slots.sb?'sb':'det');CS.slots[slot]={url,r,err:'Capture non reconnue (ni tableau des scores, ni onglet Impact)'};continue}
    if(want&&want!=k)toast('🔁 Capture placée automatiquement dans « '+(k=='sb'?'1. Tableau des scores':'2. Détails · Impact')+' »');
    CS.slots[k]={url,r,err:r.error||null}}}
  catch(e){toast('⚠️ '+e.message);st.innerHTML=`<span class="down">⚠️ ${esc(e.message)}</span>`}finally{CS.busy--}
  codSlotsDraw();codCheck()}
function codCheck(){const st=$('#ocrst'),{sb,det}=CS.slots;$('#codform').innerHTML='';
  if(!sb||!det||sb.err||det.err){st.innerHTML=!sb&&!det?'':`Il manque ${!sb||sb.err?'la capture 1 (tableau des scores)':'la capture 2 (détails · impact)'}.`;return}
  const a=sb.r.header,b=det.r.header,same=a.date&&b.date?a.date==b.date:(a.score_team==b.score_team&&a.score_enemy==b.score_enemy&&a.result==b.result&&a.mode==b.mode);
  if(!same){st.innerHTML=`<span class="down">⚠️ Les 2 captures ne sont pas de la même partie (${esc(a.date||'?')} · ${a.score_team}:${a.score_enemy} vs ${esc(b.date||'?')} · ${b.score_team}:${b.score_enemy}). Remplace l'une d'elles.</span>`;return}
  const F={...sb.r.fields,...det.r.fields};CS.full=a.date||b.date||'';
  const v={date:(a.date||b.date||'').slice(0,16),mode:a.mode||b.mode,map:a.map||b.map,result:a.result||b.result,score_team:a.score_team??b.score_team,score_enemy:a.score_enemy??b.score_enemy,ranked:(F.rank_xp||0)>0,...F};
  const notes=[...(sb.r.notes||[]),...(det.r.notes||[]),...(!a.date||!b.date?['date lue sur une seule capture : vérifie']:[])];
  st.innerHTML=`✅ Les 2 captures correspondent. Vérifie les valeurs (les champs en orange n'ont pas pu être lus).${notes.length?`<br><small class="mut">${esc(notes.join(' · '))}</small>`:''}`;
  const inp=([k,l,t])=>{const val=v[k],miss=val==null||val==='';const cs=`style="${miss?'border-color:var(--warn)':''}"`;
    if(t=='bool')return `<label style="flex-direction:row;display:flex;align-items:center;gap:.5rem"><input type="checkbox" name="${k}" ${val?'checked':''} style="min-height:auto;width:22px;height:22px"> ${l}</label>`;
    if(t=='result')return `<label>${l}<select name="${k}" ${cs}>${[['win','Victoire'],['loss','Défaite'],['draw','Égalité']].map(([a,b])=>`<option value="${a}"${val==a?' selected':''}>${b}</option>`).join('')}</select></label>`;
    if(t=='mode')return `<label>${l}<input name="${k}" list="codmodes" value="${esc(val??'')}" ${cs}><datalist id="codmodes">${COD_OCR.MODES.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>`;
    if(t=='map')return `<label>${l}<input name="${k}" list="codmaps" value="${esc(val??'')}" ${cs}><datalist id="codmaps">${[...new Set([...D.cod.map(x=>x.map).filter(Boolean),...COD_OCR.MAPS])].map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>`;
    return `<label>${l}<input name="${k}" type="${t=='number'?'text':t}" ${t=='number'?'inputmode="decimal"':''} value="${esc(val??'')}" ${cs}></label>`};
  $('#codform').innerHTML=`<form class="glass form" id="cf" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.6rem">${COD_FIELDS.map(inp).join('')}
   <div style="grid-column:1/-1"><button class="btn full" type="submit">💾 Enregistrer la partie</button></div></form>`;
  $('#cf').onsubmit=e=>{e.preventDefault();codSave(new FormData(e.target),e.target)}}
function codSave(fd,form){const g=k=>{const x=fd.get(k);return x==null?null:String(x).trim()},n=k=>{const x=g(k);if(x==null||x==='')return null;const y=parseFloat(x.replace(',','.'));return isNaN(y)?null:y};
  const gd=g('date'),date=parisISO(CS.full&&CS.full.slice(0,16)==gd?CS.full:gd);if(!date)return toast('⚠️ Date invalide');
  const m={id:'app-'+date.slice(0,16).replace(/[-:T]/g,''),date,source:'app-ocr',type:'MP',ranked:!!form.ranked.checked,mode:g('mode')||null,map:g('map')||null,result:g('result'),
    score_team:n('score_team'),score_enemy:n('score_enemy'),team_place:n('team_place'),team_size:5,score:n('score'),kills:n('kills'),deaths:n('deaths'),assists:n('assists'),kd:n('kd'),impact:n('impact'),
    objective_time:g('objective_time')||null,rank_xp:n('rank_xp'),xp_gained:n('xp_gained'),accuracy_pct:n('accuracy_pct'),headshot_pct:n('headshot_pct'),mvp:!!form.mvp.checked,damage:n('damage'),capture_kills:n('capture_kills'),distance:n('distance')};
  const ot=(m.objective_time||'').match(/^(\d{1,2}):(\d{2})$/);if(m.objective_time&&!ot)return toast('⚠️ Temps sur l\'objectif : format mm:ss');if(ot){m.objective_time=ot[1].padStart(2,'0')+':'+ot[2];m.objective_time_s=+ot[1]*60+ +ot[2]}
  if(m.kills==null||m.deaths==null)return toast('⚠️ Éliminations et morts sont obligatoires');
  if(m.kd==null)m.kd=Math.round(100*(m.deaths?m.kills/m.deaths:m.kills))/100;
  for(const k of ['accuracy_pct','headshot_pct'])if(m[k]!=null&&(m[k]<0||m[k]>100))return toast('⚠️ Pourcentage invalide');
  const mn=t=>Math.floor(new Date(t).getTime()/6e4),dup=D.cod.find(x=>mn(x.date)==mn(date));
  if(dup)return toast('ℹ️ Cette partie est déjà enregistrée ('+fdate(dup.date)+')');
  const a=LS.get(CPK,[]);a.push(gClean(m));if(!LS.set(CPK,a))return toast('⚠️ Impossible d\'enregistrer sur cet appareil (navigation privée ?)');
  codRefresh();computeXP();toast('✅ Partie enregistrée — pense à « Synchroniser »');go('#/cod')}

/* ========== Bilan hebdo + coaching (calculé depuis tes données) ========== */
const wkWin=(a,days=7)=>{const n=Date.now();return a.filter(x=>{const t=new Date(x.date||x.fetched_at).getTime();return t>n-days*864e5&&t<=n})};
const wkPrev=(a,days=7)=>{const n=Date.now();return a.filter(x=>{const t=new Date(x.date||x.fetched_at).getTime();return t>n-2*days*864e5&&t<=n-days*864e5})};
const delta=(a,b,d=1,u='')=>{if(a==null||b==null)return '<span class="mut">—</span>';const x=a-b;return `<span class="${x>0?'up':x<0?'down':''}">${x>0?'▲ +':x<0?'▼ ':''}${fnum(x,d)}${u}</span> <small class="mut">(avant : ${fnum(b,d)}${u})</small>`};
function bilan(){
  setTimeout(bindPlayRows,0);
  const now=new Date(),c1=wkWin(D.cod),c0=wkPrev(D.cod);
  const vAll=(D.vh?.matches||[]).filter(x=>x.mode=='Competitive'),v1=wkWin(vAll),v0=wkPrev(vAll);
  const R=bcReps(),r1=wkWin(R),r0=wkPrev(R),W=D.bc?.weekly||[];
  const rr=a=>a.length?a.reduce((s,x)=>s+(x.rr_change||0),0):null, vw=a=>a.length?100*a.filter(x=>x.result=='win').length/a.length:null;
  const rm=(a,k)=>avg(a.map(x=>({v:x.m?.[k]})),'v'), coach=[];
  // Coaching RL : faiblesses récurrentes des replays
  const wc={};R.forEach(x=>(x.analysis?.weaknesses||[]).forEach(w=>{(wc[w.label]??={n:0,w}).n++}));const topW=Object.values(wc).sort((a,b)=>b.n-a.n).slice(0,3);
  topW.forEach(({n,w})=>coach.push(['🚗 Rocket League',`${w.label} — vu dans ${n}/${R.length} replays (calculé)`,w.txt,w.drill]));
  if(!topW.length&&W.length&&W.at(-1).focus)coach.push(['🚗 Rocket League',W.at(-1).focus.label,W.at(-1).focus.txt,W.at(-1).focus.drill]);
  // Coaching COD
  if(c1.length||D.cod.length){const a=c1.length?c1:D.cod.slice(-10),acc=avg(a,'accuracy_pct'),obj=avg(a,'objective_time_s'),maps={};a.forEach(x=>(maps[x.map||'?']??=[]).push(x));
    const worst=Object.entries(maps).map(([k,v])=>[k,wr(v)]).filter(x=>x[1]!=null).sort((x,y)=>x[1]-y[1])[0];
    if(acc!=null&&acc<32)coach.push(['🔫 COD Mobile',`Précision ${fnum(acc,1)} % sur ${a.length} partie(s) (calculé)`,'Ta précision est le levier le plus rentable : chaque balle qui touche augmente tes dégâts sans changer ton placement.','Stand de tir, 10 min/jour : 3 min de tracking sur cibles mobiles, 3 min de flicks tête, 4 min de spray transfer. Baisse légèrement la sensibilité si tu dépasses les cibles, augmente-la si tu arrives toujours en retard.']);
    if(obj!=null&&obj<60)coach.push(['🔫 COD Mobile','Temps sur l’objectif faible (modes à objectif, calculé)','En Point stratégique/Domination, l’impact vient de contester au bon moment, pas de camper : arrive 3 s avant la rotation, pose-toi sur un bord de zone avec une ligne de tir.','Entraînement : 5 parties en ne jouant que la rotation — quitte l’objectif perdu à 10 s de la fin, pré-positionne-toi sur le suivant et note tes morts « inutiles ».']);
    if(worst)coach.push(['🔫 COD Mobile',`Carte la plus difficile : ${worst[0]} (${fnum(worst[1],0)} % de victoires, calculé)`,'Revois tes lignes de tir et tes rotations sur cette carte plutôt que de changer d’arme.','Partie privée sur '+worst[0]+' : repère 3 positions de tête (head-glitch), 2 rotations sûres et les timings d’apparition des objectifs, puis 3 parties classées en les appliquant.']);
    if(avg(a,'deaths')>12)coach.push(['🔫 COD Mobile',`Morts élevées : ${fnum(avg(a,'deaths'),1)}/partie (calculé)`,'Tu échanges trop de duels à découvert : joue plus près des couverts et coupe les lignes de tir longues.','Règle d’entraînement sur 5 parties : jamais de sprint en ligne droite dans une zone ouverte ; slide/jump uniquement pour traverser, puis vise en sortant de couvert.'])}
  // Coaching Valorant
  if(vAll.length){const a=v1.length?v1:vAll.slice(-10),g=vAgg(a);
    if(g.hs!=null&&g.hs<25)coach.push(['🎯 Valorant',`Tirs à la tête : ${fnum(g.hs,0)} % (calculé)`,'Viser la tête plutôt que le torse raccourcit le temps pour tuer et gagne les duels à distance égale.','Deathmatch 15 min en Sheriff/Guardian uniquement, en visant la tête et en strafant entre les tirs ; puis 10 min de practice range (bots moyens, strafes). Objectif : +5 points de HS %.']);
    if(g.kd!=null&&g.kd<1)coach.push(['🎯 Valorant',`K/D ${fnum(g.kd,2)} sur les parties récentes (calculé)`,'Tu meurs plus que tu ne tues : travaille les duels pris avec un avantage (angle, utilitaire, info) plutôt que les duels 50/50.','En deathmatch, ne prends que des angles « off-angle » et pré-vise les sorties ; en partie, annonce/attends l’info avant de peek. Note chaque mort : duel sec, trade raté ou mauvais placement.']);
    const fk=a.filter(x=>x.first_kills!=null);if(fk.length&&avg(fk,'first_kills')<1.2)coach.push(['🎯 Valorant','Peu de premières éliminations (calculé)','Les ouvertures créent les rounds en surnombre : travaille un peek propre (jiggle, jump-spot, puis swing large) plutôt qu’un peek lent.','Practice : 10 min de counter-strafe + tir unique sur bots en mouvement, puis 1 deathmatch en ne jouant que les entrées de site.'])}
  const row=(n,a,b,d=1,u='')=>`<tr><td>${n}</td><td>${a==null?'—':fnum(a,d)+u}</td><td>${delta(a,b,d,u)}</td></tr>`;
  const tbl=(t,rows)=>rows.some(r=>r[1]!=null)?`<h2>${t}</h2><div class="glass tbl"><table><tr><th></th><th>7 j</th><th>Écart vs 7 j avant</th></tr>${rows.map(r=>row(...r)).join('')}</table></div>`:`<h2>${t}</h2><div class="glass empty">Pas de partie cette semaine — rien à comparer (reviens après quelques parties).</div>`;
  app.innerHTML=`<h2>📊 Bilan de la semaine</h2><p class="mut" style="font-size:.85rem">Comparaison calculée : 7 derniers jours vs 7 jours précédents, d'après tes parties enregistrées. Semaine en cours depuis le ${fshort(new Date(now-7*864e5))}.</p>
  ${tbl('🔫 COD Mobile',[['Parties',c1.length,c0.length,0],['Victoires %',wr(c1),wr(c0),0,' %'],['K/D',kdOf(c1),kdOf(c0),2],['Élim. moy.',avg(c1,'kills'),avg(c0,'kills')],['Dégâts moy.',avg(c1,'damage'),avg(c0,'damage'),0],['Impact moy.',avg(c1,'impact'),avg(c0,'impact'),0],['Précision %',avg(c1,'accuracy_pct'),avg(c0,'accuracy_pct'),1,' %']])}
  ${tbl('🎯 Valorant (classé)',[['Parties',v1.length,v0.length,0],['Victoires %',vw(v1),vw(v0),0,' %'],['RR gagnés/perdus',rr(v1),rr(v0),0],['K/D',vAgg(v1).kd,vAgg(v0).kd,2],['HS %',vAgg(v1).hs,vAgg(v0).hs,0,' %'],['ADR',vAgg(v1).adr,vAgg(v0).adr,0]])}
  ${tbl('🚗 Rocket League (replays)',[['Replays',r1.length,r0.length,0],['Victoires %',r1.length?100*r1.filter(x=>x.result=='win').length/r1.length:null,r0.length?100*r0.filter(x=>x.result=='win').length/r0.length:null,0,' %'],['Précision tirs %',rm(r1,'shooting_pct'),rm(r0,'shooting_pct'),1,' %'],['Boost moyen',rm(r1,'avg_boost'),rm(r0,'avg_boost'),1],['Temps supersonique %',rm(r1,'pct_supersonic'),rm(r0,'pct_supersonic'),1,' %'],['Derrière la balle %',rm(r1,'pct_behind_ball'),rm(r0,'pct_behind_ball'),1,' %']])}
  ${steamPlaytimeHTML()}
  <h2>🏋️ Coaching (avis, d'après tes faiblesses mesurées)</h2>${coach.length?`<div class="list">${coach.map(([g,t,x,d])=>`<div class="glass pad"><small class="mut">${g}</small><br><b>${esc(t)}</b><p style="margin:.35rem 0">${esc(x)}</p><p class="mut" style="margin:0">🏋️ ${esc(d)}</p></div>`).join('')}</div>`:'<div class="glass empty">Pas assez de données récentes pour un coaching ciblé : enregistre quelques parties COD, replays RL ou parties classées Valorant.</div>'}
  <p class="mut" style="font-size:.78rem">« Calculé » = dérivé de tes chiffres. « Avis » = interprétation et exercices proposés, à adapter à ton ressenti.</p>`;
}
function storageHTML(){return `<h2>💾 Stockage de l'appareil</h2><div class="glass pad" id="stor"><p class="mut" style="margin:0">Mesure en cours…</p></div>
  <p class="mut" style="font-size:.8rem">Capacité du dépôt GitHub : GitHub n'expose pas de quota restant pour un dépôt depuis un site statique — on affiche la taille du dépôt (API publique) sans pouvoir connaître une limite restante. Les données en attente (objectifs, parties/rangs COD non synchronisés) restent sur cet appareil tant qu'elles ne sont pas synchronisées.</p>`}
async function storageFill(){const el=$('#stor');if(!el)return;const fmt=b=>b==null?'—':b<1024?b+' o':b<1048576?fnum(b/1024,1)+' Ko':fnum(b/1048576,2)+' Mo';
  let rows='';try{const ls={};let tot=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),v=localStorage.getItem(k)||'';ls[k]=(ls[k]||0)+v.length*2;tot+=v.length*2}
    rows+=Object.entries(ls).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span>${esc(k)}</span><span>${fmt(v)}</span>`).join('')+`<span><b>Total local (app)</b></span><span><b>${fmt(tot)}</b></span>`}catch(e){rows+='<span>Stockage local</span><span>indisponible</span>'}
  if(navigator.storage&&navigator.storage.estimate){try{const e=await navigator.storage.estimate();rows+=`<span>Utilisé par ce site (navigateur)</span><span>${fmt(e.usage)}</span><span>Quota du navigateur (estimation)</span><span>${fmt(e.quota)}</span><span>Restant (estimation)</span><span>${e.quota!=null?fmt(Math.max(0,e.quota-(e.usage||0))):'—'}</span>`}catch(e){}}
  try{const r=await fetch('https://api.github.com/repos/Blood63/gaming-tracker');if(r.ok){const j=await r.json();rows+=`<span>Taille du dépôt GitHub (API publique)</span><span>${fmt((j.size||0)*1024)}</span>`}}catch(e){}
  el.innerHTML=`<div class="kv">${rows||'<span>Aucune mesure disponible</span><span>—</span>'}</div>`}

/* Temps de jeu Steam depuis history/steam.jsonl (deltas playtime_forever, calculé) */
function bindPlayRows(){setTimeout(()=>$$('tr[data-g]').forEach(r=>r.onclick=()=>go('#/steam/'+r.dataset.g)),0)}
function steamPlaytimeHTML(){
  const H=D.steamH;if(H.length<2)return `<h2>Temps de jeu (relevés Steam)</h2><div class="glass empty">Pas encore assez de relevés Steam pour calculer une évolution (il en faut au moins 2). Les relevés ont lieu mercredi et dimanche à minuit.</div>`;
  const pf=g=>g.playtime_forever!=null?g.playtime_forever:Math.round((g.hours||0)*60),last=H.at(-1),now=Date.now();
  const base7=[...H].reverse().find(x=>new Date(x.fetched_at).getTime()<=now-7*864e5)||null,win=base7||H[0];
  const rows=D.games.map(g=>{const a=(win.games||[]).find(x=>x.appid==g.appid),b=(last.games||[]).find(x=>x.appid==g.appid);if(!a||!b)return null;const d=pf(b)-pf(a);return{name:g.name,appid:g.appid,d,ach:(b.ach_unlocked||0)-(a.ach_unlocked||0)}}).filter(x=>x&&(x.d>0||x.ach>0)).sort((a,b)=>b.d-a.d);
  const tot=rows.reduce((s,x)=>s+x.d,0);
  return `<h2>Temps de jeu ${base7?'cette semaine':'depuis le premier relevé'} (calculé)</h2>
  ${base7?'':`<p class="pill warn">Historique Steam encore court (premier relevé le ${fdate(H[0].fetched_at)}) : la comparaison « 7 jours » ne sera fiable qu'après le ${fdate(new Date(new Date(H[0].fetched_at).getTime()+7*864e5))}. En attendant, deltas depuis le premier relevé.</p>`}
  ${rows.length?`<div class="stats">${stat('Total joué',fnum(tot/60,1)+' h',`${rows.length} jeu${rows.length>1?'x':''} · du ${fshort(win.fetched_at)} au ${fshort(last.fetched_at)}`)}${stat('Jeu n°1',esc(rows[0].name),fnum(rows[0].d/60,1)+' h')}</div>
  <div class="glass tbl" style="margin-top:.6rem"><table><tr><th>Jeu</th><th>Temps</th><th>Succès</th></tr>${rows.map(x=>`<tr data-g="${x.appid}" style="cursor:pointer"><td><b>${esc(x.name)}</b></td><td>${x.d>=60?fnum(x.d/60,1)+' h':fnum(x.d,0)+' min'}</td><td>${x.ach>0?'+'+x.ach:'—'}</td></tr>`).join('')}</table></div>`:'<div class="glass empty">Aucun temps de jeu supplémentaire entre les relevés.</div>'}`;
}
/* ========== composants ========== */
function gameCard(g,sub){
  const badge=!g.hours&&!g.last?'<span class="badge" style="color:var(--warn)">Jamais lancé</span>':g.ach_total&&g.pct==100?'<span class="badge" style="color:var(--gr)">100 %</span>':'';
  return `<a class="glass game" href="#/steam/${g.appid}"><div class="im"><img loading="lazy" src="${esc(g.img)}" alt="" onerror="this.style.opacity=0">${badge}</div><div class="b"><div class="n">${esc(g.name)}</div>
  <div class="m"><span>${sub||fnum(g.hours,1)+' h'}</span><span>${g.ach_total?`🏆 ${g.ach_unlocked||0}/${g.ach_total}`:''}</span></div>${bar(g.pct)}</div></a>`;
}
const trnStatus=h=>{const l=h.at(-1);return l?.status=='ok'?'Connecté':l?.http==401?'Clé refusée (401)':l?.http?'Erreur HTTP '+l.http:'En attente de clé'};
function compCards(){
  const v=D.vOk.at(-1),r=D.rOk.at(-1),ck=kdOf(D.cod);
  const vRank=v&&S(overview(v),'rank')?.metadata?.tierName;
  const rlBest=r&&segs(r).filter(s=>s.type=='playlist').map(s=>num(S(s,'rating')?.value)).filter(x=>x!=null).sort((a,b)=>b-a)[0];
  return `<a class="glass gcard steam-gcard" style="--c:var(--steam)" href="#/steam"><div class="t"><i></i>Steam</div><div class="big">${fnum(D.totalH,0)} h</div><div class="s">${D.games.length} jeux · niv. ${D.steam?.level??'—'}</div></a>
   <a class="glass gcard val-gcard" style="--c:var(--val)" href="#/valorant"><div class="t"><i></i>Valorant</div><div class="big">${D.vh?vIcon(D.vh.mmr.tier_id,26)+' '+esc(vTier(D.vh.mmr.tier)):v?esc(vRank||'—'):'⏳'}</div><div class="s">${D.vh?fnum(D.vh.mmr.rr)+' RR · Blood#7629':v?'Blood#7629':trnStatus(D.val)}</div></a>
   <a class="glass gcard rl-gcard" style="--c:var(--rl)" href="#/rl"><div class="t"><i></i>Rocket League</div><div class="big">${r?fnum(rlBest)+' MMR':D.rlm?esc(D.rlm.playlists.find(p=>p.id=='3v3')?.tier_name||'—'):'⏳'}</div><div class="s">${r?'443Blood · Epic':D.rlm?'3v3 · '+fnum(D.rlm.playlists.find(p=>p.id=='3v3')?.mmr)+' MMR (manuel)':trnStatus(D.rl)}</div></a>
   <a class="glass gcard cod-gcard" style="--c:var(--cod)" href="#/cod"><div class="t"><i></i>COD Mobile</div><div class="big">${D.cod.length?'K/D '+fnum(ck,2):D.cp?'É/M '+fnum(D.cp.multiplayer?.kd,2):'📸'}</div><div class="s">${D.cod.length?D.cod.length+' parties suivies':D.cp?fnum((D.cp.multiplayer?.matches||0)+(D.cp.battle_royale?.matches||0))+' parties en carrière':'Envoie ta 1ʳᵉ capture'}</div></a>`;
}

/* ========== pages ========== */
function home(){
  const recent=(D.steam?.recent?.games||[]).map(r=>({g:D.games.find(x=>x.appid==r.appid),r})).filter(x=>x.g);
  const backlog=D.games.filter(g=>!g.hours&&!g.last);
  const near=D.games.filter(g=>g.ach_total&&g.pct>=40&&g.pct<100).sort((a,b)=>b.pct-a.pct).slice(0,3);
  const gl=goals().map(x=>({x,...goalProg(x)})).filter(x=>x.p<100).slice(0,2);
  app.innerHTML=`${levelCard()}
  <h2>Mes jeux</h2><div class="hero">${compCards()}</div>
  <div style="margin-top:.8rem">${codBtn('full')}</div>
  <a class="glass tile" style="--c:var(--vi)" href="#/bilan"><span class="ic">📊</span><span class="n"><b>Bilan de la semaine</b><small class="mut">Progression et coaching</small></span><span class="chev">›</span></a>
  ${recent.length?`<h2>Joué récemment <a class="more" href="#/steam">Tout voir ›</a></h2><div class="grid">${recent.map(({g,r})=>gameCard(g,`${fnum(r.playtime_2weeks/60,1)} h / 2 sem.`)).join('')}</div>`:''}
  <h2>En bref</h2><div class="stats">${stat('Succès',`${D.ach}/${D.achT}`,D.achT?fnum(100*D.ach/D.achT,0)+' % débloqués':'')}${stat('Jeu favori',esc(D.games[0]?.name||'—'),D.games[0]?fnum(D.games[0].hours,1)+' h':'')}${stat('Jamais lancés',backlog.length,`sur ${D.games.length} jeux`)}${stat('Badges',`${badges().filter(b=>b.ok).length}/${badges().length}`,'<a href="#/profil">voir ›</a>')}</div>
  ${near.length?`<h2>Presque complétés</h2><div class="list">${near.map(g=>`<a class="glass row" href="#/steam/${g.appid}"><img src="${esc(g.img)}" alt="" loading="lazy"><span class="n"><b>${esc(g.name)}</b><br><small>${g.ach_unlocked}/${g.ach_total} succès</small>${bar(g.pct)}</span><span class="p">${g.pct} %</span></a>`).join('')}</div>`:''}
  <h2>Objectifs <a class="more" href="#/objectifs">Gérer ›</a></h2>${gl.length?`<div class="list">${gl.map(goalHTML).join('')}</div>`:`<a class="glass tile" style="--c:var(--vi)" href="#/objectifs"><span class="ic">🎯</span><span class="n"><b>Fixe-toi un objectif</b><small class="mut">heures, succès, K/D, niveau…</small></span><span class="chev">›</span></a>`}
  <h2>Activité récente <a class="more" href="#/activite">Tout voir ›</a></h2>${tlHTML(timeline().slice(0,5))}`;
  animBars();animRings();
}
function steamWin(days){const H=D.steamH;if(H.length<2)return null;const now=Date.now(),last=H.at(-1);
  const base=[...H].reverse().find(x=>new Date(x.fetched_at).getTime()<=now-days*864e5),b0=base||H[0];
  const pf=g=>g.playtime_forever!=null?g.playtime_forever:Math.round((g.hours||0)*60),m={};
  (last.games||[]).forEach(g=>{const a=(b0.games||[]).find(x=>x.appid==g.appid);if(a)m[g.appid]=pf(g)-pf(a)});return{m,full:!!base,from:b0.fetched_at}}
const fmin=d=>d>=60?fnum(d/60,1)+' h':fnum(d,0)+' min';
function steamCard(g,W,M,i){const w=W?.m[g.appid]||0,mo=M?.m[g.appid]||0,never=!g.hours&&!g.last;
  const tape=['tp-a','tp-b','tp-c'][i%3];
  return `<a class="pcard" href="#/steam/${g.appid}" style="--tilt:${i%2?'-3deg':'3deg'}"><span class="tape ${tape}" aria-hidden="true"></span>
   <span class="frame"><img loading="lazy" decoding="async" src="${esc(g.img)}" width="460" height="215" alt="" onerror="this.style.opacity=0"></span>
   <span class="pn">${esc(g.name)}</span>
   <span class="pm">${never?'<span class="tag warn">Jamais lancé</span>':`<span title="Temps joué sur 7 jours (calculé)">7 j : <b>${w>0?'+'+fmin(w):'—'}</b></span><span title="Temps joué sur 30 jours (calculé)">30 j : <b>${mo>0?'+'+fmin(mo):'—'}</b></span>`}${g.ach_total?`<span>🏆 ${g.ach_unlocked||0}/${g.ach_total}${g.pct==100?' · 100 %':''}</span>`:''}</span>
   <span class="pbadge px px-vi">${g.hours?fnum(g.hours,1)+' h':'0 h'}</span></a>`}
function library(){
  const st=JSON.parse(sessionStorage.getItem('lib')||'{}');const q=st.q||'',f=st.f||'all',s=st.s||'hours';
  const genres=[...new Set(D.games.flatMap(g=>g.genres))].sort();
  const W=steamWin(7),M=steamWin(30);
  const FL=[['all','Tous'],['playing','Joués'],['week','Joués cette semaine'],['never','Jamais lancés'],['done','100 % succès'],['dlc','Avec DLC']],SO=[['hours','Temps de jeu'],['week','7 jours'],['month','30 jours'],['last','Dernière session'],['pct','Succès %'],['name','Nom'],['meta','Metacritic']];
  app.innerHTML=`<div class="stats">${stat('Temps total',fnum(D.totalH,1)+' h')}${stat('Jeux',D.games.length,`${D.games.filter(g=>!g.hours&&!g.last).length} jamais lancés`)}${stat('Succès',`${D.ach}/${D.achT}`,D.achT?fnum(100*D.ach/D.achT,1)+' %':'')}${stat('Niveau Steam',D.steam?.level??'—')}</div>
  <h2>Bibliothèque</h2>
  <div class="shopbar"><label class="glass search">🔎<input id="q" type="search" placeholder="Rechercher un jeu…" value="${esc(q)}" autocomplete="off"></label>
   <div class="pxrow" id="fl" role="group" aria-label="Filtre">${FL.map(([k,n])=>`<button type="button" class="px px-bl${k==f?' on':''}" data-f="${k}" aria-pressed="${k==f}">${n}</button>`).join('')}<select id="fg" class="px px-bl pxsel" aria-label="Genre"><option value="">Genre…</option>${genres.map(x=>`<option value="g:${esc(x)}"${f=='g:'+x?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
   <div class="pxrow sort" role="group" aria-label="Tri"><span class="mut">Trier :</span>${SO.map(([k,n])=>`<button type="button" class="px px-gh${k==s?' on':''}" data-s="${k}" aria-pressed="${k==s}">${n}</button>`).join('')}</div></div>
  <p class="pnote">Badge = temps total · 7 j / 30 j = temps joué sur la période (calculé à partir des relevés Steam${W&&!W.full?` ; historique encore court : depuis le ${fdate(W.from)}`:M&&!M.full?` ; « 30 j » depuis le premier relevé du ${fdate(M.from)}`:''}).</p>
  <div id="res" class="pgrid"></div>
  <h2>Complétion des succès</h2><div class="glass chart" style="height:${Math.max(220,D.games.filter(g=>g.ach_total).length*26)}px"><canvas id="c2"></canvas></div>
  <h2>Temps de jeu</h2><div class="glass chart"><canvas id="c1"></canvas></div>${steamPlaytimeHTML()}`;
  bindPlayRows();
  let cf=f,cs=s;
  const draw=()=>{const q=$('#q').value.trim().toLowerCase();sessionStorage.setItem('lib',JSON.stringify({q,f:cf,s:cs}));
    let g=D.games.filter(x=>!q||x.name.toLowerCase().includes(q)),f=cf,s=cs;
    if(f=='playing')g=g.filter(x=>x.hours>0);if(f=='week')g=g.filter(x=>(W?.m[x.appid]||0)>0);if(f=='never')g=g.filter(x=>!x.hours&&!x.last);if(f=='done')g=g.filter(x=>x.ach_total&&x.pct==100);if(f=='dlc')g=g.filter(x=>x.st.dlc_count>0);if(f.startsWith('g:'))g=g.filter(x=>x.genres.includes(f.slice(2)));
    const k={hours:x=>-(x.hours||0),week:x=>-(W?.m[x.appid]||0),month:x=>-(M?.m[x.appid]||0),last:x=>-(x.last||0),pct:x=>-(x.pct??-1),name:x=>x.name.toLowerCase(),meta:x=>-(x.st.metacritic?.score||0)}[s];
    g.sort((a,b)=>{const A=k(a),B=k(b);return A<B?-1:A>B?1:0});
    $('#res').innerHTML=g.length?g.map((x,i)=>steamCard(x,W,M,i)).join(''):'<div class="glass empty" style="grid-column:1/-1">Aucun jeu ne correspond.</div>'};
  const sync=()=>{$$('#fl [data-f]').forEach(b=>{b.classList.toggle('on',b.dataset.f==cf);b.setAttribute('aria-pressed',b.dataset.f==cf)});$('#fg').classList.toggle('on',cf.startsWith('g:'));if(!cf.startsWith('g:'))$('#fg').value='';$$('.sort [data-s]').forEach(b=>{b.classList.toggle('on',b.dataset.s==cs);b.setAttribute('aria-pressed',b.dataset.s==cs)})};
  $$('#fl [data-f]').forEach(b=>b.onclick=()=>{cf=b.dataset.f;sync();draw()});$('#fg').onchange=e=>{cf=e.target.value||'all';sync();draw()};
  $$('.sort [data-s]').forEach(b=>b.onclick=()=>{cs=b.dataset.s;sync();draw()});
  $('#q').oninput=draw;sync();draw();
  const top=D.games.filter(x=>x.hours>0).slice(0,6);
  const H=D.steamH.filter((x,i,a)=>!i||x.fetched_at.slice(0,10)!=a[i-1].fetched_at.slice(0,10));
  if(H.length>1)chart($('#c1'),{type:'line',data:{labels:H.map(x=>fshort(x.fetched_at)),datasets:top.map((t,i)=>lineDS(t.name,H.map(s=>(s.games.find(y=>y.appid==t.appid)||{}).hours??null),PAL[i],{fill:false}))}});
  else chart($('#c1'),{type:'bar',data:{labels:top.map(x=>x.name.length>18?x.name.slice(0,17)+'…':x.name),datasets:[{label:'Heures',data:top.map(x=>x.hours),backgroundColor:top.map((_,i)=>PAL[i]+'aa'),borderRadius:8}]},options:{plugins:{legend:{display:false},title:{display:true,text:'Top jeux (h) — la courbe d\'évolution apparaîtra après le prochain relevé hebdo'}}}});
  const A=D.games.filter(x=>x.ach_total).sort((a,b)=>b.pct-a.pct);
  chart($('#c2'),{type:'bar',data:{labels:A.map(x=>x.name.length>22?x.name.slice(0,21)+'…':x.name),datasets:[{label:'Succès %',data:A.map(x=>x.pct),backgroundColor:A.map(x=>x.pct==100?COL.gr:x.pct>=50?COL.cy:COL.vi),borderRadius:6}]},options:{indexAxis:'y',scales:{x:{min:0,max:100}},plugins:{legend:{display:false}},onClick:(e,el)=>{if(el[0])go('#/steam/'+A[el[0].index].appid)}}});
}
function steamGame(id){
  const g=D.games.find(x=>x.appid==id);
  if(!g){app.innerHTML=`<div class="glass wait"><div class="ico">❓</div><h3>Jeu introuvable</h3><a class="px px-bl" href="#/steam">Retour à la bibliothèque</a></div>`;return}
  const s=g.st,mc=s.metacritic,price=s.price?(s.price.discount?`<s style="color:var(--mut);font-size:.9rem">${esc(s.price.initial)}</s> `:'')+esc(s.price.text):'—';
  const hist=D.steamH.map(x=>({t:x.fetched_at,g:x.games.find(y=>y.appid==id)})).filter(x=>x.g).filter((x,i,a)=>!i||x.t.slice(0,10)!=a[i-1].t.slice(0,10));
  const hasGoal=goals().some(x=>x.appid==id);
  app.innerHTML=`<div class="cover"><img src="${esc(g.img)}" alt=""><div class="ttl"><h3>${esc(s.name||g.name)}</h3>${(s.genres||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div></div>
  <div class="stats">${stat('Temps de jeu',fnum(g.hours,1)+' h',g.last?'Dernière session : '+fdate(g.last):'Jamais lancé')}
  ${stat('Succès',g.ach_total?`${g.ach_unlocked||0}/${g.ach_total}`:'—',g.pct!=null?g.pct+' % '+bar(g.pct):'Pas de succès')}
  ${stat('Metacritic',mc?`<span style="color:${mc.score>=75?'var(--gr)':mc.score>=50?'var(--warn)':'var(--bad)'}">${mc.score}</span>`:'—',mc?.url?`<a href="${esc(mc.url)}" target="_blank" rel="noopener">voir la critique ›</a>`:'Pas de note')}
  ${stat('Prix actuel',price,s.price?.discount?`<span class="up">-${s.price.discount} % en promo</span>`:'Boutique Steam FR')}</div>
  <div class="tool" style="margin-top:.8rem"><a class="px px-bl btnw" href="${esc(s.url||`https://store.steampowered.com/app/${id}/`)}" target="_blank" rel="noopener">🛒 Page Steam</a>
  ${g.ach_total&&g.pct<100?`<button class="px px-vi btnw" id="gA" ${hasGoal?'disabled':''}>🎯 ${hasGoal?'Objectif en cours':'Objectif 100 % succès'}</button>`:''}</div>
  ${achBlock(id)}
  ${s.short_description?`<h2>Description</h2><div class="glass desc">${esc(s.short_description)}</div>`:''}
  <h2>Infos</h2><div class="glass kv"><span>Développeur</span><span>${esc((s.developers||[]).join(', ')||'—')}</span><span>Éditeur</span><span>${esc((s.publishers||[]).join(', ')||'—')}</span><span>Sortie</span><span>${esc(s.release_date||'—')}</span><span>Catégories</span><span>${(s.categories||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')||'—'}</span></div>
  ${(s.screenshots||[]).length?`<h2>Captures</h2><div class="shots">${s.screenshots.map((u,i)=>`<img loading="lazy" src="${esc(u)}" data-full="${esc((s.screenshots_full||[])[i]||u)}" alt="">`).join('')}</div>`:''}
  <h2>Progression</h2>${hist.length>1?`<div class="glass chart"><canvas id="c1"></canvas></div>`:`<div class="glass empty">📈 La courbe de progression apparaîtra après le prochain relevé (chaque dimanche 20 h).</div>`}
  <h2>DLC (${s.dlc_count??0})</h2>${(s.dlc||[]).length?`<div class="list">${s.dlc.map(d=>`<a class="glass row" href="${esc(d.url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(d.image||g.img)}" alt=""><span class="n">${esc(d.name||'DLC '+d.appid)}${d.release?`<br><small>${esc(d.release)}</small>`:''}</span><span class="p">${d.price?(d.price.discount?`<s>${esc(d.price.initial)}</s>`:'')+esc(d.price.text):'<small class="mut">—</small>'}</span></a>`).join('')}</div>${s.dlc_count>s.dlc.length?`<p class="pill">+${s.dlc_count-s.dlc.length} autres sur la boutique</p>`:''}`:`<div class="glass empty">${s.name?'Aucun DLC pour ce jeu.':'Données boutique indisponibles.'}</div>`}`;
  $$('.shots img').forEach(i=>i.onclick=()=>lb(i.dataset.full));
  achBind(id);
  const b=$('#gA');if(b)b.onclick=()=>{addGoal({type:'game_ach',appid:id,target:100});b.disabled=true;b.textContent='🎯 Objectif en cours'};
  if(hist.length>1)chart($('#c1'),{data:{labels:hist.map(x=>fshort(x.t)),datasets:[{type:'line',...lineDS('Heures',hist.map(x=>x.g.hours),COL.cy)},{type:'line',...lineDS('Succès',hist.map(x=>x.g.ach_unlocked??null),COL.vi,{fill:false,yAxisID:'y2'})}]},options:{scales:{y2:{position:'right',grid:{display:false}}}}});
  animBars();
}
/* ---- Succès Steam détaillés ---- */
const ACH_CDN='https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/';
function achIco(f,ap){return !f?'':/^https?:/.test(f)?f:ACH_CDN+ap+'/'+f}
function achRar(p){if(p==null)return null;return p<5?['Très rare','r1']:p<10?['Rare','r2']:p<30?['Peu commun','r3']:['Commun','r4']}
function achState(){return{f:sessionStorage.getItem('achF')||'all',s:sessionStorage.getItem('achS')||'rar'}}
function achRows(id){
  const G=D.sach?.games?.[id];if(!G)return'';const {f,s}=achState();
  let L=G.list.filter(a=>f=='all'||(f=='ok'?a.u:!a.u));
  const cmp={rar:(a,b)=>(a.p??101)-(b.p??101),date:(a,b)=>(b.t||0)-(a.t||0)||(b.p??0)-(a.p??0),nom:(a,b)=>a.n.localeCompare(b.n,'fr')}[s];
  L=L.slice().sort(cmp);
  if(!L.length)return`<div class="glass empty">${f=='ok'?'Aucun succès obtenu pour l’instant.':'Tous les succès sont obtenus 🎉'}</div>`;
  return L.map(a=>{const r=achRar(a.p),hid=a.h&&!a.u,desc=a.d?esc(a.d):'<i>Description masquée par Steam</i>';
    return`<div class="ach${a.u?' ok':''}"><img loading="lazy" decoding="async" width="48" height="48" src="${esc(achIco(a.u?a.i:(a.g||a.i),id))}" alt=""><div class="at">
    <b>${esc(a.n)}</b>${hid?`<span class="ad hid"><span class="hm">🔒 Succès caché</span> <button class="px px-gh arv" type="button" aria-expanded="false">Révéler</button><span class="rv" hidden>${desc}</span></span>`:`<span class="ad">${desc}</span>`}
    <span class="am">${a.u&&a.t?`<span class="ok">✔ Obtenu le ${fdate(a.t*1000)}</span>`:a.u?'<span class="ok">✔ Obtenu</span>':'<span>À obtenir</span>'}${a.p!=null?`<span>${fnum(a.p,1)} % des joueurs</span>`:''}${r?`<span class="rb ${r[1]}">${r[0]}</span>`:''}</span></div></div>`}).join('');
}
function achBlock(id){
  const G=D.sach?.games?.[id];if(!G||!G.total)return'';const {f,s}=achState(),ok=G.unlocked,t=G.total,pc=Math.round(100*ok/t);
  const seg=(k,l,n)=>`<button class="px px-gh${f==k?' on':''}" data-af="${k}" aria-pressed="${f==k}">${l} <small>${n}</small></button>`;
  const so=(k,l)=>`<button class="px px-gh${s==k?' on':''}" data-as="${k}" aria-pressed="${s==k}">${l}</button>`;
  return`<h2>Succès</h2><div class="glass achp"><div class="ah"><b>${ok} / ${t}</b><span>${pc} % obtenus</span></div><div class="pxbar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${ok}" aria-label="Succès obtenus"><i style="width:${pc}%"></i></div></div>
  <div class="achtool"><div class="seg" id="achF">${seg('ok','Obtenus',ok)}${seg('todo','À obtenir',t-ok)}${seg('all','Tous',t)}</div>
  <div class="seg" id="achS"><span class="mut">Trier :</span>${so('rar','Rareté')}${so('date','Date')}${so('nom','Nom')}</div></div>
  <div class="achl" id="achL">${achRows(id)}</div>${G.list.some(a=>a.ds)?'<p class="mut achsrc">Descriptions des succès cachés : page publique des statistiques Steam.</p>':''}`;
}
function achBind(id){
  const L=$('#achL');if(!L)return;
  const redraw=()=>{const {f,s}=achState();$$('#achF button').forEach(b=>{b.classList.toggle('on',b.dataset.af==f);b.setAttribute('aria-pressed',b.dataset.af==f)});$$('#achS button').forEach(b=>{b.classList.toggle('on',b.dataset.as==s);b.setAttribute('aria-pressed',b.dataset.as==s)});L.innerHTML=achRows(id)};
  $$('#achF button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('achF',b.dataset.af);redraw()});
  $$('#achS button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('achS',b.dataset.as);redraw()});
  L.onclick=e=>{const b=e.target.closest('.arv');if(!b)return;const r=b.parentNode.querySelector('.rv'),o=r.hidden;r.hidden=!o;b.setAttribute('aria-expanded',o);b.textContent=o?'Masquer':'Révéler'};
}
function compet(){
  app.innerHTML=`<h2>Jeux compétitifs</h2><div class="list">
   ${[['valorant','🎯','Valorant',D.vh?'Blood#7629 · HenrikDev':'Blood#7629 · tracker.gg',D.vh||D.vOk.length?'Connecté':trnStatus(D.val),'var(--val)'],['rl','🚗','Rocket League',D.rlm&&!D.rOk.length?'443Blood · Epic · captures tracker.gg':'443Blood · Epic · tracker.gg',D.rOk.length?'Connecté':D.rlm?'Saisie manuelle':trnStatus(D.rl),'var(--rl)'],['cod','🔫','Call of Duty Mobile','Capture d\'écran après chaque partie',D.cod.length?D.cod.length+' parties':'Aucune partie','var(--cod)']]
    .map(([r,i,n,d,s,c])=>`<a class="glass tile" style="--c:${c}" href="#/${r}"><span class="ic">${i}</span><span class="n"><b>${n}</b><small class="mut">${d}</small></span><span class="pill ${/Connecté|parties|manuelle/.test(s)?'ok':'warn'}">${esc(s)}</span><span class="chev">›</span></a>`).join('')}</div>
   <div style="margin-top:1rem">${codBtn('full')}</div><a class="glass tile" style="--c:var(--vi);margin-top:.7rem" href="#/bilan"><span class="ic">📊</span><span class="n"><b>Bilan de la semaine</b><small class="mut">Cette semaine vs la précédente + coaching</small></span><span class="chev">›</span></a>
   <h2>Comment ça marche</h2><div class="glass desc"><b>Valorant</b> : relevé automatique 2 fois par jour via l'API HenrikDev (non officielle) : rang, RR, parties et détails.<br><br><b>Rocket League</b> : replays ballchasing relevés à 18 h et 1 h (heure de Paris).<br><br><b>COD Mobile</b> : appuie sur « Ajouter une partie », glisse la capture du tableau des scores, valide. Les stats sont lues automatiquement et un commentaire te confirme les valeurs (tu peux les corriger en modifiant la demande).</div>`;
}
const TRN={valorant:{name:'Valorant',color:'#ff4655',id:'Blood#7629',hist:()=>D.val,
  keys:['rank','peakRank','matchesPlayed','matchesWinPct','kDRatio','kDARatio','headshotsPercentage','damagePerRound','scorePerRound','kills','deaths','assists','aces','clutches','firstBloods','timePlayed'],
  chartKeys:['kDRatio','headshotsPercentage','matchesWinPct','damagePerRound'],ghost:['Rang','Rang max','Parties','Victoires %','K/D','HS %','ADR','Score/round']},
 rl:{name:'Rocket League',color:'#3b82f6',id:'443Blood · Epic',hist:()=>D.rl,
  keys:['rating','tier','division','matchesPlayed','winStreak','wins','goals','assists','saves','shots','goalShotRatio','mVPs','score'],
  chartKeys:['wins','goals','saves','mVPs'],ghost:['1v1 MMR','2v2 MMR','3v3 MMR','Victoires','Buts','Arrêts','Tirs','MVP']}};
function tracker(key){
  const c=TRN[key],H=c.hist(),ok=trnOk(H),last=ok.at(-1),lastTry=H.at(-1);
  let h=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,${c.color}66,transparent 65%)"><div class="ttl"><h3>${c.name}</h3><span class="pill">${esc(c.id)}</span><span class="pill">tracker.gg</span></div></div>`;
  if(!last){
    app.innerHTML=h+`<div class="glass wait"><div class="ico">🔑</div><h3>En attente de clé Tracker Network</h3><p class="mut">Les stats (rangs, MMR, K/D, % de victoire…) s'afficheront ici automatiquement dès que l'API tracker.gg acceptera la clé. Relevé mercredi et dimanche à minuit (heure de Paris).</p>
    ${lastTry?`<span class="pill warn">Dernier essai ${fdate(lastTry.fetched_at)} : ${esc(lastTry.http?'HTTP '+lastTry.http+(lastTry.http==401?' — clé refusée':''):lastTry.status)}</span>`:''}</div>
    <h2>Aperçu</h2><div class="stats ghost">${c.ghost.map(k=>stat(k,'000')).join('')}</div><div class="glass chart" style="display:flex;align-items:center;justify-content:center;color:var(--mut)">📈 Graphiques de progression</div>${key=='rl'?goalsBlock(['rl_rank']):''}`;if(key=='rl'){bindGoalDel(()=>tracker('rl'));animBars()}return}
  const ov=overview(last),fmt=s=>s?esc(s.displayValue??fnum(s.value,2)):'—';
  const tile=(k,s)=>s?`<div class="glass stat"><div class="k">${esc(s.displayName||k)}</div><div class="v">${s.metadata?.iconUrl?`<span class="tier"><img src="${esc(s.metadata.iconUrl)}" alt="">${esc(s.metadata.tierName||s.displayValue)}</span>`:fmt(s)}</div>${s.percentile!=null?`<div class="d">Top ${fnum(100-s.percentile,1)} %</div>`:''}</div>`:'';
  const ks=Object.keys(ov?.stats||{}),order=[...c.keys.filter(k=>ks.includes(k)),...ks.filter(k=>!c.keys.includes(k))];
  const others=segs(last).filter(s=>s!==ov&&s.stats);
  h+=`<h2>${esc(ov?.metadata?.name||'Vue d\'ensemble')}</h2><div class="stats">${order.map(k=>tile(k,ov.stats[k])).join('')||'<div class="glass empty">Aucune stat.</div>'}</div>
  ${others.length?`<h2>${key=='rl'?'Playlists':'Par mode / saison'}</h2><div class="seg">${others.map((s,i)=>`<button class="${i?'':'on'}" data-i="${i}">${esc(s.metadata?.name||s.attributes?.key||s.type)}</button>`).join('')}</div><div id="segv"></div>`:''}
  <h2>Progression</h2><div class="glass chart"><canvas id="c1"></canvas></div>
  <h2>Historique</h2><div class="glass tbl"><table><tr><th>Date</th>${c.chartKeys.map(k=>`<th>${esc(S(ov,k)?.displayName||k)}</th>`).join('')}</tr>${ok.slice().reverse().map(x=>`<tr><td>${fdate(x.fetched_at)}</td>${c.chartKeys.map(k=>`<td>${fmt(S(overview(x),k))}</td>`).join('')}</tr>`).join('')}</table></div>`;
  if(key=='rl')h+=goalsBlock(['rl_rank']);
  app.innerHTML=h;if(key=='rl'){bindGoalDel(()=>tracker('rl'));animBars()}
  const showSeg=i=>{$('#segv').innerHTML=`<div class="stats">${Object.entries(others[i].stats).map(([k,v])=>tile(k,v)).join('')}</div>`;$$('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.i==i))};
  if(others.length){$$('.seg button').forEach(b=>b.onclick=()=>showSeg(+b.dataset.i));showSeg(0)}
  const ds=key=='rl'?segs(last).filter(s=>s.type=='playlist'&&S(s,'rating')).map((s,i)=>lineDS(s.metadata?.name,ok.map(x=>num(segs(x).find(y=>y.metadata?.name==s.metadata?.name)?.stats?.rating?.value)),PAL[i%8],{fill:false}))
     :c.chartKeys.map((k,i)=>lineDS(S(ov,k)?.displayName||k,ok.map(x=>sv(x,k)),PAL[i],{fill:false}));
  chart($('#c1'),{type:'line',data:{labels:ok.map(x=>fshort(x.fetched_at)),datasets:ds},options:{plugins:{title:{display:key=='rl',text:'MMR par playlist'}}}});
}
const COD_OBJ=new Set(['Point stratégique','Domination','Contrôle','Prise d\'otage']);
const mmss=v=>v==null?'—':`${String(Math.floor(v/60)).padStart(2,'0')}:${String(Math.round(v%60)).padStart(2,'0')}`;
function codAgg(a){const n=k=>a.some(x=>num(x[k])!=null);return{n:a.length,wr:wr(a),kd:kdOf(a),k:avg(a,'kills'),d:avg(a,'deaths'),as:avg(a,'assists'),score:avg(a,'score'),dmg:avg(a,'damage'),imp:avg(a,'impact'),acc:avg(a,'accuracy_pct'),obj:avg(a,'objective_time_s'),cap:avg(a,'capture_kills'),place:avg(a,'placement')}}
/* Ventilation : colonnes communes à tous les modes ; temps sur objectif / élim. en capture uniquement pour les modes à objectif, score seulement par mode (pas comparable entre modes) */
function codBreakHTML(m,key,title,oneMode){const g={};m.forEach(x=>(g[x[key]||'Inconnu']??=[]).push(x));const E=Object.entries(g).sort((a,b)=>b[1].length-a[1].length);if(!E.length)return '';
  const byMode=key=='mode',hasBR=m.some(x=>x.type=='BR'),hasMP=m.some(x=>(x.type||'MP')=='MP'),showObj=hasMP&&(byMode||(oneMode&&COD_OBJ.has(oneMode)));
  const pct=v=>v==null?'—':fnum(v,1)+' %';
  const head=`<tr><th>${byMode?'Mode':'Carte'}</th><th>Parties</th><th>Vict.</th>${hasBR?'<th>Class. moy.</th>':''}${hasMP?'<th>Score moy.</th>':''}<th>K/D</th><th>É/M/A moy.</th><th>Dégâts</th>${hasMP?'<th>Impact</th>':''}<th>Précision</th>${showObj?'<th>Tps objectif</th><th>Élim. capture</th>':''}</tr>`;
  const row=([k,a])=>{const s=codAgg(a),isBR=a.every(x=>x.type=='BR'),objMode=byMode?COD_OBJ.has(k):(oneMode?COD_OBJ.has(oneMode):a.some(x=>COD_OBJ.has(x.mode)));
    return `<tr><td><b>${esc(k)}</b>${isBR?' <span class="pill">BR</span>':''}</td><td>${s.n}</td><td>${fnum(s.wr,0)} %</td>${hasBR?`<td>${isBR?fnum(s.place,1):'<span class="mut" title="Sans objet (multijoueur)">n/a</span>'}</td>`:''}${hasMP?`<td>${isBR?'<span class="mut" title="Score non comparable (BR)">n/a</span>':fnum(s.score,0)}</td>`:''}<td>${fnum(s.kd,2)}</td><td>${fnum(s.k,1)} / ${fnum(s.d,1)} / ${fnum(s.as,1)}</td><td>${fnum(s.dmg,0)}</td>${hasMP?`<td>${isBR?'<span class="mut">n/a</span>':fnum(s.imp,0)}</td>`:''}<td>${pct(s.acc)}</td>${showObj?(objMode&&!isBR?`<td>${mmss(s.obj)}</td><td>${fnum(s.cap,1)}</td>`:'<td class="mut" title="Sans objet pour ce mode">n/a</td><td class="mut">n/a</td>'):''}</tr>`};
  return `<h2>${title}</h2><div class="glass tbl"><table>${head}${E.map(row).join('')}</table></div>`}
function codBestWorst(m){const mp=m.filter(x=>(x.type||'MP')=='MP'&&x.map);const g={};mp.forEach(x=>(g[x.map]??=[]).push(x));const E=Object.entries(g).map(([k,a])=>[k,codAgg(a)]).filter(([,s])=>s.kd!=null);
  if(E.length<2)return `<p class="mut" style="font-size:.85rem">🗺️ Meilleure / pire carte : il faut des parties multijoueur sur au moins 2 cartes.</p>`;
  const sc=s=>(s.wr??50)/100+Math.min(s.kd,5)/5;E.sort((a,b)=>sc(b[1])-sc(a[1]));const [b,w]=[E[0],E.at(-1)],few=E.some(([,s])=>s.n<3);
  const card=([k,s],ic,lab,c)=>`<div class="glass pad" style="border-left:3px solid ${c}"><small class="mut">${ic} ${lab}</small><br><b style="font-size:1.1rem">${esc(k)}</b><br><small>${s.n} partie${s.n>1?'s':''} · ${fnum(s.wr,0)} % vict. · K/D ${fnum(s.kd,2)}</small></div>`;
  return `<div class="two" style="margin-top:.6rem">${card(b,'🏆','Meilleure carte','var(--gr)')}${card(w,'⚠️','Carte la plus difficile','var(--bad)')}</div><p class="mut" style="font-size:.78rem">Classement calculé (taux de victoire + K/D, multijoueur uniquement, tous modes confondus)${few?' · peu de parties : indicatif':''}.</p>`}
/* ========== COD : carte de joueur (snapshot profil, saisie app + synchro) ========== */
function codCardHTML(){const c=D.codCard;const pend=LS.get('gt-cod-card',null);
  const v=pend||c;if(!v)return `<h2>Carte de joueur</h2><div class="glass empty">Aucun snapshot de profil. <a href="#/cod/profil">Ajouter ma carte de joueur ›</a></div>`;
  const rk=['MP','BR'].map(m=>{const r=D.ranks[m]?.at(-1);return r?`${m=='MP'?'MJ':'BR'} : ${esc(r.label)}`:null}).filter(Boolean).join(' · ');
  return `<h2>Carte de joueur ${pend?'<span class="pill warn">📲 modifiée sur cet appareil</span>':''}</h2><div class="glass pad cod-card">
   <div class="cod-id"><img src="assets/cod-hero-mobile.webp" alt=""><div><b style="font-size:1.25rem">${esc(v.player||'NVCBlood')}</b><br><small class="mut">${v.clan?'Clan '+esc(v.clan)+' · ':''}Niveau ${fnum(v.level)}${v.ranked_season?' · Classé '+esc(v.ranked_season):''}</small></div>
   <div class="cod-likes">❤️<b>${fnum(v.likes)}</b><small>J'aime</small></div></div>
   ${v.legendary_count?`<p style="margin:.5rem 0 0">🏆 <b>${fnum(v.legendary_count.MP)}× Légendaire</b> en multijoueur · <b>${fnum(v.legendary_count.BR)}×</b> en Battle Royale <small class="mut">(fois atteint, +1 automatique à chaque nouveau passage)</small></p>`:''}
   ${rk?`<p style="margin:.5rem 0 0">🎖️ Rangs actuels (saisis le ${fdate(D.ranks.MP?.at(-1)?.date||D.ranks.BR?.at(-1)?.date)}) : <b>${rk}</b></p>`:''}
   ${v.season_snapshot?`<details style="margin-top:.5rem"><summary>Détails de saison (lecture approximative)</summary><p class="mut" style="font-size:.85rem">${esc(v.season_snapshot.label||'')} : ${(v.season_snapshot.badges||[]).map(b=>esc(b.label)+' : '+esc(b.value)).join(' · ')}${v.season_snapshot.best_player_rate_pct!=null?` · Taux meilleur joueur ${fnum(v.season_snapshot.best_player_rate_pct,2)} % (valeur ${fnum(v.season_snapshot.best_player_value)})`:''}</p></details>`:''}
   <p class="mut" style="font-size:.78rem;margin:.5rem 0 0">Snapshot du ${fdate(v.date)} · ${esc(v.source||'')}. L'identifiant de compte n'est jamais stocké ni affiché.</p>
   ${pend?`<a class="btn full" style="margin-top:.5rem" href="${esc(ghNew('COD – profil ('+new Date(v.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+')',{action:'profile',level:v.level,clan:v.clan,likes:v.likes,season:v.ranked_season||null,date:v.date,legendary_count:v.legendary_count||null},'cod-profil'))}" target="_blank" rel="noopener">🔄 Synchroniser la carte (GitHub)</a>`:''}
   <a class="btn ghost full" style="margin-top:.5rem" href="#/cod/profil">✏️ Mettre à jour ma carte</a></div>`}
function codCardForm(){const c=LS.get('gt-cod-card',null)||D.codCard||{};
  app.innerHTML=`<h2>Ma carte de joueur</h2><p class="mut" style="font-size:.88rem">Mise à jour manuelle (niveau, clan, J'aime vus sur ton profil en jeu). Enregistrée sur cet appareil, puis synchronisable vers GitHub. Ne saisis jamais ton identifiant de compte.</p>
  <form class="glass form" id="cpf" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem">
   <label>Niveau<input name="level" type="text" inputmode="numeric" required value="${c.level??''}"></label>
   <label>Clan<input name="clan" type="text" value="${esc(c.clan||'')}" placeholder="ex. Nova_Core_EsPort"></label>
   <label>J'aime<input name="likes" type="text" inputmode="numeric" value="${c.likes??''}"></label>
   <label>Saison classée<input name="season" type="text" value="${esc(c.ranked_season||'')}" placeholder="ex. S3"></label>
   <label>Fois Légendaire — Multijoueur<input name="legMP" type="text" inputmode="numeric" value="${c.legendary_count?.MP??''}"></label>
   <label>Fois Légendaire — Battle Royale<input name="legBR" type="text" inputmode="numeric" value="${c.legendary_count?.BR??''}"></label>
   <label>Date du snapshot<input name="date" type="date" required value="${(c.date||new Date().toISOString().slice(0,10)).slice(0,10)}"></label>
   <div style="grid-column:1/-1"><button class="btn full" type="submit">💾 Enregistrer</button></div></form>`;
  $('#cpf').onsubmit=e=>{e.preventDefault();const f=e.target,level=parseInt(f.level.value,10),likes=f.likes.value.trim()?parseInt(f.likes.value.replace(/\D/g,''),10):null;
   if(!(level>0))return toast('⚠️ Niveau invalide');
   if(!LS.set('gt-cod-card',{player:'NVCBlood',legendary_count:{MP:parseInt(f.legMP.value,10)||0,BR:parseInt(f.legBR.value,10)||0},level,clan:f.clan.value.trim(),likes,ranked_season:f.season.value.trim()||null,date:f.date.value,source:'saisie dans l\'app',season_snapshot:D.codCard?.season_snapshot||null}))return toast('⚠️ Enregistrement local impossible');
   toast('✅ Carte mise à jour — pense à Synchroniser');go('#/cod')}}
/* ========== page COD ========== */
function codFBind(){const a=$('#fmode'),b=$('#fmap'),r=$('#freset');if(a)a.onchange=()=>{sessionStorage.setItem('codMode',a.value);sessionStorage.removeItem('codMap');cod()};if(b)b.onchange=()=>{sessionStorage.setItem('codMap',b.value);cod()};if(r)r.onclick=()=>{sessionStorage.removeItem('codMode');sessionStorage.removeItem('codMap');cod()}}
function cod(){
  let m=D.cod;
  let h=`<div class="cod-hero glass"><picture><source media="(max-width:700px)" srcset="assets/cod-hero-mobile.webp"><img src="assets/cod-hero.webp" width="1600" height="633" decoding="async" alt="Opérateur COD Mobile de NVCBlood et son chien, hangar U.A.C" fetchpriority="high"></picture><div class="cod-hero-ov"><h3>Call of Duty Mobile</h3><span class="pill">NVCBlood${D.codCard?.clan?' · '+esc(D.codCard.clan):''}</span>${D.codCard?`<span class="pill">Niveau ${fnum(D.codCard.level)}</span>`:''}</div></div>${codCardHTML()}${codBtn('full')}${codSyncBox()}`;
  h+=ranksHTML()+goalsBlock(['cod_rank'],'Objectifs de rang')+career();
  const tf=sessionStorage.getItem('codType')||'all',all=m;
  h+=`<h2>Parties enregistrées</h2><div class="seg" id="tseg">${[['all','Tout'],['MP','Multijoueur'],['BR','Battle Royale']].map(([k,n])=>`<button class="${k==tf?'on':''}" data-t="${k}">${n} (${k=='all'?all.length:all.filter(x=>(x.type||'MP')==k).length})</button>`).join('')}</div>`;
  if(tf!='all')m=all.filter(x=>(x.type||'MP')==tf);
  const fm=sessionStorage.getItem('codMode')||'',fp=sessionStorage.getItem('codMap')||'',ML=[...new Set(m.map(x=>x.mode).filter(Boolean))].sort(),PL=[...new Set(m.filter(x=>!fm||x.mode==fm).map(x=>x.map).filter(Boolean))].sort();
  const fmOk=ML.includes(fm)?fm:'',fpOk=PL.includes(fp)?fp:'';
  h+=`<div class="tool" style="margin:.5rem 0;gap:.5rem;display:flex;flex-wrap:wrap"><label class="mut" style="font-size:.8rem;display:grid;gap:.2rem;flex:1 1 150px">Mode<select id="fmode" class="sel"><option value="">Tous les modes</option>${ML.map(x=>`<option${x==fmOk?' selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="mut" style="font-size:.8rem;display:grid;gap:.2rem;flex:1 1 150px">Carte<select id="fmap" class="sel"><option value="">Toutes les cartes</option>${PL.map(x=>`<option${x==fpOk?' selected':''}>${esc(x)}</option>`).join('')}</select></label>${fmOk||fpOk?'<button class="btn ghost sm" id="freset" style="align-self:end">✕ Filtres</button>':''}</div>`;
  if(fmOk)m=m.filter(x=>x.mode==fmOk);if(fpOk)m=m.filter(x=>x.map==fpOk);
  if(!m.length){app.innerHTML=h+`<div class="glass wait"><div class="ico">📸</div><h3>Aucune partie pour l'instant</h3><p class="mut">Après chaque partie, envoie la capture du tableau des scores : les stats sont lues automatiquement et apparaissent ici (K/D, tendances, taux de victoire, moyennes par mode, comparaison hebdo).</p></div>
   <h2>Aperçu</h2><div class="stats ghost">${['Parties','K/D','Victoires %','Élim. moy.'].map(k=>stat(k,'000')).join('')}</div>`;careerCharts();codBind();codSyncBind();codFBind();bindGoalDel(cod);animBars();return}
  const lab=m.map(x=>fshort(x.date)),kd=m.map(x=>num(x.kd)??(num(x.kills)!=null&&num(x.deaths)!=null?(x.deaths?x.kills/x.deaths:x.kills):null)),roll=m.map((_,i)=>kdOf(m.slice(Math.max(0,i-9),i+1)));
  const now=Date.now(),DAY=864e5,w1=m.filter(x=>now-new Date(x.date)<7*DAY),w0=m.filter(x=>{const t=now-new Date(x.date);return t>=7*DAY&&t<14*DAY});
  const modes={};m.forEach(x=>(modes[x.mode||'Inconnu']??=[]).push(x));
  const row=(n,fn,d)=>{const a=fn(w1),b=fn(w0),dl=a!=null&&b!=null?a-b:null;return `<tr><td>${n}</td><td>${fnum(a,d)}</td><td>${fnum(b,d)}</td><td class="${dl>0?'up':dl<0?'down':''}">${dl==null?'—':(dl>0?'▲ +':dl<0?'▼ ':'')+fnum(dl,d)}</td></tr>`};
  const isBR=tf=='BR';
  h+=`<div class="stats">${stat('Parties',m.length,fmOk||fpOk?[fmOk,fpOk].filter(Boolean).join(' · '):'')}${m.some(x=>x.placement!=null)?stat('Classement moy. (BR)',fnum(avg(m,'placement'),1),'Top 1 : '+m.filter(x=>x.placement==1).length):''}${m.some(x=>x.damage!=null)?stat('Dégâts moy.',fnum(avg(m,'damage'),0)):''}${stat('K/D global',fnum(kdOf(m),2),'10 dern. : '+fnum(roll.at(-1),2))}${stat('Victoires',fnum(wr(m),0)+' %')}${stat('Élim. moy.',fnum(avg(m,'kills'),1),'Morts moy. '+fnum(avg(m,'deaths'),1))}${stat('Précision moy.',avg(m,'accuracy_pct')!=null?fnum(avg(m,'accuracy_pct'),1)+' %':'—')}${stat('Impact moy.',fnum(avg(m,'impact'),0))}${fmOk&&COD_OBJ.has(fmOk)?stat('Tps objectif moy.',mmss(avg(m,'objective_time_s')),'Élim. capture moy. '+fnum(avg(m,'capture_kills'),1)):''}${stat('Dégâts / manche',fnum(avg(m,'avg_damage_per_round'),0),'moyenne')}${stat('Premières élim.',fnum(sum(m,'first_kills')),'total')}</div>
  <a class="glass tile" style="--c:var(--cod);margin-top:.7rem" href="#/cod/modes"><span class="ic">📊</span><span class="n"><b>Stats par mode</b><small class="mut">MJ par mode et carte · BR par format et carte</small></span><span class="chev">›</span></a>
  <p class="mut" style="font-size:.8rem">Touche une partie de l'historique pour voir le détail (duels, médailles…).</p>
  <div class="glass chart"><canvas id="c1"></canvas></div><div class="two"><div class="glass chart"><canvas id="c2"></canvas></div><div class="glass chart"><canvas id="c4"></canvas></div></div><div class="glass chart"><canvas id="c3"></canvas></div>
  <h2>7 derniers jours vs 7 précédents</h2><div class="glass tbl"><table><tr><th></th><th>7 j</th><th>Avant</th><th>Écart</th></tr>${row('Parties',a=>a.length,0)+row('K/D',kdOf,2)+row('Élim. moy.',a=>avg(a,'kills'),1)+row('Morts moy.',a=>avg(a,'deaths'),1)+row('Score moy.',a=>avg(a,'score'),0)+row('Victoires %',wr,0)}</table></div>
  ${fmOk?'':codBreakHTML(m,'mode','Par mode')}${fpOk?'':codBreakHTML(m,'map','Par carte',fmOk)}${fpOk||tf=='BR'?'':codBestWorst(m)}
  <h2>Historique</h2><div class="glass tbl"><table><tr><th>Date</th><th>Type</th><th>Mode</th><th>Carte</th><th>Rés.</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th></th></tr>${m.slice().reverse().map(x=>`<tr data-m="${m.indexOf(x)}" style="cursor:pointer"><td>${fdate(x.date)}</td><td>${x.type=='BR'?'BR':'MJ'}</td><td>${esc(x.mode||'—')}${x.placement!=null?' · #'+x.placement:''}</td><td>${esc(x.map||'—')}</td><td>${x.type=='BR'?(x.placement!=null?(x.placement==1?'🏆':'')+'#'+x.placement:'—'):{win:'✅',loss:'❌',draw:'➖'}[x.result]||'—'}</td><td>${x.kills??'—'}</td><td>${x.deaths??'—'}</td><td>${x.assists??'—'}</td><td>${fnum(num(x.kd),2)}</td><td>${x.screenshot?`<button class="btn ghost sm" data-s="${esc(x.screenshot)}">🖼️</button>`:''}${x.issue?` <a href="https://github.com/Blood63/gaming-tracker/issues/${x.issue}" target="_blank" rel="noopener">#${x.issue}</a>`:''}</td></tr>`).join('')}</table></div>`;
  app.innerHTML=h;careerCharts();codBind();codSyncBind();codFBind();bindGoalDel(cod);animBars();$$('[data-s]').forEach(b=>b.onclick=e=>{e.stopPropagation();lb(b.dataset.s)});$$('tr[data-m]').forEach(r=>r.onclick=e=>{if(!e.target.closest('a'))go('#/cod/'+D.cod.indexOf(m[+r.dataset.m]))});
  chart($('#c1'),{type:'line',data:{labels:lab,datasets:[lineDS('K/D par partie',kd,COL.or,{fill:false,showLine:false,pointRadius:5}),lineDS('Moyenne glissante (10)',roll,COL.cy)]},options:{plugins:{title:{display:true,text:'K/D'}}}});
  chart($('#c2'),{type:'line',data:{labels:lab,datasets:[lineDS('Éliminations',m.map(x=>num(x.kills)),COL.gr,{fill:false}),lineDS('Morts',m.map(x=>num(x.deaths)),COL.bad,{fill:false})]},options:{scales:{y:{beginAtZero:true}},plugins:{title:{display:true,text:'Éliminations / morts'}}}});
  chart($('#c4'),{type:'line',data:{labels:lab,datasets:[lineDS('Score',m.map(x=>num(x.score)),COL.vi)]},options:{plugins:{legend:{display:false},title:{display:true,text:'Score par partie'}}}});
  chart($('#c3'),{type:'line',data:{labels:lab,datasets:[lineDS('Cumulé %',m.map((_,i)=>wr(m.slice(0,i+1))),COL.pk),lineDS('10 dernières %',m.map((_,i)=>wr(m.slice(Math.max(0,i-9),i+1))),COL.cy,{fill:false})]},options:{scales:{y:{min:0,max:100}},plugins:{title:{display:true,text:'Taux de victoire'}}}});
}
const eur=v=>v==null?'—':Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const SICON={cpu:'🧠',mb:'🧩',ram:'💾',ssd:'💽',gpu:'🎴',cooler:'❄️',psu:'🔌',case:'🗄️',wifi:'📶',build:'🔧',kb:'⌨️',mouse:'🖱️',pad:'🎮',padpack:'🎒',phone:'📱'};
const scCol=v=>v>=9?'var(--gr)':v>=7?'var(--cy)':v>=5?'var(--warn)':'var(--bad)';
function setupPage(){ setTimeout(()=>{$$('[data-exp]').forEach(el=>{const b=el.querySelector('.exph');if(b)b.onclick=()=>{const p=el.querySelector('.expb');const open=p.style.display!='none';p.style.display=open?'none':'';b.textContent=open?'Détails ›':'Masquer ‹'}})},0);
  const S=D.setup;if(!S){app.innerHTML='<div class="glass wait"><div class="ico">🖥️</div><h3>Setup indisponible</h3></div>';return}
  const cats=S.categories.filter(c=>S.items.some(i=>i.cat==c.id)),tot=S.items.reduce((a,i)=>a+(i.price||0),0),unk=S.items.filter(i=>i.price==null).length;
  const g=S.groups?.pc,ct=c=>S.items.filter(i=>i.cat==c).reduce((a,i)=>a+(i.price||0),0);
  const link=i=>i.url||'https://www.idealo.fr/prechcat.html?q='+encodeURIComponent(i.name);
  const card=i=>`<div class="glass row" data-exp="1" style="align-items:flex-start"><span class="ic" style="font-size:1.6rem;width:44px;text-align:center;flex:none">${SICON[i.id]||S.categories.find(c=>c.id==i.cat)?.icon||'📦'}</span><span class="n"><b>${esc(i.name)}</b>${i.to_confirm?' <span class="pill warn">à confirmer</span>':''}${i.spec?`<br><small>${esc(i.spec)}</small>`:''}${i.notes?`<br><small class="mut">${esc(i.notes)}</small>`:''}${i.date?`<br><small class="mut">Acheté le ${fdate(i.date)}</small>`:''}${i.value_score!=null||i.quality_score!=null?`<br><span style="display:inline-flex;gap:.35rem;flex-wrap:wrap;margin-top:.2rem">${i.quality_score!=null?`<span class="pill" style="color:${scCol(i.quality_score)};border-color:${scCol(i.quality_score)}66">⭐ Qualité ${i.quality_score}/10</span>`:''}${i.value_score!=null?`<span class="pill" style="color:${scCol(i.value_score)};border-color:${scCol(i.value_score)}66">💶 Qualité-prix ${i.value_score}/10</span>`:''}</span>`:''}<span class="expb" style="display:none">${i.quality_note?`<small class="mut" style="display:block;line-height:1.3"><b>Qualité :</b> ${esc(i.quality_note)}</small>`:''}${i.value_note?`<small class="mut" style="display:block;line-height:1.3"><b>Prix :</b> ${esc(i.value_note)}</small>`:''}${i.tip?`<small style="display:block;line-height:1.3;margin-top:.25rem;color:var(--cy)">💡 ${esc(i.tip)}</small>`:''}</span>${i.quality_note||i.value_note||i.tip?'<button type="button" class="exph btn ghost sm" style="margin-top:.3rem">Détails ›</button>':''}<br><a href="${esc(link(i))}" target="_blank" rel="noopener" style="font-size:.82rem">${i.url?'Voir le produit ›':'Comparer les prix ›'}</a></span><span class="p">${i.price!=null?eur(i.price):'<small class="mut">prix ?</small>'}</span></div>`;
  const qq=S.items.filter(i=>i.quality_score!=null&&i.price),qs=qq.length?qq.reduce((a,i)=>a+i.quality_score*i.price,0)/qq.reduce((a,i)=>a+i.price,0):null,sc=S.items.filter(i=>i.value_score!=null&&i.price),vs=sc.length?sc.reduce((a,i)=>a+i.value_score*i.price,0)/sc.reduce((a,i)=>a+i.price,0):null,best=sc.slice().sort((a,b)=>b.value_score-a.value_score)[0],worst=sc.slice().sort((a,b)=>a.value_score-b.value_score)[0];
  app.innerHTML=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,rgba(34,211,238,.35),transparent 60%),radial-gradient(100% 100% at 100% 0,rgba(168,85,247,.35),transparent 60%)"><div class="ttl"><h3>Mon setup</h3><span class="pill">${S.items.length} éléments</span><span class="pill">MAJ ${fdate(S.updated)}</span></div></div>
  <div class="stats">${stat('Valeur totale',eur(tot),unk?`${unk} prix inconnu${unk>1?'s':''}`:'')}${qs!=null?stat('Qualité globale',`<span style="color:${scCol(qs)}">${fnum(qs,1)}/10</span>`,'moyenne pondérée par le prix (avis)'):''}${vs!=null?stat('Qualité-prix global',`<span style="color:${scCol(vs)}">${fnum(vs,1)}/10</span>`,'moyenne pondérée par le prix (avis)'):''}${cats.slice(0,2).map(c=>stat(c.icon+' '+c.name,eur(ct(c.id)),S.items.filter(i=>i.cat==c.id).length+' éléments')).join('')}</div>
  <div class="tool" style="margin-top:.8rem"><a class="btn" href="${SETUP_ISSUE}" target="_blank" rel="noopener">➕ Ajouter / modifier</a><a class="btn ghost" href="#/setup/conseils">💡 Conseils d'upgrade</a><a class="btn ghost" href="#/setup/reglages">⚙️ Réglages conseillés</a></div>
  ${best?`<div class="glass pad" style="margin-top:.7rem"><b>💎 Meilleure affaire :</b> ${esc(best.name)} (${best.value_score}/10)<br><b>🤔 Moins rentable :</b> ${esc(worst.name)} (${worst.value_score}/10)<br><small class="mut">Notes « qualité » (tests et avis d'utilisateurs) et « qualité-prix » = avis basés sur les prix du marché français constatés le ${fdate(S.value_date)} (estimations, susceptibles d'évoluer).</small></div>`:''}
  <div class="glass chart" style="height:250px"><canvas id="s1"></canvas></div>
  ${cats.map(c=>`<h2>${c.icon} ${esc(c.name)} <span class="more" style="color:var(--gr)">${eur(ct(c.id))}</span></h2>
   ${c.id=='pc'&&g?`<div class="glass kv" style="margin-bottom:.5rem"><span>Monté par</span><span>${esc(g.assembled_by)}</span><span>Acheté le</span><span>${fdate(g.purchase_date)}</span><span>Total facture</span><span>${eur(g.invoice_total)}</span><span>Garantie</span><span>${esc(g.warranty)} · jusqu'au ${fdate(g.warranty_until)} <small class="up">(${Math.max(0,Math.ceil((new Date(g.warranty_until)-Date.now())/864e5/30.4))} mois restants)</small></span></div>`:''}
   <div class="list">${S.items.filter(i=>i.cat==c.id).map(card).join('')}</div>`).join('')}
  <p class="mut" style="font-size:.8rem;margin-top:1rem">Pour modifier : « Ajouter / modifier » ouvre un formulaire (action, catégorie, nom, prix, date…). L'app se met à jour quelques minutes après. Dépôt public : aucune info personnelle (pas de n° de facture ni d'adresse).</p>`;
  const pc=S.items.filter(i=>i.cat=='pc'&&i.price);
  chart($('#s1'),{type:'doughnut',data:{labels:pc.map(i=>i.name.replace(/^(AMD|Gigabyte GeForce|Gigabyte|Corsair|Kingston|Xigmatek|SilverStone|ASUS) /,'')),datasets:[{data:pc.map(i=>i.price),backgroundColor:[...PAL,'#94a3b8','#f472b6'],borderColor:'#0a0920',borderWidth:3}]},options:{cutout:'60%',plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}},title:{display:true,text:'Répartition du prix du PC'},tooltip:{callbacks:{label:c=>` ${eur(c.raw)} (${fnum(100*c.raw/pc.reduce((a,i)=>a+i.price,0),0)} %)`}}}}});
}
function reglages(){
  const R=D.setup?.settings;if(!R){app.innerHTML='<div class="glass empty">Aucun réglage.</div>';return}
  const sel=sessionStorage.getItem('rg')||'global';
  app.innerHTML=`<h2>Réglages conseillés <span class="pill" style="margin-left:.3rem">${fdate(D.setup.settings_date)}</span></h2>
  <p class="mut" style="margin:.2rem 0 .6rem">Adaptés à ta config : Ryzen 5 5600 · RTX 5070 12 Go · écran 1080p 300 Hz · Xiaomi 14T.</p>
  <div class="seg" id="rseg"><button data-g="global">🛠️ Général</button>${R.games.map((g,i)=>`<button data-g="${i}">${g.icon} ${esc(g.name)}</button>`).join('')}</div><div id="rv"></div>
  <p class="mut" style="font-size:.8rem;margin-top:1rem">Les FPS indiqués sont des estimations (ils varient selon la carte, la scène et les mises à jour). Le Ryzen 5 5600 est le facteur limitant dans les jeux compétitifs à très haut FPS.</p>`;
  const draw=k=>{sessionStorage.setItem('rg',k);$$('#rseg button').forEach(b=>b.classList.toggle('on',b.dataset.g==k));
    if(k=='global'){$('#rv').innerHTML=`<div class="list">${R.global.map(([t,x])=>`<div class="glass pad"><b>${esc(t)}</b><div class="desc" style="padding:.3rem 0 0">${esc(x)}</div></div>`).join('')}</div>`;return}
    const g=R.games[+k];if(!g)return draw('global');
    $('#rv').innerHTML=`<div class="stats" style="grid-template-columns:repeat(2,1fr)">${stat('Objectif',esc(g.goal))}${stat('FPS attendus',`<span style="font-size:1rem">${esc(g.fps)}</span>`)}</div>
    <div class="glass tbl" style="margin-top:.7rem"><table>${g.items.map(([a,b])=>`<tr><td style="white-space:normal;color:var(--mut);width:40%">${esc(a)}</td><td style="white-space:normal"><b>${esc(b)}</b></td></tr>`).join('')}</table></div>`};
  $$('#rseg button').forEach(b=>b.onclick=()=>draw(b.dataset.g));draw(sel);
}
function advice(){
  const S=D.setup,A=(S?.advice||[]).slice().sort((a,b)=>a.prio-b.prio);
  app.innerHTML=`<h2>Conseils d'upgrade <span class="pill" style="margin-left:.3rem">${fdate(S?.advice_date)}</span></h2>
  <div class="list">${A.map(a=>`<div class="glass pad" style="border-left:3px solid ${a.prio<=2?'var(--gr)':a.prio<=4?'var(--cy)':'var(--vi)'}"><div style="display:flex;justify-content:space-between;gap:.6rem;align-items:start"><b style="font-size:1.05rem">${a.prio}. ${esc(a.title)}</b></div>
   <div style="margin:.35rem 0">${(a.tags||[]).map(t=>`<span class="pill">${esc(t)}</span>`).join('')}<span class="pill ${a.cost.startsWith('0')?'ok':'warn'}">💶 ${esc(a.cost)}</span></div>
   <div class="desc" style="padding:0">${esc(a.text)}</div>${(a.links||[]).map(l=>`<a href="${esc(l.u)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:.5rem;font-size:.88rem">${esc(l.t)} ›</a>`).join(' · ')}</div>`).join('')}</div>
  <p class="mut" style="font-size:.8rem;margin-top:1rem">Les coûts sont des estimations (prix constatés en France mi-octobre 2026, susceptibles de varier). Classés par priorité / rapport gain-prix.</p>
  <a class="btn ghost full" href="#/setup" style="margin-top:.6rem">‹ Retour au setup</a>`;
}
function codModes(){
  const m=D.cod,mp=m.filter(x=>(x.type||'MP')=='MP'),br=m.filter(x=>x.type=='BR');
  const grp=(a,f)=>{const g={};a.forEach(x=>(g[f(x)||'Inconnu']??=[]).push(x));return Object.entries(g).sort((a,b)=>b[1].length-a[1].length)};
  const TT={squad:'Escouade',duo:'Duo',solo:'Solo'};
  const mpG=grp(mp,x=>x.mode),brMap=grp(br,x=>x.map),brT=grp(br,x=>TT[x.team_type]||x.team_type);
  const mpRow=([k,a])=>`<tr><td><b>${esc(k)}</b></td><td>${a.length}</td><td>${fnum(kdOf(a),2)}</td><td>${fnum(avg(a,'kills'),1)}</td><td>${fnum(avg(a,'deaths'),1)}</td><td>${fnum(avg(a,'score'),0)}</td><td>${fnum(avg(a,'impact'),0)}</td><td>${avg(a,'accuracy_pct')!=null?fnum(avg(a,'accuracy_pct'),1)+' %':'—'}</td><td>${fnum(wr(a),0)} %</td><td>${a.filter(x=>x.mvp).length}</td></tr>`;
  const brRow=([k,a])=>`<tr><td><b>${esc(k)}</b></td><td>${a.length}</td><td>${fnum(avg(a,'placement'),1)}</td><td>${a.filter(x=>x.placement!=null&&x.placement<=5).length}</td><td>${a.filter(x=>x.placement==1).length}</td><td>${fnum(avg(a,'kills'),1)}</td><td>${fnum(avg(a,'damage'),0)}</td><td>${avg(a,'accuracy_pct')!=null?fnum(avg(a,'accuracy_pct'),1)+' %':'—'}</td><td>${a.filter(x=>x.mvp).length}</td></tr>`;
  const brHead='<tr><th></th><th>Parties</th><th>Class. moy.</th><th>Top 5</th><th>Top 1</th><th>Élim. moy.</th><th>Dégâts moy.</th><th>Précision</th><th>MVP</th></tr>';
  app.innerHTML=`<h2>Multijoueur — par mode (${mp.length})</h2>${mp.length?`<div class="glass chart"><canvas id="m1"></canvas></div>${codBreakHTML(mp,'mode','Détail par mode').replace('<h2>Détail par mode</h2>','<div style="margin-top:.7rem"></div>')}${codBreakHTML(mp,'map','Multijoueur — par carte')}${codBestWorst(mp)}`:'<div class="glass empty">Aucune partie multijoueur.</div>'}
  <h2>Battle Royale — par format (${br.length})</h2>${br.length?`<div class="two"><div class="glass chart"><canvas id="b1"></canvas></div><div class="glass chart"><canvas id="b2"></canvas></div></div><div class="glass tbl" style="margin-top:.7rem"><table>${brHead.replace('<th></th>','<th>Format</th>')}${brT.map(brRow).join('')}</table></div>
  <h2>Battle Royale — par carte</h2><div class="glass tbl"><table>${brHead.replace('<th></th>','<th>Carte</th>')}${brMap.map(brRow).join('')}</table></div>`:'<div class="glass empty">Aucune partie Battle Royale.</div>'}
  <p class="mut" style="font-size:.8rem">Victoire BR = 1ʳᵉ place. Toutes les moyennes sont calculées à partir des parties enregistrées.</p>`;
  if(mp.length)chart($('#m1'),{type:'bar',data:{labels:mpG.map(g=>g[0]),datasets:[{label:'K/D',data:mpG.map(g=>kdOf(g[1])),backgroundColor:COL.cy+'bb',borderRadius:8},{label:'Élim. moy.',data:mpG.map(g=>avg(g[1],'kills')),backgroundColor:COL.vi+'bb',borderRadius:8,yAxisID:'y2'}]},options:{scales:{y:{beginAtZero:true,title:{display:true,text:'K/D'}},y2:{position:'right',beginAtZero:true,grid:{display:false}}},plugins:{title:{display:true,text:'K/D et éliminations par mode'}}}});
  if(br.length){const s=br.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    chart($('#b1'),{type:'line',data:{labels:s.map(x=>fshort(x.date)),datasets:[lineDS('Classement',s.map(x=>x.placement),COL.gr,{fill:false}),lineDS('Éliminations',s.map(x=>x.kills),COL.pk,{fill:false,yAxisID:'y2'})]},options:{scales:{y:{reverse:true,min:1,title:{display:true,text:'Classement #'}},y2:{position:'right',beginAtZero:true,grid:{display:false},title:{display:true,text:'Élim.'}}},plugins:{title:{display:true,text:'Classement BR (haut = mieux) et éliminations'}}}});
    chart($('#b2'),{type:'bar',data:{labels:s.map(x=>fshort(x.date)),datasets:[{label:'Dégâts',data:s.map(x=>x.damage),backgroundColor:COL.or+'bb',borderRadius:8}]},options:{scales:{y:{beginAtZero:true}},plugins:{legend:{display:false},title:{display:true,text:'Dégâts infligés BR'}}}});}
}
function codMatch(i){
  const x=D.cod[i];if(!x){app.innerHTML=`<div class="glass wait"><div class="ico">❓</div><h3>Partie introuvable</h3><a class="btn" href="#/cod">Retour</a></div>`;return}
  const R={win:['Victoire','var(--gr)'],loss:['Défaite','var(--bad)'],draw:['Égalité','var(--warn)']}[x.result]||['—','var(--mut)'];
  const d=new Date(x.date).toLocaleString('fr-FR',{...TZ,dateStyle:'full',timeStyle:'short'});
  app.innerHTML=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,${R[1]}55,transparent 65%)"><div class="ttl"><h3 style="color:${R[1]}">${R[0]}${x.score_team!=null?` ${x.score_team}:${x.score_enemy}`:''}</h3><span class="pill">${x.type=='BR'?'Battle Royale':'Multijoueur'}</span><span class="pill">${esc(x.mode||'Mode ?')}</span><span class="pill">${esc(x.map||'Carte ?')}</span>${x.mvp?'<span class="pill ok">MVP</span>':''}</div></div>
  <p class="mut" style="margin:.2rem 0 .8rem">${esc(d)}</p>
  <div class="stats">${stat('É / M / A',`${x.kills??'—'} / ${x.deaths??'—'} / ${x.assists??'—'}`,'K/D '+fnum(num(x.kd),2))}${x.type=='BR'?'':stat('Score',fnum(x.score),x.team_place?`${x.team_place}ᵉ / ${x.team_size||'?'} de l'équipe`:'')}${x.impact!=null?stat('Impact',fnum(x.impact),x.mvp?'🏆 MVP':''):''}${x.type!='BR'&&x.objective_time?stat('Temps sur objectif',esc(x.objective_time)):''}${x.type!='BR'&&x.damage!=null?stat('Dégâts',fnum(x.damage)):''}${x.capture_kills!=null?stat('Élim. en capture',fnum(x.capture_kills)):''}${x.distance!=null?stat('Distance',fnum(x.distance)):''}${x.xp_gained!=null?stat('EXP',fnum(x.xp_gained),x.rank_xp!=null?'Grade : +'+fnum(x.rank_xp):''):''}${x.pending?stat('Statut','📲','pas encore synchronisée'):''}${stat('Précision',x.accuracy_pct!=null?fnum(x.accuracy_pct,1)+' %':'—',x.headshot_pct!=null?'Tête : '+fnum(x.headshot_pct,1)+' %':'')}
  ${x.type=='BR'||x.placement!=null?stat('Classement',x.placement!=null?'#'+x.placement+(x.total_teams?'<small class="mut">/'+x.total_teams+'</small>':''):'—',x.survival_time?'Survie : '+esc(x.survival_time):'')+stat('Dégâts',fnum(x.damage))+(x.revives!=null?stat('Réanimations',fnum(x.revives)):'')+(x.distance!=null?stat('Distance',fnum(x.distance)+' m'):'')+(x.talent!=null?stat('Talents utilisés',fnum(x.talent)):''):''}${x.avg_damage_per_round!=null?stat('Dégâts / manche',fnum(x.avg_damage_per_round)):''}${x.first_kills!=null?stat('Premières élim.',fnum(x.first_kills)):''}${x.lone_wolf_wins!=null?stat('Loup solitaire',fnum(x.lone_wolf_wins),'victoires'):''}${stat('EXP gagnée',fnum(x.xp_gained),x.rank_xp!=null?'EXP de grade : '+fnum(x.rank_xp):'')}</div>
  ${(x.duels||[]).length?`<h2>Duels</h2><div class="list">${x.duels.map(o=>{const t=o.kills+o.deaths,p=t?100*o.kills/t:50;return `<div class="glass goal"><div class="h"><b>vs ${esc(o.opponent)}</b><span class="${o.kills>o.deaths?'up':o.kills<o.deaths?'down':'mut'}">${o.kills} – ${o.deaths}</span></div><div class="bar ${o.kills>=o.deaths?'gr':''}"><i data-w="${t?p:0}"></i></div></div>`}).join('')}</div><p class="mut" style="font-size:.78rem">Mes éliminations – ses éliminations sur moi.</p>`:''}
  ${(x.medals||[]).length?`<h2>Médailles</h2><div class="badges">${x.medals.map(o=>`<div class="glass bdg"><div class="e">🏅</div><b>${esc(o.name)}</b>${o.count!=null?`<small class="mut">× ${o.count}</small>`:''}</div>`).join('')}</div>`:''}
  ${(x.screenshots||(x.screenshot?[x.screenshot]:[])).length?`<h2>Captures</h2><div class="shots">${(x.screenshots||[x.screenshot]).map(u=>`<img loading="lazy" src="${esc(u)}" data-full="${esc(u)}" alt="">`).join('')}</div>`:''}
  ${x.ocr_notes?.length?`<p class="pill warn">${esc(x.ocr_notes.join(' · '))}</p>`:''}`;
  $$('.shots img').forEach(i=>i.onclick=()=>lb(i.dataset.full));animBars();
}
function codBind(){rankChart();codRankBind();$$('#tseg button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('codType',b.dataset.t);const y=scrollY;render();scrollTo(0,y)})}
/* ========== COD : rangs saisis dans l'app (local puis synchro GitHub) ========== */
const CRK='gt-cod-ranks';
const codRankPend=()=>{const key=r=>Math.floor(new Date(r.date).getTime()/6e4)+'|'+(r.tier||'')+'|'+(r.sub||'')+'|'+(r.points??'');
  const out={MP:[],BR:[]};for(const m of['MP','BR']){const have=new Set((D.ranksRepo[m]||[]).map(key));out[m]=LS.get(CRK,[]).filter(r=>r&&r.mode==m&&r.date&&!have.has(key(r)))}
  const keep=Object.values(out).flat();LS.set(CRK,keep.map(r=>({...r})));return out};
function codRankNorm(r){if(!r||!r.tier)return r;const nd=COD_LADDER.find(x=>x[0]==r.tier)?.[2]>0;const sub=nd?r.sub:null;return{...r,sub,value:codStepVal(r.tier,sub)||r.value,label:r.tier+(sub?' '+sub:'')}}
function codRankRefresh(){const p=codRankPend();for(const m of['MP','BR'])D.ranks[m]=[...(D.ranksRepo[m]||[]),...p[m].map(r=>({...r,pending:1}))].sort((a,b)=>new Date(a.date)-new Date(b.date))}
const codRankURLs=()=>{const p=codRankPend();return[...p.MP.map(r=>['MP',r]),...p.BR.map(r=>['BR',r])].map(([m,r])=>{
  const t=new Date(r.date).toLocaleString('fr-FR',{...TZ,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return [m,r,ghNew(`COD – rang ${m} ${r.tier}${r.sub?' '+r.sub:''} (${t})`,{action:'rank',mode:m,tier:r.tier,sub:r.sub||null,points:r.points??null,season:r.season||null,date:r.date},'cod-rank')]})};
function codRankSyncBox(){const u=codRankURLs();if(!u.length)return '';const at=LS.get('gt-codrank-sync-at',0),late=at&&Date.now()-at>6e5;
  return `<div class="glass pad" style="border-color:var(--warn);margin:.6rem 0"><b>📲 ${u.length} changement${u.length>1?'s':''} de rang seulement sur cet appareil</b>${late?'<p class="down" style="font-size:.85rem;margin:.3rem 0">⚠️ La dernière synchronisation n\'a pas abouti. Réessaie.</p>':''}<p class="mut" style="font-size:.85rem;margin:.3rem 0 .6rem">Touche « Synchroniser », puis valide la demande GitHub (« Create » / « Submit ») sans rien modifier.</p>${u.map(([m,r,url],i)=>`<a class="btn full codranksync" href="${esc(url)}" target="_blank" rel="noopener">🔄 Synchroniser (GitHub) · ${m} ${esc(r.tier)}${r.sub?' '+esc(r.sub):''}</a>`).join('')}</div>`}
function codRankBind(){$$('.codranksync').forEach(a=>a.onclick=()=>{LS.set('gt-codrank-sync-at',Date.now());toast('📝 Valide la demande GitHub pour terminer')})}
function codRankForm(){
  const now=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
  app.innerHTML=`<h2>Changement de rang COD</h2><p class="mut" style="font-size:.88rem">Enregistré tout de suite sur cet appareil, puis synchronisé vers GitHub (comme les parties et les objectifs). Échelle : Novice → Vétéran → Élite → Pro (divisions I à V), puis Maître, Grand Maître et Légendaire aux points.</p>
  <form class="glass form" id="crf" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem">
   <label>Mode<select name="mode"><option value="MP">Multijoueur</option><option value="BR">Battle Royale</option></select></label>
   <label>Rang<select name="tier">${RTIERS.map(t=>`<option>${t}</option>`).join('')}</select></label>
   <label id="subw">Division<select name="sub">${COD_SUB.map(x=>`<option>${x}</option>`).join('')}</select></label>
   <label>Points de rang (optionnel)<input name="points" type="text" inputmode="numeric" placeholder="ex. 4250"></label>
   <label>Date et heure<input name="date" type="datetime-local" value="${now}" required></label>
   <label>Saison (optionnel)<input name="season" type="text" placeholder="ex. Saison 9 2026"></label>
   <div style="grid-column:1/-1"><div id="crprev" class="mut" style="font-size:.85rem;margin-bottom:.5rem"></div><button class="btn full" type="submit">💾 Enregistrer le rang</button></div></form>
  <p class="mut" style="font-size:.8rem">Seuils (points) : ${COD_LADDER.map(([n,p])=>`${n} dès ${fnum(p)}`).join(' · ')}.</p>`;
  const upd=()=>{const t=$('#crf').tier.value,need=COD_LADDER.find(x=>x[0]==t)[2]>0;$('#subw').style.display=need?'':'none';
    const pts=$('#crf').points.value;$('#crprev').textContent='Aperçu : '+t+(need?' '+$('#crf').sub.value:'')+(pts?' · '+pts+' pts':'')};
  $('#crf').onchange=upd;upd();
  $('#crf').onsubmit=e=>{e.preventDefault();const f=e.target,date=parisISO(f.date.value);if(!date)return toast('⚠️ Date invalide');
    const tier=f.tier.value,sub=COD_LADDER.find(x=>x[0]==tier)[2]>0?f.sub.value:null,pts=f.points.value.trim()?parseInt(f.points.value.replace(/\D/g,''),10):null;
    const r={mode:f.mode.value,tier,sub,points:Number.isFinite(pts)?pts:null,season:f.season.value.trim()||null,date,value:codStepVal(tier,sub),label:tier+(sub?' '+sub:'')};
    const a=LS.get(CRK,[]);a.push(r);if(!LS.set(CRK,a))return toast('⚠️ Enregistrement local impossible (navigation privée ?)');
    codRankRefresh();toast('✅ Rang enregistré — pense à « Synchroniser »');go('#/cod')}}
function ranksHTML(){
  const card=(k,n)=>{const a=D.ranks[k],c=a.at(-1),pv=a.at(-2),best=a.reduce((b,x)=>!b||x.value>b.value?x:b,null);
    return `<div class="glass stat"><div class="k">${n}</div>${c?`<div class="v">${RICON[RTIERS.indexOf(c.tier)]||'🎖️'} ${esc(c.label)}</div><div class="d">${c.points!=null?fnum(c.points)+' pts · ':''}${fdate(c.date)}${pv?` · <span class="${c.value>pv.value?'up':c.value<pv.value?'down':''}">${c.value>pv.value?'▲':c.value<pv.value?'▼':'='} depuis ${esc(pv.label)}</span>`:''}</div>${best&&best!==c?`<div class="d">Meilleur suivi : ${esc(best.label)}</div>`:''}`:`<div class="v mut" style="font-size:1rem">Aucun rang enregistré</div>`}</div>`};
  const any=D.ranks.MP.length||D.ranks.BR.length;
  return `<h2>Rang classé</h2><div class="stats" style="grid-template-columns:repeat(2,1fr)">${card('MP','Multijoueur')}${card('BR','Battle Royale')}</div>
  <div class="tool" style="margin-top:.6rem"><a class="btn full" href="#/cod/rang">🎖️ Enregistrer un changement de rang</a></div>${codRankSyncBox()}
  ${['MP','BR'].map(k=>{const c=D.ranks[k].at(-1);if(!c)return '';const pts=codPtsOf(c.tier,c.sub,c.points),pct=Math.min(100,100*pts/8001);return `<div class="glass pad" style="margin-top:.5rem"><small class="mut">${k=='MP'?'Multijoueur':'Battle Royale'} · vers Légendaire (8 001 pts)</small>${bar(pct)}<small class="mut">${fnum(pts)} pts (calculé depuis le rang${c.points==null?' — seuil du palier':''}) · reste ${fnum(Math.max(0,8001-pts))} pts</small></div>`}).join('')}
  ${any?`<div class="glass chart"><canvas id="crk"></canvas></div><div class="glass tbl" style="margin-top:.7rem"><table><tr><th>Date</th><th>Mode</th><th>Rang</th><th>Points</th><th>Saison</th></tr>${[...D.ranks.MP.map(x=>({...x,m:'MJ'})),...D.ranks.BR.map(x=>({...x,m:'BR'}))].sort((a,b)=>a.date<b.date?1:-1).map(x=>`<tr><td>${fdate(x.date)}</td><td>${x.m}</td><td>${RICON[RTIERS.indexOf(x.tier)]||''} ${esc(x.label)}</td><td>${fnum(x.points)}${x.pending?' <span class="pill warn">📲</span>':''}</td><td>${esc(x.season||'—')}</td></tr>`).join('')}</table></div>`:''}`;
}
function rankChart(){
  if(!$('#crk'))return;const TS=[...(D.ranks.MP||[]),...(D.ranks.BR||[])].map(x=>new Date(x.date).getTime()).filter(Boolean);const lo=TS.length?Math.min(...TS):0,hi=TS.length?Math.max(...TS):1,pad=Math.max(3*864e5,(hi-lo)*.2);const lbl=v=>{const t=Math.floor((v-1)/5),sub=(v-1)%5;return RTIERS[t]?(t==7?RTIERS[t]:RTIERS[t]+' '+['I','II','III','IV','V'][sub]):''};
  chart($('#crk'),{type:'line',data:{datasets:[['MP','Multijoueur',COL.cy],['BR','Battle Royale',COL.gr]].filter(([k])=>D.ranks[k].length).map(([k,n,c])=>lineDS(n,D.ranks[k].map(x=>({x:new Date(x.date).getTime(),y:codPtsOf(x.tier,x.sub,x.points),l:x.label})),c,{fill:false,stepped:true,pointRadius:5}))},
   options:{parsing:true,scales:{x:{type:'linear',min:lo-pad,max:hi+pad,ticks:{callback:v=>fshort(v),maxTicksLimit:5}},y:{min:0,suggestedMax:8001,ticks:{callback:v=>{const st=[...COD_STEPS].reverse().find(x=>x.pts<=v);return st?st.tier+(st.sub?' '+st.sub:''):v},maxTicksLimit:9}}},plugins:{title:{display:true,text:'Évolution du rang (points)'},tooltip:{callbacks:{title:i=>fdate(i[0].raw.x),label:i=>` ${i.dataset.label} : ${i.raw.l} · ${fnum(i.raw.y)} pts`}}}}});
}
function career(){
  const c=D.cp;if(!c)return '';const mp=c.multiplayer||{},br=c.battle_royale||{},r=c.recap_2025||{},prev=D.codP.at(-2);
  const dl=(a,b,d=0)=>prev&&a!=null&&b!=null&&a!=b?` <span class="${a>b?'up':'down'}">${a>b?'+':''}${fnum(a-b,d)}</span>`:'';
  const P=prev||{};const pm=P.multiplayer||{},pb=P.battle_royale||{};
  const since=c.account?.registered?Math.floor((Date.now()-new Date(c.account.registered))/864e5/365.25):null;
  return `<h2>Carrière <span class="pill" style="margin-left:.3rem">relevé du ${fdate(c.date)}</span></h2>
  <div class="seg" id="cseg"><button class="on" data-c="mp">Multijoueur</button><button data-c="br">Battle Royale</button><button data-c="r25">Rétro 2025</button></div>
  <div id="c-mp" class="cpan"><div class="stats">${stat('Parties',fnum(mp.matches)+dl(mp.matches,pm.matches))}${stat('Éliminations',fnum(mp.kills)+dl(mp.kills,pm.kills))}${stat('É/M',fnum(mp.kd,2)+dl(mp.kd,pm.kd,2))}${stat('Précision moy.',fnum(mp.accuracy_pct,2)+' %')}
   ${stat('Meilleur joueur',fnum(mp.mvp),mp.matches?fnum(100*mp.mvp/mp.matches,1)+' % des parties (calculé)':'')}${stat('Top 3',fnum(mp.top3),mp.matches?fnum(100*mp.top3/mp.matches,1)+' % des parties (calculé)':'')}${stat('Élim. / partie',fnum(mp.kills/mp.matches,1),'calculé')}${stat('Morts (calculé)',mp.kd?'≈ '+fnum(mp.kills/mp.kd):'—','éliminations ÷ É/M')}</div></div>
  <div id="c-br" class="cpan" style="display:none"><div class="stats">${stat('Parties',fnum(br.matches)+dl(br.matches,pb.matches))}${stat('Victoires',fnum(br.wins)+dl(br.wins,pb.wins),br.matches?fnum(100*br.wins/br.matches,1)+' % (calculé)':'')}${stat('Éliminations',fnum(br.kills)+dl(br.kills,pb.kills),br.matches?fnum(br.kills/br.matches,2)+' / partie (calculé)':'')}${stat('Dégâts moyens',fnum(br.avg_damage,1))}
   ${stat('Meilleur joueur',fnum(br.mvp),br.matches?fnum(100*br.mvp/br.matches,1)+' % des parties (calculé)':'')}${stat('Précision moy.',fnum(br.accuracy_pct,2)+' %')}</div><div class="glass chart" style="height:220px"><canvas id="cbr"></canvas></div></div>
  <div id="c-r25" class="cpan" style="display:none"><div class="glass kv"><span>Arme favorite</span><span><b>${esc(r.top_weapon||'—')}</b><br><small>${fnum(r.top_weapon_kills)} éliminations · ${fnum(r.top_weapon_shots)} balles tirées</small></span>
   <span>Carte préférée</span><span>${esc(r.favorite_map||'—')}${r.favorite_map_value!=null?` <small>(${fnum(r.favorite_map_value)})</small>`:''}</span><span>Mode préféré</span><span>${esc(r.favorite_mode||'—')}</span>
   <span>Temps en ligne</span><span><b>${fnum(r.online_hours_2025)} h</b> en 2025</span><span>Éliminations 2025</span><span>${fnum(r.kills_2025)}</span><span>Meilleur joueur 2025</span><span>${fnum(r.mvp_2025)} fois</span>
   <span>Meilleur grade</span><span><b style="color:var(--warn)">${esc(r.best_rank_ever||'—')}</b></span><span>Inscription</span><span>${fdate(c.account?.registered)}${since!=null?` <small>(${since} ans)</small>`:''}</span></div></div>
  ${D.codP.length>1?`<div class="glass chart" style="height:220px"><canvas id="chist"></canvas></div>`:''}
  <div class="shots" style="margin-top:.7rem">${(c.screenshots||[]).map(u=>`<img loading="lazy" src="${esc(u)}" data-full="${esc(u)}" alt="Capture profil">`).join('')}</div>
  <p class="mut" style="font-size:.78rem">Source : captures du profil en jeu. Les valeurs « calculé » sont dérivées des chiffres affichés.</p>`;
}
function careerCharts(){
  if(!D.cp)return;
  $$('#cseg button').forEach(b=>b.onclick=()=>{$$('#cseg button').forEach(x=>x.classList.toggle('on',x===b));$$('.cpan').forEach(p=>p.style.display=p.id=='c-'+b.dataset.c?'':'none');});
  $$('.shots img').forEach(i=>i.onclick=()=>lb(i.dataset.full));
  const br=D.cp.battle_royale||{};
  if(br.matches)chart($('#cbr'),{type:'doughnut',data:{labels:['Victoires','Autres parties'],datasets:[{data:[br.wins,br.matches-br.wins],backgroundColor:[COL.gr,'rgba(160,150,255,.18)'],borderColor:'#0a0920',borderWidth:3}]},options:{cutout:'68%',plugins:{title:{display:true,text:'Battle Royale : taux de victoire (calculé)'}}}});
  if(D.codP.length>1)chart($('#chist'),{type:'line',data:{labels:D.codP.map(x=>fshort(x.date)),datasets:[lineDS('É/M multijoueur',D.codP.map(x=>num(x.multiplayer?.kd)),COL.cy,{fill:false}),lineDS('Victoires BR',D.codP.map(x=>num(x.battle_royale?.wins)),COL.gr,{fill:false,yAxisID:'y2'})]},options:{scales:{y2:{position:'right',grid:{display:false}}}}});
}
function profil(){
  setTimeout(storageFill,0);
  const x=D.xp,T=tastes(),B=badges(),top=T.genres.slice(0,8),tot=top.reduce((a,g)=>a+g[1],0)||1;
  const fav=Object.entries(T.styles).sort((a,b)=>b[1]-a[1])[0];
  app.innerHTML=`${levelCard(false)}
  <div class="tiers">${TIERS.map(t=>`<div class="${t===x.tier?'cur':x.L>=t.l?'done':''}"><span>${t.e}</span>${t.n}<br><small>niv. ${t.l}</small></div>`).join('')}</div>
  <h2>D'où vient ton XP</h2><div class="glass xp">${x.src.map(s=>`<span>${s[0]}<br><small>${esc(s[1])}</small></span><b>${fnum(s[2])}</b>`).join('')}<span><b style="color:var(--txt);text-align:left">Total</b></span><b>${fnum(x.xp)} XP</b></div>
  <h2>Tes styles de jeu</h2>${fav&&fav[1]>0?`<p class="mut" style="margin:.2rem 0 .6rem">Style dominant : <b style="color:var(--cy)">${esc(fav[0])}</b> · genre n°1 : <b style="color:var(--vi)">${esc(top[0]?.[0]||'—')}</b> (${fnum(100*(top[0]?.[1]||0)/tot,0)} % du temps)</p>`:''}
  <div class="two"><div class="glass chart sq"><canvas id="c1"></canvas></div><div class="glass chart sq"><canvas id="c2"></canvas></div></div>
  <p class="mut" style="font-size:.8rem">Pondéré par le temps de jeu, d'après les genres de la boutique Steam.${T.notes.length?' '+esc(T.notes.join(' · '))+'.':''}</p>
  <h2>Badges (${B.filter(b=>b.ok).length}/${B.length})</h2><div class="badges">${B.map(b=>`<div class="glass bdg ${b.ok?'':'lock'}"><div class="e">${b.e}</div><b>${esc(b.n)}</b><small class="mut">${esc(b.d)}</small>${b.ok?'<small class="up">Débloqué ✓</small>':bar(b.p)}</div>`).join('')}</div>
  ${storageHTML()}
  <h2>Plus</h2><div class="list"><a class="glass tile" style="--c:var(--vi)" href="#/bilan"><span class="ic">📊</span><span class="n"><b>Bilan de la semaine</b><small class="mut">Comparaisons et coaching</small></span><span class="chev">›</span></a><a class="glass tile" style="--c:var(--cy)" href="#/activite"><span class="ic">🕒</span><span class="n"><b>Activité</b><small class="mut">Chronologie de tes sessions et progrès</small></span><span class="chev">›</span></a>
  <a class="glass tile" style="--c:var(--vi)" href="#/objectifs"><span class="ic">🎯</span><span class="n"><b>Objectifs</b><small class="mut">${goals().length} en cours</small></span><span class="chev">›</span></a>
  <a class="glass tile" style="--c:var(--gr)" href="https://github.com/Blood63/gaming-tracker" target="_blank" rel="noopener"><span class="ic">⚙️</span><span class="n"><b>Données & automatisation</b><small class="mut">Dépôt GitHub · relevés automatiques</small></span><span class="chev">›</span></a></div>`;
  chart($('#c1'),{type:'doughnut',data:{labels:top.map(g=>g[0]),datasets:[{data:top.map(g=>+g[1].toFixed(1)),backgroundColor:PAL,borderColor:'#0a0920',borderWidth:3,hoverOffset:8}]},options:{cutout:'62%',plugins:{title:{display:true,text:'Genres (heures)'},tooltip:{callbacks:{label:c=>` ${c.label} : ${fnum(c.raw,1)} h (${fnum(100*c.raw/tot,0)} %)`}}}}});
  const sv2=STYLES.map(s=>T.styles[s]),mx=Math.max(1,...sv2);
  chart($('#c2'),{type:'radar',data:{labels:STYLES,datasets:[{label:'Affinité',data:sv2.map(v=>Math.round(100*v/mx)),borderColor:COL.cy,backgroundColor:COL.vi+'40',pointBackgroundColor:COL.gr,borderWidth:2}]},options:{scales:{r:{min:0,max:100,ticks:{display:false},grid:{color:'rgba(160,150,255,.15)'},angleLines:{color:'rgba(160,150,255,.15)'},pointLabels:{color:'#cfcaf5',font:{size:11}}}},plugins:{legend:{display:false},title:{display:true,text:'Profil de joueur'}}}});
  animBars();animRings();
}
function goalHTML(o){const p=Math.min(100,o.p),dec=o.dec||(o.u=='h'?1:0),done=o.done??p>=100;
  const dl0=o.dl??(o.x?.deadline?Math.ceil((new Date(o.x.deadline+'T23:59')-Date.now())/864e5):null);o.dl=dl0;const dl=o.dl!=null&&!(done&&o.dl<0)?`<span class="pill ${o.dl<0&&!done?'warn':''}" style="margin-left:.3rem">${o.dl<0?'Échéance dépassée':o.dl==0?'Aujourd\'hui':'J−'+o.dl}</span>`:'';
  return `<div class="glass goal"><div class="h"><b>${o.icon||''} ${esc(o.label)}</b>${dl}${o.x?.pending?`<span class="pill warn" style="margin-left:.3rem">${o.x.pending==2?'📲 pas encore synchronisé':'🗑️ suppression à synchroniser'}</span>`:''}${o.x?`<button class="x" data-del="${o.x.id}" aria-label="Supprimer">✕</button>`:''}</div>${o.wait?`<div class="mut" style="font-size:.85rem">⏳ ${esc(o.wait)}</div>${bar(0)}`:`<div class="mut" style="font-size:.85rem">${o.u=='RR'||o.type=='rank'?'':fnum(o.cur,dec)+(o.u?' '+o.u:'')+' / '+fnum(o.t,dec)+(o.u?' '+o.u:'')+' · '}${done?'<span class="up">Atteint 🎉</span>':fnum(p,0)+' %'}</div>${bar(p,done?'gr':'')}${o.info?`<div class="mut" style="font-size:.8rem;margin-top:.3rem;line-height:1.35">${o.info}</div>`:''}`}</div>`}
const goalsFor=types=>goals().filter(x=>types.includes(x.type)).map(x=>({x,...goalProg(x)}));
const goalsBlock=(types,title='Objectifs de rang')=>{const G=goalsFor(types);return `<h2>${title}</h2>${G.length?`<div class="list">${G.map(goalHTML).join('')}</div>`:''}${syncBox()}<a class="btn ghost full" href="#/objectifs" style="margin-top:.5rem">🎯 ${G.length?'Gérer mes objectifs':'Fixer un objectif de rang'}</a>`};
const bindGoalDel=re=>{bindSync();$$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Supprimer cet objectif ? (sur tous tes appareils)')){delGoal(+b.dataset.del);re()}})};
function objectifs(){
  const G=goals().map(x=>({x,...goalProg(x)}));
  const opts=D.games.map(g=>`<option value="${g.appid}">${esc(g.name)}</option>`).join('');
  app.innerHTML=`${syncBox()}<h2>Mes objectifs</h2>${G.length?`<div class="list">${G.map(goalHTML).join('')}</div>`:'<div class="glass empty">🎯 Aucun objectif pour l\'instant. Ajoute-en un ci-dessous !</div>'}
  <h2>Nouvel objectif</h2><form class="glass form" id="gf">
   <label>Type<select id="gt"><option value="game_hours">Heures sur un jeu</option><option value="game_ach">% de succès sur un jeu</option><option value="total_hours">Heures de jeu au total</option><option value="achievements">Nombre de succès Steam</option><option value="level">Niveau de joueur</option><option value="cod_kd">K/D COD Mobile (10 dernières)</option><option value="cod_matches">Parties COD Mobile</option><option value="val_rank">Rang Valorant</option><option value="rl_rank">Rang Rocket League</option><option value="cod_rank">Rang COD Mobile</option></select></label>
   <label id="gl">Jeu<select id="gg">${opts}</select></label>
   <label id="gpl" style="display:none">Playlist<select id="gpls">${Object.entries(RL_PL).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
   <label id="gcm" style="display:none">Mode<select id="gcms"><option value="MP">Multijoueur</option><option value="BR">Battle Royale</option></select></label>
   <label id="grk" style="display:none">Rang visé<select id="grks"></select></label>
   <label id="gdv" style="display:none">Division<select id="gdvs"><option value="">—</option>${['I','II','III','IV'].map((d,i)=>`<option value="${i+1}">Div. ${d}</option>`).join('')}</select></label>
   <label id="gvl">Cible<input id="gv" type="number" inputmode="decimal" step="any" min="0"></label>
   <label>Échéance (optionnel)<input id="gdl" type="date"></label>
   <button class="btn" type="submit">Ajouter l'objectif</button></form>
  <p class="mut" style="font-size:.8rem">Un objectif ajouté est enregistré tout de suite sur cet appareil. « Synchroniser » l'envoie dans ton dépôt GitHub (goals.json) pour l'avoir sur tous tes appareils. La progression se met à jour avec chaque relevé.</p>`;
  const sugg={game_hours:g=>Math.ceil(((D.games.find(x=>x.appid==g)?.hours)||0)/10)*10+10,game_ach:()=>100,total_hours:()=>Math.ceil(D.totalH/50)*50+50,achievements:()=>Math.ceil(D.ach/50)*50+50,level:()=>D.xp.L+2,cod_kd:()=>1.5,cod_matches:()=>Math.ceil(D.cod.length/10)*10+10};
  const isR=t=>t.endsWith('_rank'),sh=(id,v)=>$(id).style.display=v?'':'none';
  const rankOpts=t=>{if(t=='val_rank'){const c=D.vh?.mmr?.tier_id||3;return VAL_T.map(x=>`<option value="${x.id}"${x.id==Math.min(27,c+1)?' selected':''}>${esc(vTier(x.n))}</option>`).join('')}
    if(t=='rl_rank'){const pl=D.rlm?.playlists?.find(p=>p.id==$('#gpls').value),nx=pl?rlNext(pl):9;return RL_T.map((n,i)=>`<option value="${i}"${i==nx?' selected':''}>${n}</option>`).join('')}
    const c=codNormStep((D.ranks[$('#gcms').value]||[]).at(-1)?.value||1);let o='';for(let v=1;v<=23;v++)o+=`<option value="${v}"${v==Math.min(23,c+1)?' selected':''}>${codLbl(v)}</option>`;return o};
  const upd=()=>{const t=$('#gt').value;sh('#gl',t.startsWith('game'));sh('#gvl',!isR(t));sh('#grk',isR(t));sh('#gpl',t=='rl_rank');sh('#gdv',t=='rl_rank');sh('#gcm',t=='cod_rank');
    $('#gv').required=!isR(t);if(isR(t))$('#grks').innerHTML=rankOpts(t);else $('#gv').value=sugg[t](+$('#gg').value)};
  $('#gt').onchange=upd;$('#gg').onchange=upd;$('#gcms').onchange=upd;$('#gpls').onchange=upd;upd();
  $('#gf').onsubmit=e=>{e.preventDefault();const t=$('#gt').value,dl=$('#gdl').value||undefined;
    if(isR(t)){const v=+$('#grks').value,o={type:t,target:v,deadline:dl};
      if(t=='val_rank'&&D.vh)o.start=(D.vh.mmr.tier_id-3)*100+(D.vh.mmr.rr||0);
      if(t=='rl_rank'){o.playlist=$('#gpls').value;o.div=+$('#gdvs').value||undefined;const pl=D.rlm?.playlists?.find(p=>p.id==o.playlist);if(pl)o.start=rlVal(pl.tier,pl.div)}
      if(t=='cod_rank'){o.mode=$('#gcms').value;const c=(D.ranks[o.mode]||[]).at(-1);if(c)o.start=c.value}
      addGoal(o);return objectifs()}
    const v=parseFloat($('#gv').value);if(!(v>0))return toast('Entre une cible valide');addGoal({type:t,target:v,deadline:dl,...(t.startsWith('game')?{appid:+$('#gg').value}:{})});objectifs()};
  bindGoalDel(objectifs);
  animBars();
}
function activite(){
  const ev=timeline();
  app.innerHTML=`<h2>Activité</h2><p class="mut" style="font-size:.85rem">Chronologie inter-jeux (calculée depuis tes données : parties, replays, rangs, objectifs, temps de jeu Steam).</p><div class="seg" id="aseg">${[['all','Tout'],['steam','🕹️ Steam'],['valorant','🎯 Valorant'],['rl','🚗 Rocket League'],['cod','🔫 COD'],['objectifs','🎯 Objectifs']].map(([k,n])=>`<button data-f="${k}" class="${k=='all'?'on':''}">${n} (${k=='all'?ev.length:ev.filter(e=>e.link.startsWith('#/'+k)).length})</button>`).join('')}</div><div id="tlv"></div>`;
  const draw=f=>{$('#tlv').innerHTML=tlHTML(f=='all'?ev:ev.filter(e=>e.link.startsWith('#/'+f)));$$('#aseg button').forEach(b=>b.classList.toggle('on',b.dataset.f==f))};
  $$('#aseg button').forEach(b=>b.onclick=()=>draw(b.dataset.f));draw('all');
}

/* ========== routeur ========== */
const TITLES={bilan:'Bilan hebdo','':'GameTrack',setup:'Mon setup',steam:'Bibliothèque',compet:'Compétitif',valorant:'Valorant',rl:'Rocket League',cod:'COD Mobile',profil:'Profil',objectifs:'Objectifs',activite:'Activité'};
function lb(u){$('#lb img').src=u;$('#lb').style.display='flex'}
function go(h){location.hash=h}
let navCount=0;
function goBack(){if(navCount>0){navCount-=2;history.back()}else location.hash='#/'}
function render(){
  charts.forEach(c=>{try{c.destroy()}catch(e){}});charts=[];
  const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean),r=p[0]||'';
  const top=['','steam','compet','setup','objectifs','profil'].includes(r)&&!p[1];
  document.body.classList.toggle('sub',!top);document.body.classList.toggle('cod-amb',r=='cod');setTheme(r=='rl'?'rl':r=='cod'?'cod':r=='valorant'?valAgent():'');document.body.dataset.skin=r=='steam'?'px':'';
  $$('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.r==r||(a.dataset.r=='compet'&&['valorant','rl','cod'].includes(r))||(a.dataset.r=='profil'&&r=='activite')));
  $('#ttl').textContent=r=='setup'&&p[1]?(p[1]=='reglages'?'Réglages':'Conseils'):r=='valorant'&&p[1]?'Partie Valorant':r=='rl'&&p[1]?'Analyse du replay':r=='cod'&&p[1]=='modes'?'Stats par mode':r=='cod'&&p[1]=='ajouter'?'Ajouter une partie':r=='cod'&&p[1]=='rang'?'Changement de rang':r=='cod'&&p[1]=='profil'?'Carte de joueur':r=='cod'&&p[1]?'Partie COD':r=='steam'&&p[1]?(D.games.find(g=>g.appid==p[1])?.name||'Jeu'):(TITLES[r]??'GameTrack');
  try{({bilan, '':home,steam:()=>p[1]?steamGame(+p[1]):library(),compet,valorant:()=>D.vh?(p[1]?valMatch(p[1]):valPage()):tracker('valorant'),rl:()=>p[1]&&D.bc?rlReplay(p[1]):D.rlm&&!D.rOk.length?rlManual():tracker('rl'),setup:()=>p[1]=='conseils'?advice():p[1]=='reglages'?reglages():setupPage(),cod:()=>p[1]=='profil'?codCardForm():p[1]=='rang'?codRankForm():p[1]=='ajouter'?codAdd():p[1]=='modes'?codModes():p[1]!=null?codMatch(+p[1]):cod(),profil,objectifs,activite}[r]||home)()}
  catch(e){console.error(e);app.innerHTML=`<div class="glass wait"><div class="ico">⚠️</div><h3>Erreur d'affichage</h3><p class="mut">${esc(e.message)}</p><a class="btn" href="#/">Accueil</a></div>`}
  window.scrollTo({top:0});
}
let ready=false; // pas de rendu avant la fin du chargement des données (sinon erreur si on change de page pendant le chargement)
function route(){
  navCount++;if(!ready)return;
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){try{const t=document.startViewTransition(render);[t.ready,t.finished,t.updateCallbackDone].forEach(x=>x&&x.catch(()=>{}))}catch(e){render()}}
  else{app.classList.remove('view');void app.offsetWidth;app.classList.add('view');render()}
}
window.addEventListener('hashchange',route);
app.innerHTML='<div class="glass wait"><div class="ico">⚡</div>Chargement…</div>';
load().then(()=>{ready=true;render()}).catch(e=>{console.error(e);app.innerHTML=`<div class="glass wait"><div class="ico">⚠️</div><h3>Impossible de charger les données</h3><p class="mut">${esc(e.message)}</p></div>`});
