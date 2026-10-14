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
const COL={cy:'#22d3ee',vi:'#a855f7',gr:'#4ade80',pk:'#e879f9',warn:'#fbbf24',bad:'#fb7185',bl:'#60a5fa',or:'#fb923c'};
const PAL=[COL.cy,COL.vi,COL.gr,COL.pk,COL.warn,COL.bl,COL.or,COL.bad];
if(window.Chart){Chart.defaults.color='#9692c2';Chart.defaults.borderColor='rgba(160,150,255,.1)';Chart.defaults.font.family='Rajdhani,system-ui';Chart.defaults.font.size=12;Chart.defaults.maintainAspectRatio=false;Chart.defaults.plugins.legend.labels.boxWidth=10;Chart.defaults.plugins.legend.position='bottom'}
let charts=[];
const chart=(el,cfg)=>{if(!el||!window.Chart)return;try{charts.push(new Chart(el,cfg))}catch(e){console.error(e)}};
const lineDS=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color+'2a',fill:true,tension:.35,pointRadius:3,pointHoverRadius:6,borderWidth:2,spanGaps:true,...extra});
const bar=(p,cls='')=>p==null?'':`<div class="bar ${cls}"><i data-w="${Math.max(0,Math.min(100,p))}"></i></div>`;
const animBars=()=>setTimeout(()=>$$('.bar i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'),80);
const stat=(k,v,d='',cls='')=>`<div class="glass stat ${cls}"><div class="k">${esc(k)}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)};
const ISSUE='https://github.com/Blood63/gaming-tracker/issues/new?template=cod-mobile.yml',RANK_ISSUE='https://github.com/Blood63/gaming-tracker/issues/new?template=cod-rank.yml';
const SETUP_ISSUE='https://github.com/Blood63/gaming-tracker/issues/new?template=setup.yml';
const RTIERS=['Recrue','Régulier','Vaillant','Élite','Pro','Maître','Grand maître','Légendaire'],RICON=['🔰','🥉','🥈','🥇','💎','💠','👑','🔥'];
const codBtn=(cls='')=>`<a class="btn ${cls}" href="${ISSUE}" target="_blank" rel="noopener">📸 Ajouter une partie COD</a>`;

/* ========== données ========== */
const D={};
async function load(){
  const [steamH,store,val,rl,cod,codp,codr,setup,vh,gj,rlm]=await Promise.all([jl('history/steam.jsonl'),get('store.json'),jl('history/valorant.jsonl'),jl('history/rocket_league.jsonl'),get('cod_mobile.json'),get('cod_profile.json'),get('cod_ranks.json'),get('setup.json'),get('valorant.json'),get('goals.json'),get('rocket_league.json')]);
  D.steamH=steamH.filter(x=>x.games&&x.games.length);D.steam=D.steamH.at(-1)||null;D.store=(store&&store.apps)||{};D.storeAt=store&&store.fetched_at;
  D.val=val;D.rl=rl;D.cod=((cod&&cod.matches)||[]).filter(m=>m.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
  D.games=(D.steam?.games||[]).map(g=>{const s=D.store[g.appid]||{};return{...g,st:s,pct:g.ach_total?Math.round(100*(g.ach_unlocked||0)/g.ach_total):null,
    img:s.header_image||`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,genres:s.genres||[],last:g.rtime_last_played?g.rtime_last_played*1000:null}});
  D.codP=((codp&&codp.history)||[]).sort((a,b)=>a.date<b.date?-1:1);D.cp=D.codP.at(-1)||null;
  D.ranks={MP:(codr?.MP||[]).slice().sort((a,b)=>a.date<b.date?-1:1),BR:(codr?.BR||[]).slice().sort((a,b)=>a.date<b.date?-1:1)};
  D.setup=setup;D.vh=vh&&vh.mmr?vh:null;D.goals=(gj&&gj.goals)||[];D.rlm=rlm&&rlm.playlists?rlm:null;
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
const GK='gt-goals',PK='gt-pending',SK='gt-sync-at',GOAL_ISSUE='https://github.com/Blood63/gaming-tracker/issues/new?template=objectif.yml';
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
const syncURL=()=>{const u=unsynced(),n=u.adds.length+u.dels.length;if(!n)return null;
  const data=u.dels.length&&!u.adds.length?{action:'delete',ids:u.dels}:{action:'sync',goals:u.adds.map(gClean),...(u.dels.length?{delete:u.dels}:{})};
  const resume=[u.adds.length?`ajouter ${u.adds.length} objectif${u.adds.length>1?'s':''}`:'',u.dels.length?`supprimer ${u.dels.length} objectif${u.dels.length>1?'s':''}`:''].filter(Boolean).join(' et ');
  return `${GOAL_ISSUE}&title=${encodeURIComponent('Objectifs – '+resume)}&resume=${encodeURIComponent(resume)}&data=${encodeURIComponent(JSON.stringify(data))}`};
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
   <a class="btn full" id="gsync" href="${esc(syncURL())}" target="_blank" rel="noopener">🔄 Synchroniser (GitHub)</a></div>`}
function bindSync(){const a=$('#gsync');if(a)a.onclick=()=>{LS.set(SK,Date.now());toast('📝 Valide le formulaire GitHub (« Create ») pour terminer')};
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
const COD_SUB=['I','II','III','IV','V'];
const codLbl=v=>{const t=Math.floor((v-1)/5),sub=(v-1)%5;return RTIERS[t]?(t==7?RTIERS[t]:RTIERS[t]+' '+COD_SUB[sub]):'?'};
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
  if(x.type=='cod_rank'){const a=D.ranks[x.mode]||[],c=a.at(-1),lab=`COD Mobile ${x.mode=='BR'?'Battle Royale':'Multijoueur'} : ${codLbl(x.target)}`;
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
  let h=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,#ff465566,transparent 65%)"><div class="ttl" style="display:flex;gap:.8rem;align-items:center">${A.card?`<img src="${esc(A.card)}" alt="" style="width:56px;height:56px;border-radius:12px;position:static">`:''}<div><h3>Valorant</h3><span class="pill">${esc(A.name)}#${esc(A.tag)}</span><span class="pill">Niv. ${fnum(A.level)}</span><span class="pill">${esc((A.region||'').toUpperCase())}</span></div></div></div>
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
  h+=`<h2>Parties récentes</h2><p class="mut" style="font-size:.8rem">Touche une partie pour le détail.</p><div class="glass tbl"><table><tr><th>Date</th><th>Mode</th><th>Carte</th><th>Agent</th><th>Rés.</th><th>Score</th><th>K/D/A</th><th>RR</th></tr>${m.slice().reverse().slice(0,40).map(x=>`<tr data-v="${esc(x.id)}" style="cursor:pointer"><td>${fdate(x.date)}</td><td>${esc(vMode(x.mode))}</td><td>${esc(x.map||'—')}</td><td>${esc(x.agent||'—')}</td><td>${vRes(x)}</td><td>${x.rounds_won??'—'}-${x.rounds_lost??'—'}</td><td>${x.kills??'—'}/${x.deaths??'—'}/${x.assists??'—'}</td><td class="${x.rr_change>0?'up':x.rr_change<0?'down':''}">${x.rr_change!=null?(x.rr_change>0?'+':'')+x.rr_change:''}</td></tr>`).join('')}</table></div>
  <p class="mut" style="font-size:.78rem">Source : ${esc(V.source)} · relevé le ${fdate(V.fetched_at)} · mis à jour 2 fois par jour. ADR/ACS/HS % = calculés.</p>`;
  const nx=[1,3].map(k=>VAL_T.find(t=>t.id==Math.min(27,M.tier_id+k))).filter(Boolean);
  h=h.replace('<h2>Statistiques</h2>',goalsBlock(['val_rank'])+`<div class="seg" style="margin-top:.5rem">${nx.map(t=>`<button data-vg="${t.id}">🎯 ${esc(vTier(t.n))}</button>`).join('')}</div><h2>Statistiques</h2>`);
  app.innerHTML=h;bindGoalDel(valPage);animBars();
  $$('[data-vg]').forEach(b=>b.onclick=()=>{if(addGoal({type:'val_rank',target:+b.dataset.vg,start:(M.tier_id-3)*100+(M.rr||0)}))valPage()});
  $$('#vq button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('valQ',b.dataset.q);valPage()});
  $$('tr[data-v]').forEach(r=>r.onclick=()=>go('#/valorant/'+r.dataset.v));
  chart($('#v1'),{type:'line',data:{labels:H.map(x=>fshort(x.date)),datasets:[lineDS('Points de rang (elo)',H.map(x=>x.elo),'#ff4655')]},options:{plugins:{legend:{display:false},title:{display:true,text:'Elo (100 = 1 palier) — dernières parties classées'},tooltip:{callbacks:{label:c=>`${vTier(H[c.dataIndex].tier)} · ${H[c.dataIndex].rr} RR (${H[c.dataIndex].change>0?'+':''}${H[c.dataIndex].change})`}}}}});
  chart($('#v2'),{type:'bar',data:{labels:M.seasons.map(s=>(s.season||'').toUpperCase()),datasets:[{label:'Victoires %',data:M.seasons.map(s=>s.games?100*s.wins/s.games:null),backgroundColor:'#ff465599',borderRadius:6}]},options:{scales:{y:{min:0,max:100}},plugins:{legend:{display:false},title:{display:true,text:'Taux de victoire par acte (%)'}}}});
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
function rlManual(){
  const R=D.rlm,P=R.playlists,H=R.mmr_history,pf=R.performance||{};
  let h=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,#3b82f666,transparent 65%)"><div class="ttl"><h3>Rocket League</h3><span class="pill">${esc(R.player)} · ${esc(R.platform)}</span><span class="pill">${esc(R.season)}</span>${R.reward_level?`<span class="pill">Récompenses : ${esc(R.reward_level)}</span>`:''}</div></div>
  <p class="mut" style="font-size:.8rem;margin-top:.5rem">📸 Source : captures tracker.gg, mise à jour manuelle (${fdate(R.updated)}). Relevé automatique dès que ballchasing.com sera connecté.</p>
  <h2>Rangs classés</h2><div class="list">${P.map(p=>`<div class="glass row" style="align-items:center"><span class="ic" style="font-size:1.8rem;width:44px;text-align:center">${rlIcon(p.tier)}</span><span class="n"><b>${esc(p.name)}</b><br><span style="font-size:1.05rem;font-weight:700">${esc(p.tier_name)} · div. ${RL_DIV[p.div-1]}</span><br><small class="mut">Meilleur : ${fnum(p.best_mmr)} MMR (${esc(p.best_season)})${p.matches?' · '+fnum(p.matches)+' parties':''}${p.percentile?' · '+esc(p.percentile):''}${p.streak?` · <span class="${p.streak.type=='loss'?'down':'up'}">série de ${p.streak.count} ${p.streak.type=='loss'?'défaites':'victoires'}</span>`:''}</small></span><span class="p" style="text-align:right"><b style="font-size:1.2rem">${fnum(p.mmr)}</b><br><small class="mut">MMR</small><br><small class="${p.mmr<p.best_mmr?'down':'up'}">${p.mmr-p.best_mmr} vs record</small></span></div>`).join('')}</div>
  <div class="stats" style="margin-top:.6rem">${(R.other||[]).map(o=>stat(o.name,o.mmr!=null?fnum(o.mmr):'≈ '+o.mmr_range.join('–'),o.note||'MMR')).join('')}</div>
  ${goalsBlock(['rl_rank'])}
  <div class="seg" style="margin-top:.5rem">${P.map(p=>`<button data-rg="${p.id}">🎯 ${esc(p.id)} → ${esc(RL_T[rlNext(p)])}</button>`).join('')}</div>
  <h2>Évolution du MMR (3v3)</h2><div class="glass chart"><canvas id="r1"></canvas></div>
  <h2>Sessions récentes</h2><div class="glass tbl"><table><tr><th>Date</th><th>Parties</th><th>Vict.</th><th>%</th><th>Buts / tirs</th><th>Passes</th><th>Arrêts</th><th>MMR</th></tr>${R.sessions.map(x=>`<tr><td>${fdate(x.date)}</td><td>${x.matches??(x.note?esc(x.note):'—')}</td><td>${x.wins??'—'}</td><td>${x.matches&&x.wins!=null?fnum(100*x.wins/x.matches,1)+' %':'—'}</td><td>${x.goals!=null?x.goals+' / '+x.shots:'—'}</td><td>${x.assists??'—'}</td><td>${x.saves??'—'}</td><td>${x.mmr?Object.entries(x.mmr).map(([k,v])=>`${k} ${v[0]}→${v[1]} <span class="${v[1]<v[0]?'down':'up'}">(${v[1]-v[0]>0?'+':''}${v[1]-v[0]})</span>`).join(' '):'—'}</td></tr>`).join('')}</table></div>
  <h2>Répartition des actions</h2><div class="two"><div class="glass chart"><canvas id="r2"></canvas></div><div class="glass pad"><div class="kv"><span>⚽ Buts</span><span>${fnum(pf.goals_pct,1)} %</span><span>🛡️ Arrêts</span><span>${fnum(pf.saves_pct,1)} %</span><span>🤝 Passes décisives</span><span>${fnum(pf.assists_pct,1)} %</span></div><p class="mut" style="font-size:.8rem;margin-top:.5rem">Part de chaque action dans tes contributions (tracker.gg). Profil plutôt offensif : tu marques plus que tu ne défends.</p></div></div>
  <p class="mut" style="font-size:.78rem">Source : captures tracker.gg, mise à jour manuelle. Les valeurs ≈ sont approximatives.</p>`;
  app.innerHTML=h;bindGoalDel(rlManual);animBars();
  $$('[data-rg]').forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id==b.dataset.rg);if(addGoal({type:'rl_rank',playlist:p.id,target:rlNext(p),div:1,start:rlVal(p.tier,p.div)}))rlManual()});
  chart($('#r1'),{type:'line',data:{labels:H.map(x=>fshort(x.date)+' · '+(x.note||'').replace('de session','')),datasets:[lineDS('MMR 3v3',H.map(x=>x.mmr),'#3b82f6'),lineDS('Record S38 (654)',H.map(()=>654),'#22c55e',{fill:false,borderDash:[6,4],pointRadius:0})]},options:{plugins:{title:{display:true,text:'MMR 3v3 (relevés des captures)'}}}});
  chart($('#r2'),{type:'doughnut',data:{labels:['Buts','Arrêts','Passes'],datasets:[{data:[pf.goals_pct,pf.saves_pct,pf.assists_pct],backgroundColor:['#3b82f6','#22c55e','#a855f7'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom'}}}});
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
  return `<a class="glass gcard" style="--c:var(--steam)" href="#/steam"><div class="t"><i></i>Steam</div><div class="big">${fnum(D.totalH,0)} h</div><div class="s">${D.games.length} jeux · niv. ${D.steam?.level??'—'}</div></a>
   <a class="glass gcard" style="--c:var(--val)" href="#/valorant"><div class="t"><i></i>Valorant</div><div class="big">${D.vh?vIcon(D.vh.mmr.tier_id,26)+' '+esc(vTier(D.vh.mmr.tier)):v?esc(vRank||'—'):'⏳'}</div><div class="s">${D.vh?fnum(D.vh.mmr.rr)+' RR · Blood#7629':v?'Blood#7629':trnStatus(D.val)}</div></a>
   <a class="glass gcard" style="--c:var(--rl)" href="#/rl"><div class="t"><i></i>Rocket League</div><div class="big">${r?fnum(rlBest)+' MMR':D.rlm?esc(D.rlm.playlists.find(p=>p.id=='3v3')?.tier_name||'—'):'⏳'}</div><div class="s">${r?'443Blood · Epic':D.rlm?'3v3 · '+fnum(D.rlm.playlists.find(p=>p.id=='3v3')?.mmr)+' MMR (manuel)':trnStatus(D.rl)}</div></a>
   <a class="glass gcard" style="--c:var(--cod)" href="#/cod"><div class="t"><i></i>COD Mobile</div><div class="big">${D.cod.length?'K/D '+fnum(ck,2):D.cp?'É/M '+fnum(D.cp.multiplayer?.kd,2):'📸'}</div><div class="s">${D.cod.length?D.cod.length+' parties suivies':D.cp?fnum((D.cp.multiplayer?.matches||0)+(D.cp.battle_royale?.matches||0))+' parties en carrière':'Envoie ta 1ʳᵉ capture'}</div></a>`;
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
  ${recent.length?`<h2>Joué récemment <a class="more" href="#/steam">Tout voir ›</a></h2><div class="grid">${recent.map(({g,r})=>gameCard(g,`${fnum(r.playtime_2weeks/60,1)} h / 2 sem.`)).join('')}</div>`:''}
  <h2>En bref</h2><div class="stats">${stat('Succès',`${D.ach}/${D.achT}`,D.achT?fnum(100*D.ach/D.achT,0)+' % débloqués':'')}${stat('Jeu favori',esc(D.games[0]?.name||'—'),D.games[0]?fnum(D.games[0].hours,1)+' h':'')}${stat('Jamais lancés',backlog.length,`sur ${D.games.length} jeux`)}${stat('Badges',`${badges().filter(b=>b.ok).length}/${badges().length}`,'<a href="#/profil">voir ›</a>')}</div>
  ${near.length?`<h2>Presque complétés</h2><div class="list">${near.map(g=>`<a class="glass row" href="#/steam/${g.appid}"><img src="${esc(g.img)}" alt="" loading="lazy"><span class="n"><b>${esc(g.name)}</b><br><small>${g.ach_unlocked}/${g.ach_total} succès</small>${bar(g.pct)}</span><span class="p">${g.pct} %</span></a>`).join('')}</div>`:''}
  <h2>Objectifs <a class="more" href="#/objectifs">Gérer ›</a></h2>${gl.length?`<div class="list">${gl.map(goalHTML).join('')}</div>`:`<a class="glass tile" style="--c:var(--vi)" href="#/objectifs"><span class="ic">🎯</span><span class="n"><b>Fixe-toi un objectif</b><small class="mut">heures, succès, K/D, niveau…</small></span><span class="chev">›</span></a>`}
  <h2>Activité récente <a class="more" href="#/activite">Tout voir ›</a></h2>${tlHTML(timeline().slice(0,5))}`;
  animBars();animRings();
}
function library(){
  const st=JSON.parse(sessionStorage.getItem('lib')||'{}');const q=st.q||'',f=st.f||'all',s=st.s||'hours';
  const genres=[...new Set(D.games.flatMap(g=>g.genres))].sort();
  app.innerHTML=`<div class="stats">${stat('Temps total',fnum(D.totalH,1)+' h')}${stat('Jeux',D.games.length,`${D.games.filter(g=>!g.hours&&!g.last).length} jamais lancés`)}${stat('Succès',`${D.ach}/${D.achT}`,D.achT?fnum(100*D.ach/D.achT,1)+' %':'')}${stat('Niveau Steam',D.steam?.level??'—')}</div>
  <h2>Bibliothèque</h2>
  <div class="tool"><label class="glass search">🔎<input id="q" type="search" placeholder="Rechercher un jeu…" value="${esc(q)}" autocomplete="off"></label>
  <select id="f" aria-label="Filtre"><option value="all">Tous</option><option value="playing">Joués</option><option value="never">Jamais lancés</option><option value="done">100 % succès</option><option value="dlc">Avec DLC</option>${genres.map(x=>`<option value="g:${esc(x)}">${esc(x)}</option>`).join('')}</select>
  <select id="s" aria-label="Tri"><option value="hours">Temps de jeu</option><option value="last">Dernière session</option><option value="pct">Succès %</option><option value="name">Nom</option><option value="meta">Metacritic</option></select></div>
  <div id="res" class="grid"></div>
  <h2>Complétion des succès</h2><div class="glass chart" style="height:${Math.max(220,D.games.filter(g=>g.ach_total).length*26)}px"><canvas id="c2"></canvas></div>
  <h2>Temps de jeu</h2><div class="glass chart"><canvas id="c1"></canvas></div>`;
  $('#f').value=f;$('#s').value=s;
  const draw=()=>{const q=$('#q').value.trim().toLowerCase(),f=$('#f').value,s=$('#s').value;sessionStorage.setItem('lib',JSON.stringify({q,f,s}));
    let g=D.games.filter(x=>!q||x.name.toLowerCase().includes(q));
    if(f=='playing')g=g.filter(x=>x.hours>0);if(f=='never')g=g.filter(x=>!x.hours&&!x.last);if(f=='done')g=g.filter(x=>x.ach_total&&x.pct==100);if(f=='dlc')g=g.filter(x=>x.st.dlc_count>0);if(f.startsWith('g:'))g=g.filter(x=>x.genres.includes(f.slice(2)));
    const k={hours:x=>-(x.hours||0),last:x=>-(x.last||0),pct:x=>-(x.pct??-1),name:x=>x.name.toLowerCase(),meta:x=>-(x.st.metacritic?.score||0)}[s];
    g.sort((a,b)=>{const A=k(a),B=k(b);return A<B?-1:A>B?1:0});
    $('#res').innerHTML=g.length?g.map(x=>gameCard(x,s=='last'?(x.last?ago(x.last):'jamais'):s=='meta'?(x.st.metacritic?'MC '+x.st.metacritic.score:'MC —'):undefined)).join(''):'<div class="glass empty" style="grid-column:1/-1">Aucun jeu ne correspond.</div>';animBars()};
  $('#q').oninput=draw;$('#f').onchange=draw;$('#s').onchange=draw;draw();
  const top=D.games.filter(x=>x.hours>0).slice(0,6);
  const H=D.steamH.filter((x,i,a)=>!i||x.fetched_at.slice(0,10)!=a[i-1].fetched_at.slice(0,10));
  if(H.length>1)chart($('#c1'),{type:'line',data:{labels:H.map(x=>fshort(x.fetched_at)),datasets:top.map((t,i)=>lineDS(t.name,H.map(s=>(s.games.find(y=>y.appid==t.appid)||{}).hours??null),PAL[i],{fill:false}))}});
  else chart($('#c1'),{type:'bar',data:{labels:top.map(x=>x.name.length>18?x.name.slice(0,17)+'…':x.name),datasets:[{label:'Heures',data:top.map(x=>x.hours),backgroundColor:top.map((_,i)=>PAL[i]+'aa'),borderRadius:8}]},options:{plugins:{legend:{display:false},title:{display:true,text:'Top jeux (h) — la courbe d\'évolution apparaîtra après le prochain relevé hebdo'}}}});
  const A=D.games.filter(x=>x.ach_total).sort((a,b)=>b.pct-a.pct);
  chart($('#c2'),{type:'bar',data:{labels:A.map(x=>x.name.length>22?x.name.slice(0,21)+'…':x.name),datasets:[{label:'Succès %',data:A.map(x=>x.pct),backgroundColor:A.map(x=>x.pct==100?COL.gr:x.pct>=50?COL.cy:COL.vi),borderRadius:6}]},options:{indexAxis:'y',scales:{x:{min:0,max:100}},plugins:{legend:{display:false}},onClick:(e,el)=>{if(el[0])go('#/steam/'+A[el[0].index].appid)}}});
}
function steamGame(id){
  const g=D.games.find(x=>x.appid==id);
  if(!g){app.innerHTML=`<div class="glass wait"><div class="ico">❓</div><h3>Jeu introuvable</h3><a class="btn" href="#/steam">Retour à la bibliothèque</a></div>`;return}
  const s=g.st,mc=s.metacritic,price=s.price?(s.price.discount?`<s style="color:var(--mut);font-size:.9rem">${esc(s.price.initial)}</s> `:'')+esc(s.price.text):'—';
  const hist=D.steamH.map(x=>({t:x.fetched_at,g:x.games.find(y=>y.appid==id)})).filter(x=>x.g).filter((x,i,a)=>!i||x.t.slice(0,10)!=a[i-1].t.slice(0,10));
  const hasGoal=goals().some(x=>x.appid==id);
  app.innerHTML=`<div class="cover"><img src="${esc(g.img)}" alt=""><div class="ttl"><h3>${esc(s.name||g.name)}</h3>${(s.genres||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div></div>
  <div class="stats">${stat('Temps de jeu',fnum(g.hours,1)+' h',g.last?'Dernière session : '+fdate(g.last):'Jamais lancé')}
  ${stat('Succès',g.ach_total?`${g.ach_unlocked||0}/${g.ach_total}`:'—',g.pct!=null?g.pct+' % '+bar(g.pct):'Pas de succès')}
  ${stat('Metacritic',mc?`<span style="color:${mc.score>=75?'var(--gr)':mc.score>=50?'var(--warn)':'var(--bad)'}">${mc.score}</span>`:'—',mc?.url?`<a href="${esc(mc.url)}" target="_blank" rel="noopener">voir la critique ›</a>`:'Pas de note')}
  ${stat('Prix actuel',price,s.price?.discount?`<span class="up">-${s.price.discount} % en promo</span>`:'Boutique Steam FR')}</div>
  <div class="tool" style="margin-top:.8rem"><a class="btn alt" href="${esc(s.url||`https://store.steampowered.com/app/${id}/`)}" target="_blank" rel="noopener">🛒 Page Steam</a>
  ${g.ach_total&&g.pct<100?`<button class="btn ghost" id="gA" ${hasGoal?'disabled':''}>🎯 ${hasGoal?'Objectif en cours':'Objectif 100 % succès'}</button>`:''}</div>
  ${s.short_description?`<h2>Description</h2><div class="glass desc">${esc(s.short_description)}</div>`:''}
  <h2>Infos</h2><div class="glass kv"><span>Développeur</span><span>${esc((s.developers||[]).join(', ')||'—')}</span><span>Éditeur</span><span>${esc((s.publishers||[]).join(', ')||'—')}</span><span>Sortie</span><span>${esc(s.release_date||'—')}</span><span>Catégories</span><span>${(s.categories||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')||'—'}</span></div>
  ${(s.screenshots||[]).length?`<h2>Captures</h2><div class="shots">${s.screenshots.map((u,i)=>`<img loading="lazy" src="${esc(u)}" data-full="${esc((s.screenshots_full||[])[i]||u)}" alt="">`).join('')}</div>`:''}
  <h2>Progression</h2>${hist.length>1?`<div class="glass chart"><canvas id="c1"></canvas></div>`:`<div class="glass empty">📈 La courbe de progression apparaîtra après le prochain relevé (chaque dimanche 20 h).</div>`}
  <h2>DLC (${s.dlc_count??0})</h2>${(s.dlc||[]).length?`<div class="list">${s.dlc.map(d=>`<a class="glass row" href="${esc(d.url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(d.image||g.img)}" alt=""><span class="n">${esc(d.name||'DLC '+d.appid)}${d.release?`<br><small>${esc(d.release)}</small>`:''}</span><span class="p">${d.price?(d.price.discount?`<s>${esc(d.price.initial)}</s>`:'')+esc(d.price.text):'<small class="mut">—</small>'}</span></a>`).join('')}</div>${s.dlc_count>s.dlc.length?`<p class="pill">+${s.dlc_count-s.dlc.length} autres sur la boutique</p>`:''}`:`<div class="glass empty">${s.name?'Aucun DLC pour ce jeu.':'Données boutique indisponibles.'}</div>`}`;
  $$('.shots img').forEach(i=>i.onclick=()=>lb(i.dataset.full));
  const b=$('#gA');if(b)b.onclick=()=>{addGoal({type:'game_ach',appid:id,target:100});b.disabled=true;b.textContent='🎯 Objectif en cours'};
  if(hist.length>1)chart($('#c1'),{data:{labels:hist.map(x=>fshort(x.t)),datasets:[{type:'line',...lineDS('Heures',hist.map(x=>x.g.hours),COL.cy)},{type:'line',...lineDS('Succès',hist.map(x=>x.g.ach_unlocked??null),COL.vi,{fill:false,yAxisID:'y2'})}]},options:{scales:{y2:{position:'right',grid:{display:false}}}}});
  animBars();
}
function compet(){
  app.innerHTML=`<h2>Jeux compétitifs</h2><div class="list">
   ${[['valorant','🎯','Valorant',D.vh?'Blood#7629 · HenrikDev':'Blood#7629 · tracker.gg',D.vh||D.vOk.length?'Connecté':trnStatus(D.val),'var(--val)'],['rl','🚗','Rocket League',D.rlm&&!D.rOk.length?'443Blood · Epic · captures tracker.gg':'443Blood · Epic · tracker.gg',D.rOk.length?'Connecté':D.rlm?'Saisie manuelle':trnStatus(D.rl),'var(--rl)'],['cod','🔫','Call of Duty Mobile','Capture d\'écran après chaque partie',D.cod.length?D.cod.length+' parties':'Aucune partie','var(--cod)']]
    .map(([r,i,n,d,s,c])=>`<a class="glass tile" style="--c:${c}" href="#/${r}"><span class="ic">${i}</span><span class="n"><b>${n}</b><small class="mut">${d}</small></span><span class="pill ${/Connecté|parties|manuelle/.test(s)?'ok':'warn'}">${esc(s)}</span><span class="chev">›</span></a>`).join('')}</div>
   <div style="margin-top:1rem">${codBtn('full')}</div>
   <h2>Comment ça marche</h2><div class="glass desc"><b>Valorant</b> : relevé automatique 2 fois par jour via l'API HenrikDev (non officielle) : rang, RR, parties et détails.<br><br><b>Rocket League</b> : relevé chaque dimanche à 20 h via l'API Tracker Network (dès que la clé est acceptée).<br><br><b>COD Mobile</b> : appuie sur « Ajouter une partie », glisse la capture du tableau des scores, valide. Les stats sont lues automatiquement et un commentaire te confirme les valeurs (tu peux les corriger en modifiant la demande).</div>`;
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
    app.innerHTML=h+`<div class="glass wait"><div class="ico">🔑</div><h3>En attente de clé Tracker Network</h3><p class="mut">Les stats (rangs, MMR, K/D, % de victoire…) s'afficheront ici automatiquement dès que l'API tracker.gg acceptera la clé. Relevé chaque dimanche à 20 h.</p>
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
function cod(){
  let m=D.cod;
  let h=`<div class="cover glass solid" style="background:radial-gradient(120% 120% at 0 0,#f59e0b66,transparent 65%)"><div class="ttl"><h3>Call of Duty Mobile</h3><span class="pill">Saisie par capture d'écran</span></div></div>${codBtn('full')}`;
  h+=ranksHTML()+goalsBlock(['cod_rank'],'Objectifs de rang')+career();
  const tf=sessionStorage.getItem('codType')||'all',all=m;
  h+=`<h2>Parties enregistrées</h2><div class="seg" id="tseg">${[['all','Tout'],['MP','Multijoueur'],['BR','Battle Royale']].map(([k,n])=>`<button class="${k==tf?'on':''}" data-t="${k}">${n} (${k=='all'?all.length:all.filter(x=>(x.type||'MP')==k).length})</button>`).join('')}</div>`;
  if(tf!='all')m=all.filter(x=>(x.type||'MP')==tf);
  if(!m.length){app.innerHTML=h+`<div class="glass wait"><div class="ico">📸</div><h3>Aucune partie pour l'instant</h3><p class="mut">Après chaque partie, envoie la capture du tableau des scores : les stats sont lues automatiquement et apparaissent ici (K/D, tendances, taux de victoire, moyennes par mode, comparaison hebdo).</p></div>
   <h2>Aperçu</h2><div class="stats ghost">${['Parties','K/D','Victoires %','Élim. moy.'].map(k=>stat(k,'000')).join('')}</div>`;careerCharts();codBind();bindGoalDel(cod);animBars();return}
  const lab=m.map(x=>fshort(x.date)),kd=m.map(x=>num(x.kd)??(num(x.kills)!=null&&num(x.deaths)!=null?(x.deaths?x.kills/x.deaths:x.kills):null)),roll=m.map((_,i)=>kdOf(m.slice(Math.max(0,i-9),i+1)));
  const now=Date.now(),DAY=864e5,w1=m.filter(x=>now-new Date(x.date)<7*DAY),w0=m.filter(x=>{const t=now-new Date(x.date);return t>=7*DAY&&t<14*DAY});
  const modes={};m.forEach(x=>(modes[x.mode||'Inconnu']??=[]).push(x));
  const row=(n,fn,d)=>{const a=fn(w1),b=fn(w0),dl=a!=null&&b!=null?a-b:null;return `<tr><td>${n}</td><td>${fnum(a,d)}</td><td>${fnum(b,d)}</td><td class="${dl>0?'up':dl<0?'down':''}">${dl==null?'—':(dl>0?'▲ +':dl<0?'▼ ':'')+fnum(dl,d)}</td></tr>`};
  const isBR=tf=='BR';
  h+=`<div class="stats">${stat('Parties',m.length)}${m.some(x=>x.placement!=null)?stat('Classement moy. (BR)',fnum(avg(m,'placement'),1),'Top 1 : '+m.filter(x=>x.placement==1).length):''}${m.some(x=>x.damage!=null)?stat('Dégâts moy.',fnum(avg(m,'damage'),0)):''}${stat('K/D global',fnum(kdOf(m),2),'10 dern. : '+fnum(roll.at(-1),2))}${stat('Victoires',fnum(wr(m),0)+' %')}${stat('Élim. moy.',fnum(avg(m,'kills'),1),'Morts moy. '+fnum(avg(m,'deaths'),1))}${stat('Précision moy.',avg(m,'accuracy_pct')!=null?fnum(avg(m,'accuracy_pct'),1)+' %':'—')}${stat('Impact moy.',fnum(avg(m,'impact'),0))}${stat('Dégâts / manche',fnum(avg(m,'avg_damage_per_round'),0),'moyenne')}${stat('Premières élim.',fnum(sum(m,'first_kills')),'total')}</div>
  <a class="glass tile" style="--c:var(--cod);margin-top:.7rem" href="#/cod/modes"><span class="ic">📊</span><span class="n"><b>Stats par mode</b><small class="mut">MJ par mode et carte · BR par format et carte</small></span><span class="chev">›</span></a>
  <p class="mut" style="font-size:.8rem">Touche une partie de l'historique pour voir le détail (duels, médailles…).</p>
  <div class="glass chart"><canvas id="c1"></canvas></div><div class="two"><div class="glass chart"><canvas id="c2"></canvas></div><div class="glass chart"><canvas id="c4"></canvas></div></div><div class="glass chart"><canvas id="c3"></canvas></div>
  <h2>7 derniers jours vs 7 précédents</h2><div class="glass tbl"><table><tr><th></th><th>7 j</th><th>Avant</th><th>Écart</th></tr>${row('Parties',a=>a.length,0)+row('K/D',kdOf,2)+row('Élim. moy.',a=>avg(a,'kills'),1)+row('Morts moy.',a=>avg(a,'deaths'),1)+row('Score moy.',a=>avg(a,'score'),0)+row('Victoires %',wr,0)}</table></div>
  <h2>Par mode</h2><div class="glass tbl"><table><tr><th>Mode</th><th>Parties</th><th>K/D</th><th>Élim.</th><th>Morts</th><th>Score</th><th>Vict.</th></tr>${Object.entries(modes).map(([k,a])=>`<tr><td>${esc(k)}</td><td>${a.length}</td><td>${fnum(kdOf(a),2)}</td><td>${fnum(avg(a,'kills'),1)}</td><td>${fnum(avg(a,'deaths'),1)}</td><td>${fnum(avg(a,'score'),0)}</td><td>${fnum(wr(a),0)} %</td></tr>`).join('')}</table></div>
  <h2>Historique</h2><div class="glass tbl"><table><tr><th>Date</th><th>Type</th><th>Mode</th><th>Carte</th><th>Rés.</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th></th></tr>${m.slice().reverse().map(x=>`<tr data-m="${m.indexOf(x)}" style="cursor:pointer"><td>${fdate(x.date)}</td><td>${x.type=='BR'?'BR':'MJ'}</td><td>${esc(x.mode||'—')}${x.placement!=null?' · #'+x.placement:''}</td><td>${esc(x.map||'—')}</td><td>${x.type=='BR'?(x.placement!=null?(x.placement==1?'🏆':'')+'#'+x.placement:'—'):{win:'✅',loss:'❌',draw:'➖'}[x.result]||'—'}</td><td>${x.kills??'—'}</td><td>${x.deaths??'—'}</td><td>${x.assists??'—'}</td><td>${fnum(num(x.kd),2)}</td><td>${x.screenshot?`<button class="btn ghost sm" data-s="${esc(x.screenshot)}">🖼️</button>`:''}${x.issue?` <a href="https://github.com/Blood63/gaming-tracker/issues/${x.issue}" target="_blank" rel="noopener">#${x.issue}</a>`:''}</td></tr>`).join('')}</table></div>`;
  app.innerHTML=h;careerCharts();codBind();bindGoalDel(cod);animBars();$$('[data-s]').forEach(b=>b.onclick=e=>{e.stopPropagation();lb(b.dataset.s)});$$('tr[data-m]').forEach(r=>r.onclick=e=>{if(!e.target.closest('a'))go('#/cod/'+D.cod.indexOf(m[+r.dataset.m]))});
  chart($('#c1'),{type:'line',data:{labels:lab,datasets:[lineDS('K/D par partie',kd,COL.or,{fill:false,showLine:false,pointRadius:5}),lineDS('Moyenne glissante (10)',roll,COL.cy)]},options:{plugins:{title:{display:true,text:'K/D'}}}});
  chart($('#c2'),{type:'line',data:{labels:lab,datasets:[lineDS('Éliminations',m.map(x=>num(x.kills)),COL.gr,{fill:false}),lineDS('Morts',m.map(x=>num(x.deaths)),COL.bad,{fill:false})]},options:{scales:{y:{beginAtZero:true}},plugins:{title:{display:true,text:'Éliminations / morts'}}}});
  chart($('#c4'),{type:'line',data:{labels:lab,datasets:[lineDS('Score',m.map(x=>num(x.score)),COL.vi)]},options:{plugins:{legend:{display:false},title:{display:true,text:'Score par partie'}}}});
  chart($('#c3'),{type:'line',data:{labels:lab,datasets:[lineDS('Cumulé %',m.map((_,i)=>wr(m.slice(0,i+1))),COL.pk),lineDS('10 dernières %',m.map((_,i)=>wr(m.slice(Math.max(0,i-9),i+1))),COL.cy,{fill:false})]},options:{scales:{y:{min:0,max:100}},plugins:{title:{display:true,text:'Taux de victoire'}}}});
}
const eur=v=>v==null?'—':Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const SICON={cpu:'🧠',mb:'🧩',ram:'💾',ssd:'💽',gpu:'🎴',cooler:'❄️',psu:'🔌',case:'🗄️',wifi:'📶',build:'🔧',kb:'⌨️',mouse:'🖱️',pad:'🎮',padpack:'🎒',phone:'📱'};
const scCol=v=>v>=9?'var(--gr)':v>=7?'var(--cy)':v>=5?'var(--warn)':'var(--bad)';
function setupPage(){
  const S=D.setup;if(!S){app.innerHTML='<div class="glass wait"><div class="ico">🖥️</div><h3>Setup indisponible</h3></div>';return}
  const cats=S.categories.filter(c=>S.items.some(i=>i.cat==c.id)),tot=S.items.reduce((a,i)=>a+(i.price||0),0),unk=S.items.filter(i=>i.price==null).length;
  const g=S.groups?.pc,ct=c=>S.items.filter(i=>i.cat==c).reduce((a,i)=>a+(i.price||0),0);
  const link=i=>i.url||'https://www.idealo.fr/prechcat.html?q='+encodeURIComponent(i.name);
  const card=i=>`<div class="glass row" style="align-items:flex-start"><span class="ic" style="font-size:1.6rem;width:44px;text-align:center;flex:none">${SICON[i.id]||S.categories.find(c=>c.id==i.cat)?.icon||'📦'}</span><span class="n"><b>${esc(i.name)}</b>${i.to_confirm?' <span class="pill warn">à confirmer</span>':''}${i.spec?`<br><small>${esc(i.spec)}</small>`:''}${i.notes?`<br><small class="mut">${esc(i.notes)}</small>`:''}${i.date?`<br><small class="mut">Acheté le ${fdate(i.date)}</small>`:''}${i.value_score!=null||i.quality_score!=null?`<br><span style="display:inline-flex;gap:.35rem;flex-wrap:wrap;margin-top:.2rem">${i.quality_score!=null?`<span class="pill" style="color:${scCol(i.quality_score)};border-color:${scCol(i.quality_score)}66">⭐ Qualité ${i.quality_score}/10</span>`:''}${i.value_score!=null?`<span class="pill" style="color:${scCol(i.value_score)};border-color:${scCol(i.value_score)}66">💶 Qualité-prix ${i.value_score}/10</span>`:''}</span>`:''}${i.quality_note?`<small class="mut" style="display:block;line-height:1.3"><b>Qualité :</b> ${esc(i.quality_note)}</small>`:''}${i.value_note?`<small class="mut" style="display:block;line-height:1.3"><b>Prix :</b> ${esc(i.value_note)}</small>`:''}${i.tip?`<small style="display:block;line-height:1.3;margin-top:.25rem;color:var(--cy)">💡 ${esc(i.tip)}</small>`:''}<br><a href="${esc(link(i))}" target="_blank" rel="noopener" style="font-size:.82rem">${i.url?'Voir le produit ›':'Comparer les prix ›'}</a></span><span class="p">${i.price!=null?eur(i.price):'<small class="mut">prix ?</small>'}</span></div>`;
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
  app.innerHTML=`<h2>Multijoueur — par mode (${mp.length})</h2>${mp.length?`<div class="glass chart"><canvas id="m1"></canvas></div><div class="glass tbl" style="margin-top:.7rem"><table><tr><th>Mode</th><th>Parties</th><th>K/D</th><th>Élim.</th><th>Morts</th><th>Score</th><th>Impact</th><th>Précision</th><th>Vict.</th><th>MVP</th></tr>${mpG.map(mpRow).join('')}</table></div>
  <h2>Multijoueur — par carte</h2><div class="glass tbl"><table><tr><th>Carte</th><th>Parties</th><th>K/D</th><th>Élim.</th><th>Morts</th><th>Score</th><th>Impact</th><th>Précision</th><th>Vict.</th><th>MVP</th></tr>${grp(mp,x=>x.map).map(mpRow).join('')}</table></div>`:'<div class="glass empty">Aucune partie multijoueur.</div>'}
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
  <div class="stats">${stat('É / M / A',`${x.kills??'—'} / ${x.deaths??'—'} / ${x.assists??'—'}`,'K/D '+fnum(num(x.kd),2))}${x.type=='BR'?'':stat('Score',fnum(x.score),x.team_place?`${x.team_place}ᵉ / ${x.team_size||'?'} de l'équipe`:'')}${x.impact!=null?stat('Impact',fnum(x.impact)):''}${stat('Précision',x.accuracy_pct!=null?fnum(x.accuracy_pct,1)+' %':'—',x.headshot_pct!=null?'Tête : '+fnum(x.headshot_pct,1)+' %':'')}
  ${x.type=='BR'||x.placement!=null?stat('Classement',x.placement!=null?'#'+x.placement+(x.total_teams?'<small class="mut">/'+x.total_teams+'</small>':''):'—',x.survival_time?'Survie : '+esc(x.survival_time):'')+stat('Dégâts',fnum(x.damage))+(x.revives!=null?stat('Réanimations',fnum(x.revives)):'')+(x.distance!=null?stat('Distance',fnum(x.distance)+' m'):'')+(x.talent!=null?stat('Talents utilisés',fnum(x.talent)):''):''}${x.avg_damage_per_round!=null?stat('Dégâts / manche',fnum(x.avg_damage_per_round)):''}${x.first_kills!=null?stat('Premières élim.',fnum(x.first_kills)):''}${x.lone_wolf_wins!=null?stat('Loup solitaire',fnum(x.lone_wolf_wins),'victoires'):''}${stat('EXP gagnée',fnum(x.xp_gained),x.rank_xp!=null?'EXP de grade : '+fnum(x.rank_xp):'')}</div>
  ${(x.duels||[]).length?`<h2>Duels</h2><div class="list">${x.duels.map(o=>{const t=o.kills+o.deaths,p=t?100*o.kills/t:50;return `<div class="glass goal"><div class="h"><b>vs ${esc(o.opponent)}</b><span class="${o.kills>o.deaths?'up':o.kills<o.deaths?'down':'mut'}">${o.kills} – ${o.deaths}</span></div><div class="bar ${o.kills>=o.deaths?'gr':''}"><i data-w="${t?p:0}"></i></div></div>`}).join('')}</div><p class="mut" style="font-size:.78rem">Mes éliminations – ses éliminations sur moi.</p>`:''}
  ${(x.medals||[]).length?`<h2>Médailles</h2><div class="badges">${x.medals.map(o=>`<div class="glass bdg"><div class="e">🏅</div><b>${esc(o.name)}</b>${o.count!=null?`<small class="mut">× ${o.count}</small>`:''}</div>`).join('')}</div>`:''}
  ${(x.screenshots||(x.screenshot?[x.screenshot]:[])).length?`<h2>Captures</h2><div class="shots">${(x.screenshots||[x.screenshot]).map(u=>`<img loading="lazy" src="${esc(u)}" data-full="${esc(u)}" alt="">`).join('')}</div>`:''}
  ${x.ocr_notes?.length?`<p class="pill warn">${esc(x.ocr_notes.join(' · '))}</p>`:''}`;
  $$('.shots img').forEach(i=>i.onclick=()=>lb(i.dataset.full));animBars();
}
function codBind(){rankChart();$$('#tseg button').forEach(b=>b.onclick=()=>{sessionStorage.setItem('codType',b.dataset.t);const y=scrollY;render();scrollTo(0,y)})}
function ranksHTML(){
  const card=(k,n)=>{const a=D.ranks[k],c=a.at(-1),pv=a.at(-2),best=a.reduce((b,x)=>!b||x.value>b.value?x:b,null);
    return `<div class="glass stat"><div class="k">${n}</div>${c?`<div class="v">${RICON[RTIERS.indexOf(c.tier)]||'🎖️'} ${esc(c.label)}</div><div class="d">${c.points!=null?fnum(c.points)+' pts · ':''}${fdate(c.date)}${pv?` · <span class="${c.value>pv.value?'up':c.value<pv.value?'down':''}">${c.value>pv.value?'▲':c.value<pv.value?'▼':'='} depuis ${esc(pv.label)}</span>`:''}</div>${best&&best!==c?`<div class="d">Meilleur suivi : ${esc(best.label)}</div>`:''}`:`<div class="v mut" style="font-size:1rem">Aucun rang enregistré</div>`}</div>`};
  const any=D.ranks.MP.length||D.ranks.BR.length;
  return `<h2>Rang classé</h2><div class="stats" style="grid-template-columns:repeat(2,1fr)">${card('MP','Multijoueur')}${card('BR','Battle Royale')}</div>
  <div style="margin-top:.6rem"><a class="btn ghost full" href="${RANK_ISSUE}" target="_blank" rel="noopener">🎖️ Enregistrer un changement de rang</a></div>
  ${any?`<div class="glass chart"><canvas id="crk"></canvas></div><div class="glass tbl" style="margin-top:.7rem"><table><tr><th>Date</th><th>Mode</th><th>Rang</th><th>Points</th><th>Saison</th></tr>${[...D.ranks.MP.map(x=>({...x,m:'MJ'})),...D.ranks.BR.map(x=>({...x,m:'BR'}))].sort((a,b)=>a.date<b.date?1:-1).map(x=>`<tr><td>${fdate(x.date)}</td><td>${x.m}</td><td>${RICON[RTIERS.indexOf(x.tier)]||''} ${esc(x.label)}</td><td>${fnum(x.points)}</td><td>${esc(x.season||'—')}</td></tr>`).join('')}</table></div>`:''}`;
}
function rankChart(){
  if(!$('#crk'))return;const lbl=v=>{const t=Math.floor((v-1)/5),sub=(v-1)%5;return RTIERS[t]?(t==7?RTIERS[t]:RTIERS[t]+' '+['I','II','III','IV','V'][sub]):''};
  chart($('#crk'),{type:'line',data:{datasets:[['MP','Multijoueur',COL.cy],['BR','Battle Royale',COL.gr]].filter(([k])=>D.ranks[k].length).map(([k,n,c])=>lineDS(n,D.ranks[k].map(x=>({x:new Date(x.date).getTime(),y:x.value,l:x.label})),c,{fill:false,stepped:true,pointRadius:5}))},
   options:{parsing:true,scales:{x:{type:'linear',ticks:{callback:v=>fshort(v),maxTicksLimit:6}},y:{ticks:{callback:lbl,stepSize:5}}},plugins:{title:{display:true,text:'Évolution du rang'},tooltip:{callbacks:{title:i=>fdate(i[0].raw.x),label:i=>` ${i.dataset.label} : ${i.raw.l}`}}}}});
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
  const x=D.xp,T=tastes(),B=badges(),top=T.genres.slice(0,8),tot=top.reduce((a,g)=>a+g[1],0)||1;
  const fav=Object.entries(T.styles).sort((a,b)=>b[1]-a[1])[0];
  app.innerHTML=`${levelCard(false)}
  <div class="tiers">${TIERS.map(t=>`<div class="${t===x.tier?'cur':x.L>=t.l?'done':''}"><span>${t.e}</span>${t.n}<br><small>niv. ${t.l}</small></div>`).join('')}</div>
  <h2>D'où vient ton XP</h2><div class="glass xp">${x.src.map(s=>`<span>${s[0]}<br><small>${esc(s[1])}</small></span><b>${fnum(s[2])}</b>`).join('')}<span><b style="color:var(--txt);text-align:left">Total</b></span><b>${fnum(x.xp)} XP</b></div>
  <h2>Tes styles de jeu</h2>${fav&&fav[1]>0?`<p class="mut" style="margin:.2rem 0 .6rem">Style dominant : <b style="color:var(--cy)">${esc(fav[0])}</b> · genre n°1 : <b style="color:var(--vi)">${esc(top[0]?.[0]||'—')}</b> (${fnum(100*(top[0]?.[1]||0)/tot,0)} % du temps)</p>`:''}
  <div class="two"><div class="glass chart sq"><canvas id="c1"></canvas></div><div class="glass chart sq"><canvas id="c2"></canvas></div></div>
  <p class="mut" style="font-size:.8rem">Pondéré par le temps de jeu, d'après les genres de la boutique Steam.${T.notes.length?' '+esc(T.notes.join(' · '))+'.':''}</p>
  <h2>Badges (${B.filter(b=>b.ok).length}/${B.length})</h2><div class="badges">${B.map(b=>`<div class="glass bdg ${b.ok?'':'lock'}"><div class="e">${b.e}</div><b>${esc(b.n)}</b><small class="mut">${esc(b.d)}</small>${b.ok?'<small class="up">Débloqué ✓</small>':bar(b.p)}</div>`).join('')}</div>
  <h2>Plus</h2><div class="list"><a class="glass tile" style="--c:var(--cy)" href="#/activite"><span class="ic">🕒</span><span class="n"><b>Activité</b><small class="mut">Chronologie de tes sessions et progrès</small></span><span class="chev">›</span></a>
  <a class="glass tile" style="--c:var(--vi)" href="#/objectifs"><span class="ic">🎯</span><span class="n"><b>Objectifs</b><small class="mut">${goals().length} en cours</small></span><span class="chev">›</span></a>
  <a class="glass tile" style="--c:var(--gr)" href="https://github.com/Blood63/gaming-tracker" target="_blank" rel="noopener"><span class="ic">⚙️</span><span class="n"><b>Données & automatisation</b><small class="mut">Dépôt GitHub, relevé chaque dimanche 20 h</small></span><span class="chev">›</span></a></div>`;
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
    const c=(D.ranks[$('#gcms').value]||[]).at(-1)?.value||1;let o='';for(let v=1;v<=36;v++)o+=`<option value="${v}"${v==Math.min(36,c+1)?' selected':''}>${codLbl(v)}</option>`;return o};
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
  app.innerHTML=`<h2>Activité</h2><div class="seg"><button class="on" data-f="all">Tout</button><button data-f="🕹️">Sessions</button><button data-f="⏱️">Temps</button><button data-f="🏆">Succès</button><button data-f="cod">COD</button></div><div id="tlv"></div>`;
  const draw=f=>{$('#tlv').innerHTML=tlHTML(f=='all'?ev:f=='cod'?ev.filter(e=>e.link=='#/cod'):ev.filter(e=>e.i==f));$$('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.f==f))};
  $$('.seg button').forEach(b=>b.onclick=()=>draw(b.dataset.f));draw('all');
}

/* ========== routeur ========== */
const TITLES={'':'GameTrack',setup:'Mon setup',steam:'Bibliothèque',compet:'Compétitif',valorant:'Valorant',rl:'Rocket League',cod:'COD Mobile',profil:'Profil',objectifs:'Objectifs',activite:'Activité'};
function lb(u){$('#lb img').src=u;$('#lb').style.display='flex'}
function go(h){location.hash=h}
let navCount=0;
function goBack(){if(navCount>0){navCount-=2;history.back()}else location.hash='#/'}
function render(){
  charts.forEach(c=>{try{c.destroy()}catch(e){}});charts=[];
  const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean),r=p[0]||'';
  const top=['','steam','compet','setup','objectifs','profil'].includes(r)&&!p[1];
  document.body.classList.toggle('sub',!top);
  $$('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.r==r||(a.dataset.r=='compet'&&['valorant','rl','cod'].includes(r))||(a.dataset.r=='profil'&&r=='activite')));
  $('#ttl').textContent=r=='setup'&&p[1]?(p[1]=='reglages'?'Réglages':'Conseils'):r=='valorant'&&p[1]?'Partie Valorant':r=='cod'&&p[1]=='modes'?'Stats par mode':r=='cod'&&p[1]?'Partie COD':r=='steam'&&p[1]?(D.games.find(g=>g.appid==p[1])?.name||'Jeu'):(TITLES[r]??'GameTrack');
  try{({'':home,steam:()=>p[1]?steamGame(+p[1]):library(),compet,valorant:()=>D.vh?(p[1]?valMatch(p[1]):valPage()):tracker('valorant'),rl:()=>D.rlm&&!D.rOk.length?rlManual():tracker('rl'),setup:()=>p[1]=='conseils'?advice():p[1]=='reglages'?reglages():setupPage(),cod:()=>p[1]=='modes'?codModes():p[1]!=null?codMatch(+p[1]):cod(),profil,objectifs,activite}[r]||home)()}
  catch(e){console.error(e);app.innerHTML=`<div class="glass wait"><div class="ico">⚠️</div><h3>Erreur d'affichage</h3><p class="mut">${esc(e.message)}</p><a class="btn" href="#/">Accueil</a></div>`}
  window.scrollTo({top:0});
}
function route(){
  navCount++;
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){try{const t=document.startViewTransition(render);[t.ready,t.finished,t.updateCallbackDone].forEach(x=>x&&x.catch(()=>{}))}catch(e){render()}}
  else{app.classList.remove('view');void app.offsetWidth;app.classList.add('view');render()}
}
window.addEventListener('hashchange',route);
app.innerHTML='<div class="glass wait"><div class="ico">⚡</div>Chargement…</div>';
load().then(render).catch(e=>{console.error(e);app.innerHTML=`<div class="glass wait"><div class="ico">⚠️</div><h3>Impossible de charger les données</h3><p class="mut">${esc(e.message)}</p></div>`});
