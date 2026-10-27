"use strict";
/* Gaming Tracker : fonctions de calcul pures (sans DOM), partagées par app.js et testées par tests/core.test.js (node). */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TZ={timeZone:'Europe/Paris'};
const fnum=(v,d=0)=>v==null||isNaN(v)?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const num=v=>typeof v=='number'&&isFinite(v)?v:null;
const COD_SUB=['I','II','III','IV','V'];
const COD_LADDER=[['Novice',0,5],['Vétéran',1001,5],['Élite',2001,5],['Pro',3001,5],['Maître',4501,0],['Grand Maître',6001,0],['Légendaire',8001,0]];
const COD_STEPS=[];COD_LADDER.forEach(([n,p,d],ti)=>{if(d)for(let i=0;i<d;i++)COD_STEPS.push({tier:n,sub:COD_SUB[i],pts:p+Math.round(i*(ti<3?200:300))});else COD_STEPS.push({tier:n,sub:null,pts:p})});
const codStepVal=(tier,sub)=>{const i=COD_STEPS.findIndex(x=>x.tier==tier&&(x.sub||null)==(sub||null));return i<0?null:i+1};
const codPtsOf=(tier,sub,points)=>points!=null?points:(COD_STEPS[codStepVal(tier,sub)-1]?.pts??null);
const D={};
const VFR={Iron:'Fer',Bronze:'Bronze',Silver:'Argent',Gold:'Or',Platinum:'Platine',Diamond:'Diamant',Ascendant:'Ascendant',Immortal:'Immortel',Radiant:'Radiant',Unrated:'Non classé'};
const vTier=t=>t?String(t).replace(/^(\w+)/,w=>VFR[w]||w):'—';
const VMODE={Competitive:'Compétition',Unrated:'Non classé',Swiftplay:'Vélocité',Deathmatch:'Combat à mort','Team Deathmatch':'Combat à mort par équipe',Spikerush:'Spike Rush',Premier:'Premier'};
const vMode=m=>VMODE[m]||m||'—';
const vAgg=a=>{const s=k=>a.reduce((t,x)=>t+(num(x[k])||0),0),r=a.filter(x=>x.result),sh=s('head')+s('body')+s('leg'),rd=a.filter(x=>x.rounds),fk=a.filter(x=>x.first_kills!=null);
  return{n:a.length,w:r.filter(x=>x.result=='win').length,wr:r.length?100*r.filter(x=>x.result=='win').length/r.length:null,kd:s('deaths')?s('kills')/s('deaths'):null,kda:s('deaths')?(s('kills')+s('assists'))/s('deaths'):null,
   hs:sh?100*s('head')/sh:null,adr:rd.length?rd.reduce((t,x)=>t+(x.dmg||0),0)/rd.reduce((t,x)=>t+x.rounds,0):null,acs:rd.length?rd.reduce((t,x)=>t+(x.score||0),0)/rd.reduce((t,x)=>t+x.rounds,0):null,
   k:s('kills'),d:s('deaths'),a:s('assists'),fk:fk.length?fk.reduce((t,x)=>t+x.first_kills,0):null,fkn:fk.length}};
