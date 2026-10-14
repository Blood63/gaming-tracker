"use strict";
const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fdate=s=>s?new Date(s).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',year:'numeric'}):'—';
const fnum=(v,d=0)=>v==null||isNaN(v)?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const num=v=>typeof v=='number'&&!isNaN(v)?v:null;
const get=async(f,j=true)=>{try{const r=await fetch(f+'?v='+Date.now());if(!r.ok)return null;return j?await r.json():await r.text()}catch(e){return null}};
const jl=async f=>((await get(f,false))||'').trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(Boolean);
Chart.defaults.color='#8b93a7';Chart.defaults.borderColor='rgba(255,255,255,.07)';Chart.defaults.font.family='Rajdhani,system-ui';Chart.defaults.maintainAspectRatio=false;
let charts=[];const chart=(el,cfg)=>{charts.push(new Chart(el,cfg))};
const D={};
async function load(){
  const [steamH,store,val,rl,cod]=await Promise.all([jl('history/steam.jsonl'),get('store.json'),jl('history/valorant.jsonl'),jl('history/rocket_league.jsonl'),get('cod_mobile.json')]);
  D.steamH=steamH.filter(x=>x.games&&x.games.length);D.steam=D.steamH.at(-1)||null;D.store=(store&&store.apps)||{};
  D.val=val;D.rl=rl;D.cod=((cod&&cod.matches)||[]).filter(m=>m.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const last=[D.steam,val.at(-1),rl.at(-1)].filter(Boolean).map(x=>x.fetched_at).sort().at(-1);
  if(last)$('#upd').textContent='MAJ '+fdate(last);
}
const pct=g=>g.ach_total?Math.round(100*(g.ach_unlocked||0)/g.ach_total):null;
const animBars=()=>requestAnimationFrame(()=>setTimeout(()=>document.querySelectorAll('.bar i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'),60));
const bar=p=>p==null?'':`<div class="bar"><i data-w="${p}"></i></div>`;
const stat=(k,v,d='',cls='')=>`<div class="glass stat ${cls}"><div class="k">${esc(k)}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
const lineDS=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color+'33',fill:true,tension:.35,pointRadius:3,spanGaps:true,...extra});

/* ---------- COD calculs ---------- */
const sum=(a,k)=>a.reduce((s,x)=>s+(num(x[k])||0),0);
const kdOf=a=>{const k=a.filter(x=>num(x.kills)!=null&&num(x.deaths)!=null);return k.length?sum(k,'kills')/Math.max(1,sum(k,'deaths')):null};
const wr=a=>{const r=a.filter(x=>x.result);return r.length?100*r.filter(x=>x.result=='win').length/r.length:null};
const avg=(a,k)=>{const v=a.map(x=>num(x[k])).filter(v=>v!=null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};

/* ---------- tracker.gg ---------- */
const trnOk=h=>h.filter(x=>x.status=='ok'&&x.raw&&x.raw.data);
const segs=x=>(x.raw.data.segments||[]);
const overview=x=>segs(x).find(s=>s.type=='overview')||segs(x)[0];
const S=(seg,k)=>seg&&seg.stats&&seg.stats[k];

/* ---------- HOME ---------- */
function home(){
  const g=D.steam?D.steam.games:[];const tot=g.reduce((a,x)=>a+x.hours,0);
  const vOk=trnOk(D.val).at(-1),rOk=trnOk(D.rl).at(-1);
  const vRank=vOk&&(S(overview(vOk),'rank')||{}).metadata?.tierName;
  const rlBest=rOk&&segs(rOk).filter(s=>s.type=='playlist').map(s=>S(s,'rating')?.value).filter(v=>v!=null).sort((a,b)=>b-a)[0];
  const ck=kdOf(D.cod);
  let h=`<div class="hero">
   <div class="glass gcard" style="--c:var(--steam)" onclick="go('#/steam')"><div class="t">Steam</div><div class="big">${fnum(tot,0)} h</div><div class="s">${g.length} jeux · niveau ${D.steam?.level??'—'}</div></div>
   <div class="glass gcard" style="--c:var(--val)" onclick="go('#/valorant')"><div class="t">Valorant</div><div class="big">${vOk?esc(vRank||'OK'):'⏳'}</div><div class="s">${vOk?'Blood#7629':'En attente de clé Tracker Network'}</div></div>
   <div class="glass gcard" style="--c:var(--rl)" onclick="go('#/rl')"><div class="t">Rocket League</div><div class="big">${rOk?fnum(rlBest)+' MMR':'⏳'}</div><div class="s">${rOk?'443Blood · Epic':'En attente de clé Tracker Network'}</div></div>
   <div class="glass gcard" style="--c:var(--cod)" onclick="go('#/cod')"><div class="t">COD Mobile</div><div class="big">${D.cod.length?'K/D '+fnum(ck,2):'📸'}</div><div class="s">${D.cod.length?D.cod.length+' parties':'Envoie ta 1ʳᵉ capture'}</div></div>
  </div>
  <p style="margin:1rem 0"><a class="btn" href="https://github.com/Blood63/gaming-tracker/issues/new?template=cod-mobile.yml" target="_blank" rel="noopener">📸 Ajouter une partie COD</a></p>`;
  const recent=(D.steam?.recent?.games)||[];
  if(recent.length)h+=`<h2>Joué récemment</h2><div class="grid">${recent.map(r=>gameCard(g.find(x=>x.appid==r.appid)||{...r,hours:r.playtime_forever/60},`${fnum(r.playtime_2weeks/60,1)} h / 2 sem.`)).join('')}</div>`;
  h+=`<h2>Bibliothèque Steam</h2><div class="grid">${g.map(x=>gameCard(x)).join('')}</div>`;
  app.innerHTML=h;animBars();
}
function gameCard(g,sub){
  const st=D.store[g.appid]||{};const img=st.header_image||`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`;const p=pct(g);
  return `<div class="glass game" onclick="go('#/steam/${g.appid}')"><img loading="lazy" src="${esc(img)}" alt=""><div class="b"><div class="n">${esc(g.name)}</div>
  <div class="m"><span>${sub||fnum(g.hours,1)+' h'}</span><span>${g.ach_total?`🏆 ${g.ach_unlocked||0}/${g.ach_total}`:''}</span></div>${bar(p)}</div></div>`;
}

/* ---------- STEAM liste ---------- */
function steamList(){
  const g=D.steam?.games||[];const tot=g.reduce((a,x)=>a+x.hours,0);
  const ach=g.reduce((a,x)=>a+(x.ach_unlocked||0),0),achT=g.reduce((a,x)=>a+(x.ach_total||0),0);
  app.innerHTML=`<h2>Steam</h2><div class="stats">${stat('Temps total',fnum(tot,1)+' h')}${stat('Jeux',g.length)}${stat('Niveau',D.steam?.level??'—')}${stat('Succès',`${ach}/${achT}`,achT?fnum(100*ach/achT,0)+' %':'')}</div>
  <div class="glass chart"><canvas id="c1"></canvas></div><h2>Jeux</h2><div class="grid">${g.map(x=>gameCard(x)).join('')}</div>`;
  const top=g.filter(x=>x.hours>0).slice(0,6),cols=['#00f0ff','#ff2bd6','#39ff88','#ffc857','#a78bfa','#ff6b6b'];
  chart($('#c1'),{type:'line',data:{labels:D.steamH.map(x=>fdate(x.fetched_at)),datasets:top.map((t,i)=>lineDS(t.name,D.steamH.map(s=>(s.games.find(y=>y.appid==t.appid)||{}).hours??null),cols[i],{fill:false}))},options:{plugins:{title:{display:true,text:'Évolution du temps de jeu (h)'},legend:{position:'bottom',labels:{boxWidth:10}}}}});
  animBars();
}

/* ---------- STEAM détail ---------- */
function steamGame(id){
  const g=(D.steam?.games||[]).find(x=>x.appid==id)||{appid:id,name:'Jeu'};const s=D.store[id]||{};const p=pct(g);
  const hist=D.steamH.map(x=>({t:x.fetched_at,g:x.games.find(y=>y.appid==id)})).filter(x=>x.g).filter((x,i,a)=>!i||x.t.slice(0,10)!=a[i-1].t.slice(0,10));
  const mc=s.metacritic;const price=s.price?(s.price.discount?`<s>${esc(s.price.initial)}</s> `:'')+esc(s.price.text):'—';
  app.innerHTML=`<div class="cover"><img src="${esc(s.header_image||`https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`)}" alt=""><div class="ttl"><h3>${esc(s.name||g.name)}</h3>${(s.genres||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div></div>
  <div class="stats">${stat('Temps de jeu',fnum(g.hours,1)+' h',g.rtime_last_played?'Dernière session : '+fdate(g.rtime_last_played*1000):'Jamais lancé')}
  ${stat('Succès',g.ach_total?`${g.ach_unlocked||0}/${g.ach_total}`:'—',p!=null?p+' % '+bar(p):'Pas de succès')}
  ${stat('Metacritic',mc?`<span style="color:${mc.score>=75?'var(--ok)':mc.score>=50?'#ffc857':'var(--val)'}">${mc.score}</span>`:'—',mc?.url?`<a href="${esc(mc.url)}" target="_blank" rel="noopener">voir</a>`:'')}
  ${stat('Prix actuel',price,s.price?.discount?`-${s.price.discount} %`:'')}</div>
  ${s.short_description?`<h2>Description</h2><div class="glass desc">${esc(s.short_description)}</div>`:''}
  <h2>Infos</h2><div class="glass kv"><span>Développeur</span><span>${esc((s.developers||[]).join(', ')||'—')}</span><span>Éditeur</span><span>${esc((s.publishers||[]).join(', ')||'—')}</span><span>Sortie</span><span>${esc(s.release_date||'—')}</span><span>Catégories</span><span>${(s.categories||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join('')||'—'}</span></div>
  ${(s.screenshots||[]).length?`<h2>Captures</h2><div class="shots">${s.screenshots.map((u,i)=>`<img loading="lazy" src="${esc(u)}" data-full="${esc((s.screenshots_full||[])[i]||u)}" onclick="lb(this.dataset.full)" alt="">`).join('')}</div>`:''}
  ${hist.length>1?`<h2>Progression</h2><div class="glass chart"><canvas id="c1"></canvas></div>`:''}
  <h2>DLC (${s.dlc_count??0})</h2>${(s.dlc||[]).length?`<div class="list">${s.dlc.map(d=>`<a class="glass row" href="${esc(d.url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(d.image||'')}" alt=""><span class="n">${esc(d.name||'DLC '+d.appid)}${d.release?`<br><small style="color:var(--mut)">${esc(d.release)}</small>`:''}</span><span class="p">${d.price?(d.price.discount?`<s>${esc(d.price.initial)}</s>`:'')+esc(d.price.text):'—'}</span></a>`).join('')}</div>${s.dlc_count>s.dlc.length?`<p class="pill">+${s.dlc_count-s.dlc.length} autres sur la boutique</p>`:''}`:`<div class="glass desc">Aucun DLC ${s.name?'':'(données boutique indisponibles)'}</div>`}
  <p style="margin-top:1.4rem"><a class="btn alt" href="${esc(s.url||`https://store.steampowered.com/app/${id}/`)}" target="_blank" rel="noopener">🛒 Page Steam</a></p>`;
  if(hist.length>1)chart($('#c1'),{data:{labels:hist.map(x=>fdate(x.t)),datasets:[{type:'line',...lineDS('Heures',hist.map(x=>x.g.hours),'#00f0ff')},{type:'line',...lineDS('Succès',hist.map(x=>x.g.ach_unlocked??null),'#ff2bd6',{fill:false,yAxisID:'y2'})}]},options:{scales:{y2:{position:'right',grid:{display:false}}}}});
  animBars();
}

/* ---------- Tracker (Valorant / RL) ---------- */
const TRN={valorant:{name:'Valorant',color:'#ff4655',id:'Blood#7629',hist:()=>D.val,
  keys:['rank','peakRank','matchesPlayed','matchesWinPct','kDRatio','kDARatio','headshotsPercentage','damagePerRound','scorePerRound','kills','deaths','assists','aces','clutches','firstBloods','timePlayed'],
  chartKeys:['kDRatio','headshotsPercentage','matchesWinPct','damagePerRound'],
  ghost:['Rang','Rang max','Parties','Victoires %','K/D','HS %','ADR','Score/round']},
 rl:{name:'Rocket League',color:'#1e90ff',id:'443Blood · Epic',hist:()=>D.rl,
  keys:['rating','tier','division','matchesPlayed','winStreak','wins','goals','assists','saves','shots','goalShotRatio','mVPs','score'],
  chartKeys:['rating'],
  ghost:['1v1 MMR','2v2 MMR','3v3 MMR','Victoires','Buts','Arrêts','Tirs','MVP']}};
function tracker(key){
  const c=TRN[key],H=c.hist(),ok=trnOk(H),last=ok.at(-1),lastTry=H.at(-1);
  let h=`<div class="cover glass" style="background:linear-gradient(135deg,${c.color}55,transparent);min-height:120px"><div class="ttl"><h3>${c.name}</h3><span class="pill">${esc(c.id)}</span></div></div>`;
  if(!last){
    h+=`<div class="glass wait"><div class="ico">🔑</div><h3>En attente de clé Tracker Network</h3><p style="color:var(--mut)">Les stats s'afficheront ici automatiquement dès que l'API tracker.gg acceptera la clé (mise à jour chaque dimanche à 20 h).</p>
    ${lastTry?`<span class="pill warn">Dernier essai ${fdate(lastTry.fetched_at)} : ${esc(lastTry.http?'HTTP '+lastTry.http:lastTry.status)}</span>`:''}</div>
    <h2>Aperçu</h2><div class="stats ghost">${c.ghost.map(k=>stat(k,'000')).join('')}</div><div class="glass chart ghost" style="display:flex;align-items:center;justify-content:center;color:var(--mut)">📈 Graphiques de progression</div>`;
    app.innerHTML=h;return;
  }
  const ov=overview(last),fmt=s=>s?esc(s.displayValue??fnum(s.value,2)):'—';
  const tile=(k,s)=>s?`<div class="glass stat"><div class="k">${esc(s.displayName||k)}</div><div class="v">${s.metadata?.iconUrl?`<span class="tier"><img src="${esc(s.metadata.iconUrl)}" alt="">${esc(s.metadata.tierName||s.displayValue)}</span>`:fmt(s)}</div>${s.percentile!=null?`<div class="d">Top ${fnum(100-s.percentile,1)} %</div>`:''}</div>`:'';
  const ks=Object.keys(ov.stats||{});const order=[...c.keys.filter(k=>ks.includes(k)),...ks.filter(k=>!c.keys.includes(k))];
  h+=`<h2>${esc(ov.metadata?.name||'Vue d\'ensemble')}</h2><div class="stats">${order.map(k=>tile(k,ov.stats[k])).join('')}</div>`;
  const others=segs(last).filter(s=>s!==ov&&s.stats);
  if(others.length){
    h+=`<h2>${key=='rl'?'Playlists':'Détails par mode'}</h2><div class="seg">${others.map((s,i)=>`<button class="${i?'':'on'}" data-i="${i}">${esc(s.metadata?.name||s.attributes?.key||s.type)}</button>`).join('')}</div><div id="segv"></div>`;
  }
  h+=`<h2>Progression</h2><div class="glass chart"><canvas id="c1"></canvas></div>
  <h2>Historique</h2><div class="glass tbl"><table><tr><th>Date</th>${c.chartKeys.map(k=>`<th>${esc(S(ov,k)?.displayName||k)}</th>`).join('')}</tr>${ok.slice().reverse().map(x=>`<tr><td>${fdate(x.fetched_at)}</td>${c.chartKeys.map(k=>`<td>${fmt(S(overview(x),k))}</td>`).join('')}</tr>`).join('')}</table></div>`;
  app.innerHTML=h;
  const showSeg=i=>{const s=others[i];$('#segv').innerHTML=`<div class="stats">${Object.entries(s.stats).map(([k,v])=>tile(k,v)).join('')}</div>`;document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.i==i))};
  if(others.length){document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>showSeg(+b.dataset.i));showSeg(0)}
  const cols=['#00f0ff','#ff2bd6','#39ff88','#ffc857','#a78bfa'];
  const ds=key=='rl'?segs(last).filter(s=>s.type=='playlist'&&S(s,'rating')).map((s,i)=>lineDS(s.metadata?.name,ok.map(x=>segs(x).find(y=>y.metadata?.name==s.metadata?.name)?.stats?.rating?.value??null),cols[i%5],{fill:false}))
     :c.chartKeys.map((k,i)=>lineDS(S(ov,k)?.displayName||k,ok.map(x=>S(overview(x),k)?.value??null),cols[i],{fill:false}));
  chart($('#c1'),{type:'line',data:{labels:ok.map(x=>fdate(x.fetched_at)),datasets:ds},options:{plugins:{legend:{position:'bottom',labels:{boxWidth:10}}}}});
}

/* ---------- COD ---------- */
function cod(){
  const m=D.cod;
  let h=`<div class="cover glass" style="background:linear-gradient(135deg,#f5a62355,transparent);min-height:120px"><div class="ttl"><h3>Call of Duty Mobile</h3><span class="pill">Saisie par capture d'écran</span></div></div>
  <p><a class="btn" href="https://github.com/Blood63/gaming-tracker/issues/new?template=cod-mobile.yml" target="_blank" rel="noopener">📸 Ajouter une partie (capture)</a></p>`;
  if(!m.length){app.innerHTML=h+`<div class="glass wait"><div class="ico">📸</div><h3>Aucune partie pour l'instant</h3><p style="color:var(--mut)">Après chaque partie, envoie la capture du tableau des scores : les stats sont lues automatiquement et apparaissent ici (K/D, tendances, taux de victoire, moyennes par mode, comparaison hebdo).</p></div>
   <h2>Aperçu</h2><div class="stats ghost">${['Parties','K/D','Victoires %','Élim. moy.'].map(k=>stat(k,'000')).join('')}</div>`;return}
  const lab=m.map(x=>fdate(x.date));
  const kd=m.map(x=>num(x.kd)??(num(x.kills)!=null&&num(x.deaths)!=null?(x.deaths?x.kills/x.deaths:x.kills):null));
  const roll=m.map((_,i)=>kdOf(m.slice(Math.max(0,i-9),i+1)));
  const now=Date.now(),DAY=864e5,w1=m.filter(x=>now-new Date(x.date)<7*DAY),w0=m.filter(x=>{const t=now-new Date(x.date);return t>=7*DAY&&t<14*DAY});
  const modes={};m.forEach(x=>(modes[x.mode||'Inconnu']??=[]).push(x));
  const row=(n,fn,d)=>{const a=fn(w1),b=fn(w0),dl=a!=null&&b!=null?a-b:null;return `<tr><td>${n}</td><td>${fnum(a,d)}</td><td>${fnum(b,d)}</td><td class="${dl>0?'up':dl<0?'down':''}">${dl==null?'—':(dl>0?'▲ +':'▼ ')+fnum(dl,d)}</td></tr>`};
  h+=`<div class="stats">${stat('Parties',m.length)}${stat('K/D global',fnum(kdOf(m),2),'10 dern. : '+fnum(roll.at(-1),2))}${stat('Victoires',fnum(wr(m),0)+' %')}${stat('Élim. moy.',fnum(avg(m,'kills'),1),'Morts moy. '+fnum(avg(m,'deaths'),1))}</div>
  <div class="glass chart"><canvas id="c1"></canvas></div><div class="glass chart"><canvas id="c2"></canvas></div><div class="glass chart"><canvas id="c3"></canvas></div>
  <h2>7 derniers jours vs 7 précédents</h2><div class="glass tbl"><table><tr><th></th><th>7 j</th><th>Avant</th><th>Écart</th></tr>${row('Parties',a=>a.length,0)+row('K/D',kdOf,2)+row('Élim. moy.',a=>avg(a,'kills'),1)+row('Morts moy.',a=>avg(a,'deaths'),1)+row('Score moy.',a=>avg(a,'score'),0)+row('Victoires %',wr,0)}</table></div>
  <h2>Par mode</h2><div class="glass tbl"><table><tr><th>Mode</th><th>Parties</th><th>K/D</th><th>Élim.</th><th>Morts</th><th>Score</th><th>Vict.</th></tr>${Object.entries(modes).map(([k,a])=>`<tr><td>${esc(k)}</td><td>${a.length}</td><td>${fnum(kdOf(a),2)}</td><td>${fnum(avg(a,'kills'),1)}</td><td>${fnum(avg(a,'deaths'),1)}</td><td>${fnum(avg(a,'score'),0)}</td><td>${fnum(wr(a),0)} %</td></tr>`).join('')}</table></div>
  <h2>Historique</h2><div class="glass tbl"><table><tr><th>Date</th><th>Mode</th><th>Carte</th><th>Rés.</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th></th></tr>${m.slice().reverse().map(x=>`<tr><td>${fdate(x.date)}</td><td>${esc(x.mode||'—')}</td><td>${esc(x.map||'—')}</td><td>${{win:'✅',loss:'❌',draw:'➖'}[x.result]||'—'}</td><td>${x.kills??'—'}</td><td>${x.deaths??'—'}</td><td>${x.assists??'—'}</td><td>${fnum(num(x.kd),2)}</td><td>${x.screenshot?`<a href="#" onclick="lb('${esc(x.screenshot)}');return false">🖼️</a>`:''}</td></tr>`).join('')}</table></div>`;
  app.innerHTML=h;
  chart($('#c1'),{type:'line',data:{labels:lab,datasets:[lineDS('K/D par partie',kd,'#f5a623',{fill:false,showLine:false,pointRadius:5}),lineDS('Moyenne glissante (10)',roll,'#00f0ff')]},options:{plugins:{title:{display:true,text:'K/D'}}}});
  chart($('#c2'),{type:'line',data:{labels:lab,datasets:[lineDS('Éliminations',m.map(x=>num(x.kills)),'#39ff88',{fill:false}),lineDS('Morts',m.map(x=>num(x.deaths)),'#ff4655',{fill:false}),lineDS('Score',m.map(x=>num(x.score)),'#a78bfa',{fill:false,yAxisID:'y2'})]},options:{scales:{y2:{position:'right',grid:{display:false}}},plugins:{title:{display:true,text:'Tendances'}}}});
  chart($('#c3'),{type:'line',data:{labels:lab,datasets:[lineDS('Cumulé %',m.map((_,i)=>wr(m.slice(0,i+1))),'#ff2bd6'),lineDS('10 dernières %',m.map((_,i)=>wr(m.slice(Math.max(0,i-9),i+1))),'#00f0ff',{fill:false})]},options:{scales:{y:{min:0,max:100}},plugins:{title:{display:true,text:'Taux de victoire'}}}});
}

/* ---------- routeur ---------- */
function lb(u){$('#lb img').src=u;$('#lb').style.display='flex'}
function go(h){location.hash=h}
function route(){
  charts.forEach(c=>c.destroy());charts=[];
  const p=location.hash.replace(/^#\/?/,'').split('/');
  document.body.classList.toggle('sub',!!p[0]);
  app.classList.remove('view');void app.offsetWidth;app.classList.add('view');
  try{
    if(p[0]=='steam'&&p[1])steamGame(+p[1]);else if(p[0]=='steam')steamList();
    else if(p[0]=='valorant')tracker('valorant');else if(p[0]=='rl')tracker('rl');else if(p[0]=='cod')cod();else home();
  }catch(e){console.error(e);app.innerHTML=`<div class="glass wait">Erreur d'affichage : ${esc(e.message)}</div>`}
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
app.innerHTML='<div class="glass wait"><div class="ico">⚡</div>Chargement…</div>';
load().then(route);