const sum=(a,k)=>a.reduce((s,x)=>s+(num(x[k])||0),0);
const kdOf=a=>{const k=a.filter(x=>num(x.kills)!=null&&num(x.deaths)!=null);return k.length?sum(k,'kills')/Math.max(1,sum(k,'deaths')):null};
const isWin=x=>x.result=='win'||(x.type=='BR'&&x.placement==1);
const wr=a=>{const r=a.filter(x=>x.result||(x.type=='BR'&&x.placement!=null));return r.length?100*r.filter(isWin).length/r.length:null};
const avg=(a,k)=>{const v=a.map(x=>num(x[k])).filter(v=>v!=null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};
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
const RL_DIV=['I','II','III','IV'],rlVal=(t,d)=>t*4+((d||1)-1),rlLbl=(t,d)=>RL_T[t]+(d&&t<RL_T.length-1?' div. '+RL_DIV[d-1]:'');
function steamWin(days){const H=D.steamH;if(H.length<2)return null;const now=Date.now(),last=H.at(-1);
  const base=[...H].reverse().find(x=>new Date(x.fetched_at).getTime()<=now-days*864e5),b0=base||H[0];
  const pf=g=>g.playtime_forever!=null?g.playtime_forever:Math.round((g.hours||0)*60),m={};
  (last.games||[]).forEach(g=>{const a=(b0.games||[]).find(x=>x.appid==g.appid);if(a)m[g.appid]=pf(g)-pf(a)});return{m,full:!!base,from:b0.fetched_at}}
const VT='https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/';
const vIcon=(id,sz=28)=>id?`<img src="${VT}${id}/smallicon.png" alt="" style="width:${sz}px;height:${sz}px;vertical-align:middle" onerror="this.remove()">`:'';
/* Clé stable d'une partie COD pour l'URL (#/cod/<clé>) : son id, sinon la minute UTC de sa date (comme la fusion côté robot). */
const codKey=m=>m&&m.id!=null&&m.id!==''?String(m.id):m&&m.date&&!isNaN(Date.parse(m.date))?'t'+Math.floor(Date.parse(m.date)/6e4):null;
function codFind(list,key){if(key==null)return -1;key=String(key);let i=list.findIndex(m=>m.id!=null&&String(m.id)===key);if(i>=0)return i;
  const t=/^t(\d+)$/.exec(key);if(t)return list.findIndex(m=>m.date&&Math.floor(Date.parse(m.date)/6e4)==+t[1]);return -1}
/* Style RL (répartition buts / arrêts, en % des contributions) : texte calculé, plus de phrase figée. */
function rlStyle(pf){const g=num(pf&&pf.goals_pct),s=num(pf&&pf.saves_pct);if(g==null||s==null)return '';
  return g-s>=10?'Profil plutôt offensif : tu marques plus que tu ne défends.':s-g>=10?'Profil plutôt défensif : tu défends plus que tu ne marques.':'Profil équilibré : tu marques à peu près autant que tu défends.'}
/* Échantillon minimal pour donner un conseil (COD, Valorant, RL). */
const MIN_SAMPLE=5;
/* Classement des cartes COD (multijoueur) : score = taux de victoire + K/D plafonné, seulement les cartes avec ≥ min parties.
   Retourne {best,worst,ok,maps} ; ok=false s'il n'y a pas 2 cartes éligibles ou si la « pire » n'est pas réellement moins bonne. */
const MAP_MIN=3;
function codMapRank(list,min=MAP_MIN){const g={};(list||[]).filter(x=>(x.type||'MP')=='MP'&&x.map).forEach(x=>(g[x.map]??=[]).push(x));
  const st=a=>({n:a.length,wr:wr(a),kd:kdOf(a)});
  const all=Object.entries(g).map(([k,a])=>({map:k,...st(a)})),E=all.filter(s=>s.n>=min&&(s.wr!=null||s.kd!=null));
  const sc=s=>(s.wr??50)/100+Math.min(s.kd??1,5)/5;E.sort((a,b)=>sc(b)-sc(a)||b.n-a.n);
  const ok=E.length>=2&&sc(E[0])>sc(E.at(-1));return{ok,best:ok?E[0]:null,worst:ok?E.at(-1):null,eligible:E.length,maps:all.length,min}}

/* ========== t94 : périodes (semaines/mois, heure de Paris), bilan hebdo, records, objectifs atteints, nouveautés ========== */
const PFMT=(()=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}catch(e){return null}})();
/* décalage (ms) de l'heure de Paris par rapport à UTC à l'instant t */
function tzOff(t){if(!PFMT)return 0;const p={};PFMT.formatToParts(new Date(t)).forEach(x=>p[x.type]=x.value);return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second)-Math.floor(t/1000)*1000}
const parisYMD=t=>{const d=new Date(t+tzOff(t));return[d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()]};
/* minuit (heure de Paris) du jour y-m-d, en ms UTC — gère le changement d'heure */
function parisMidnight(y,m,d){const g=Date.UTC(y,m-1,d);let t=g-tzOff(g);t=g-tzOff(t);return t}
const pad2=n=>String(n).padStart(2,'0');
/* début de la semaine (lundi 00:00 Paris) contenant t */
function weekStart(t){const[y,m,d]=parisYMD(t),wd=(new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7,u=new Date(Date.UTC(y,m-1,d-wd));return parisMidnight(u.getUTCFullYear(),u.getUTCMonth()+1,u.getUTCDate())}
function monthStart(t){const[y,m]=parisYMD(t);return parisMidnight(y,m,1)}
const addDays=(t,n)=>{const[y,m,d]=parisYMD(t+12*36e5),u=new Date(Date.UTC(y,m-1,d+n));return parisMidnight(u.getUTCFullYear(),u.getUTCMonth()+1,u.getUTCDate())};
const addMonths=(t,n)=>{const[y,m]=parisYMD(t+12*36e5),u=new Date(Date.UTC(y,m-1+n,1));return parisMidnight(u.getUTCFullYear(),u.getUTCMonth()+1,1)};
/* clé lisible d'une période : 'S2026-10-19' (semaine) ou 'M2026-10' (mois) */
function periodOf(kind,t){const s=kind=='M'?monthStart(t):weekStart(t),e=kind=='M'?addMonths(s,1):addDays(s,7),[y,m,d]=parisYMD(s+12*36e5);return{kind,from:s,to:e,key:kind=='M'?`M${y}-${pad2(m)}`:`S${y}-${pad2(m)}-${pad2(d)}`}}
function periodFromKey(key){const r=/^([SM])(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(key||'');if(!r)return null;return periodOf(r[1],parisMidnight(+r[2],+r[3],+(r[4]||1))+12*36e5)}
/* liste des périodes (plus récente d'abord) de la première donnée jusqu'à now */
function periodList(kind,first,now,max=60){if(first==null||isNaN(first))return[];const out=[];let p=periodOf(kind,now);while(out.length<max&&p.to>first){out.push(p);p=periodOf(kind,p.from-1)}return out}
const tOf=x=>{const t=Date.parse(x&&(x.date||x.fetched_at));return isNaN(t)?null:t};
const inR=(a,f,t)=>(a||[]).filter(x=>{const v=tOf(x);return v!=null&&v>=f&&v<t});
const byT=a=>(a||[]).filter(x=>tOf(x)!=null).slice().sort((a,b)=>tOf(a)-tOf(b));
const steamTot=s=>(s&&s.games||[]).reduce((a,g)=>a+(g.playtime_forever!=null?g.playtime_forever:Math.round((g.hours||0)*60)),0);
/* Stats d'une période pour tous les jeux. src = {vh, cod, rl, steamH} (mêmes formes que les fichiers de données). */
function periodStats(src,from,to){
  const vm=inR((src.vh&&src.vh.matches)||[],from,to).filter(m=>m.mode=='Competitive'),vr=vm.filter(m=>m.result),H=byT(src.vh&&src.vh.mmr_history),Hin=inR(H,from,to);
  const val={n:vm.length,wr:vr.length?100*vr.filter(m=>m.result=='win').length/vr.length:null,kd:kdOf(vm),
    rr:Hin.length?Hin.reduce((s,h)=>s+(num(h.change)||0),0):null,elo:Hin.length?num(Hin.at(-1).elo):null,tier:Hin.length?Hin.at(-1).tier:null};
  const c=inR(src.cod,from,to);const cod={n:c.length,wr:wr(c),kd:kdOf(c),kills:avg(c,'kills'),dmg:avg(c,'damage')};
  const r=inR(src.rl,from,to),rr=r.filter(x=>x.result);const rl={n:r.length,wr:rr.length?100*rr.filter(x=>x.result=='win').length/rr.length:null,goals:avg(r,'goals'),saves:avg(r,'saves')};
  const S=byT(src.steamH),b=[...S].reverse().find(s=>tOf(s)<=from),e=[...S].reverse().find(s=>tOf(s)<to);
  const steam={min:b&&e&&tOf(e)>tOf(b)?Math.max(0,steamTot(e)-steamTot(b)):b&&e?0:null};
  return{from,to,val,cod,rl,steam};
}
/* Indicateurs comparés (plus haut = mieux, sauf indication) */
const KPIS=[['val','🎯 Valorant','rr','RR gagnés/perdus',0,' RR','sum'],['val','🎯 Valorant','elo','MMR (elo) en fin de période',0,''],['val','🎯 Valorant','n','Parties classées',0,'','vol'],['val','🎯 Valorant','wr','Victoires',0,' %'],['val','🎯 Valorant','kd','K/D',2,''],
 ['cod','🔫 COD Mobile','n','Parties',0,'','vol'],['cod','🔫 COD Mobile','kd','K/D',2,''],['cod','🔫 COD Mobile','wr','Victoires',0,' %'],['cod','🔫 COD Mobile','kills','Éliminations / partie',1,''],['cod','🔫 COD Mobile','dmg','Dégâts / partie',0,''],
 ['rl','🚗 Rocket League','n','Parties (replays)',0,'','vol'],['rl','🚗 Rocket League','wr','Victoires',0,' %'],['rl','🚗 Rocket League','goals','Buts / partie',2,''],['rl','🚗 Rocket League','saves','Arrêts / partie',2,''],
 ['steam','🕹️ Steam','min','Temps de jeu',1,' h','vol']];
/* comparaison A (récente) vs B : lignes {g,gl,k,l,a,b,d,dec,u,dir} ; dir = +1 mieux, -1 moins bien, 0 égal/neutre ; seulement les lignes où A ou B existe */
function compareStats(A,B,games){return KPIS.filter(k=>!games||games.includes(k[0])).map(([g,gl,k,l,dec,u,kind])=>{
  let a=A&&A[g]?A[g][k]:null,b=B&&B[g]?B[g][k]:null;if(g=='steam'){a=a==null?null:a/60;b=b==null?null:b/60}
  if((k=='n'||kind=='vol')&&g!='steam'){if(!a)a=a===0?0:null;if(!b)b=b===0?0:null}
  const d=a!=null&&b!=null?a-b:null,eps=dec?Math.pow(10,-dec)/2:.5;return{g,gl,k,l,a,b,d,dec,u,kind,dir:d==null||Math.abs(d)<eps?0:d>0?1:-1}}).filter(r=>(r.a!=null&&!(r.kind=='vol'&&r.a===0&&!r.b))||(r.b!=null&&!(r.kind=='vol'&&r.b===0&&!r.a)))}
/* bilan d'une semaine terminée : faits marquants (progrès/baisses), triés par importance */
function weekRecap(src,now){const cur=periodOf('S',now),w=periodOf('S',cur.from-1),p=periodOf('S',w.from-1);
  const A=periodStats(src,w.from,w.to),B=periodStats(src,p.from,p.to),rows=compareStats(A,B).filter(r=>r.a!=null);
  const played=A.val.n+A.cod.n+A.rl.n>0||(A.steam.min||0)>0;return{week:w,prev:p,A,B,rows,played}}
/* séries de victoires : meilleure et en cours (liste triée par date) */
function streaks(list,isW,hasR){let best=0,bestAt=null,cur=0;byT(list).filter(hasR).forEach(x=>{if(isW(x)){cur++;if(cur>best){best=cur;bestAt=x.date}}else cur=0});return{best,bestAt,cur}}
const maxBy=(a,f)=>{let m=null;(a||[]).forEach(x=>{const v=num(f(x));if(v!=null&&(m==null||v>m.v))m={v,x}});return m};
/* Records personnels calculés depuis les données (aucune donnée n'est modifiée) */
function records(src){const R=[],add=(id,g,l,m,dec=0,u='',extra={})=>{if(m&&m.v!=null&&m.v>0)R.push({id,g,l,v:m.v,dec,u,at:m.x&&(m.x.date||m.x.fetched_at)||null,...extra})};
  const vh=src.vh||{},vm=(vh.matches||[]).filter(m=>!/deathmatch/i.test(m.mode||'')),vc=(vh.matches||[]).filter(m=>m.mode=='Competitive');
  const pk=maxBy(vh.mmr_history,h=>h.elo);add('val_elo','valorant','Pic de MMR (elo)',pk,0,'',pk?{sub:vTier(pk.x.tier)+' · '+(pk.x.rr??'')+' RR'}:{});
  const vk=maxBy(vm,m=>m.kills);add('val_kills','valorant','Éliminations en une partie',vk,0,'',vk?{sub:vk.x.map||'',link:'#/valorant/'+vk.x.id}:{});
  const vs=streaks(vc,m=>m.result=='win',m=>!!m.result);add('val_streak','valorant','Série de victoires (classé)',{v:vs.best,x:{date:vs.bestAt}},0,'',{cur:vs.cur});
  const cod=src.cod||[],ck=maxBy(cod,m=>m.kills);add('cod_kills','cod','Éliminations en une partie',ck,0,'',ck?{sub:ck.x.map||''}:{});
  add('cod_dmg','cod','Dégâts en une partie',maxBy(cod,m=>m.damage),0);
  add('cod_kd','cod','Meilleur K/D (une partie)',maxBy(cod.filter(m=>num(m.kills)!=null&&num(m.deaths)!=null),m=>m.kills/Math.max(1,m.deaths)),2);
  const cs=streaks(cod.filter(m=>(m.type||'MP')=='MP'),isWin,m=>!!m.result);add('cod_streak','cod','Série de victoires (multi)',{v:cs.best,x:{date:cs.bestAt}},0,'',{cur:cs.cur});
  const rl=src.rl||[],rs=streaks(rl,x=>x.result=='win',x=>!!x.result);add('rl_streak','rl','Série de victoires',{v:rs.best,x:{date:rs.bestAt}},0,'',{cur:rs.cur});
  const rg=maxBy(rl,x=>x.goals);add('rl_goals','rl','Buts en une partie',rg,0,'',rg?{link:'#/rl/'+rg.x.id}:{});
  const rv=maxBy(rl,x=>x.saves);add('rl_saves','rl','Arrêts en une partie',rv,0,'',rv?{link:'#/rl/'+rv.x.id}:{});
  return R}
/* Records battus depuis la dernière visite. st = {v:{id:valeur},b:{id:horodatage}} (stockage local). La 1re fois : simple point de départ. */
function recordsUpdate(st,recs,now,keepMs=7*864e5){const v={...(st&&st.v||{})},b={...(st&&st.b||{})},first=!st||!st.v,beaten=[];
  recs.forEach(r=>{const o=v[r.id];if(!first&&o!=null&&r.v>o+1e-9){b[r.id]=now;beaten.push(r)}v[r.id]=Math.max(r.v,o??-Infinity)});
  Object.keys(b).forEach(k=>{if(now-b[k]>keepMs)delete b[k]});return{st:{v,b},beaten}}
/* Objectifs : atteints depuis la dernière visite et progression. prev = {id:{p,done,t}} */
function goalsUpdate(prev,cur,now,keepMs=7*864e5){const nx={},reached=[],moved=[],first=!prev;
  cur.forEach(g=>{const o=prev&&prev[g.id],done=!!g.done;nx[g.id]={p:g.p,done,t:o&&o.done==done?o.t:done&&o&&!first?now:null,d:o&&!first&&Math.abs(g.p-o.p)>=.5?g.p-o.p:o?.d||0};
    if(!first&&done&&(!o||!o.done)&&o){reached.push(g)}if(!first&&o&&Math.abs(g.p-o.p)>=.5)moved.push({...g,d:g.p-o.p})});
  return{st:nx,reached,moved,recent:cur.filter(g=>nx[g.id].done&&nx[g.id].t&&now-nx[g.id].t<keepMs)}}
/* Nouveautés entre deux visites (rang Valorant, replays RL). snap = {vt:tier_id, vn:tier, rlN:nb replays, rlLast:date} */
function snapEvents(a,b){const ev=[];if(!a||!b)return ev;
  if(a.vt!=null&&b.vt!=null&&a.vt!=b.vt)ev.push({k:'val',up:b.vt>a.vt,title:`Valorant : ${b.vt>a.vt?'promotion':'rétrogradation'} ${b.vt>a.vt?'▲':'▼'}`,body:`${vTier(a.vn)} → ${vTier(b.vn)}`,link:'#/valorant'});
  if(b.rlN!=null&&a.rlN!=null&&b.rlN>a.rlN){const n=b.rlN-a.rlN;ev.push({k:'rl',title:`Rocket League : ${n} nouveau${n>1?'x':''} replay${n>1?'s':''} analysé${n>1?'s':''}`,body:'Touche pour voir l’analyse',link:'#/rl'})}
  return ev}
