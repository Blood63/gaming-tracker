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
/* Départ d'un objectif de rang (règle fixe, t95) : division 1 de la catégorie juste en dessous de celle de la cible
   (cible Or X → départ Argent 1). 0 % au départ, 100 % à la cible, chaque division compte pareil. La valeur « start » enregistrée n'est plus utilisée. */
function rankStart(type,target){
  if(type=='val_rank'){const c=target>=27?8:Math.floor((target-3)/3);return 3+Math.max(0,c-1)*3}
  if(type=='rl_rank'){const c=target>=RL_T.length-1?7:Math.floor(target/3);return rlVal(Math.max(0,c-1)*3,1)}
  if(type=='cod_rank'){const t=codNormStep(target),tn=COD_STEPS[t-1]?.tier,ti=COD_LADDER.findIndex(l=>l[0]==tn);if(ti<0)return 1;const pn=COD_LADDER[Math.max(0,ti-1)][0];return COD_STEPS.findIndex(x=>x.tier==pn)+1}
  return 0}
const rankPct=(cur,start,tgt)=>cur>=tgt?100:tgt<=start?0:Math.max(0,Math.min(100,100*(cur-start)/(tgt-start)));
function rankGoal(x){
  const dl=x.deadline?Math.ceil((new Date(x.deadline+'T23:59')-Date.now())/864e5):null;
  if(x.type=='val_rank'){const T=VAL_T.find(t=>t.id==x.target)||{n:'?'},lab=`Valorant : atteindre ${vTier(T.n)}`;
    if(!D.vh)return{label:lab,wait:'En attente des données Valorant',cur:0,t:1,p:0,dl};
    const M=D.vh.mmr,cur=(M.tier_id-3)*100+(M.rr||0),tgt=(x.target-3)*100,start=(rankStart('val_rank',x.target)-3)*100,rem=Math.max(0,tgt-cur),E=valEst();
    const p=rankPct(cur,start,tgt);
    let info=rem<=0?'':`${fnum(rem)} RR restants (${vTier(M.tier)} · ${M.rr} RR → ${vTier(T.n)})`;
    if(rem>0&&E.ag){const wins=Math.ceil(rem/E.ag);info+=`<br>≈ ${wins} victoire${wins>1?'s':''} sans défaite (gain moyen +${fnum(E.ag,0)} RR)`;
      if(E.net>0){const g=Math.ceil(rem/E.net);info+=` · ≈ ${g} parties à ton rythme actuel (${fnum(100*E.wr,0)} % de victoires, perte moy. −${fnum(E.al,0)} RR)`}
      else if(E.net!=null)info+=' · à ton rythme actuel, le solde de RR est négatif : il faut gagner plus souvent';
      info+=' <i>(estimation)</i>'}
    return{label:lab,cur:Math.max(0,cur-start),t:Math.max(1,tgt-start),u:'RR',p:Math.max(0,Math.min(100,p)),info,dl,done:cur>=tgt,icon:vIcon(x.target,22)}}
  if(x.type=='rl_rank'){const lab=`Rocket League ${RL_PL[x.playlist]||x.playlist} : ${RL_T[x.target]||'?'}${x.div&&x.target<RL_T.length-1?' div. '+['I','II','III','IV'][x.div-1]:''}`;
    const pl=D.rlm?.playlists?.find(p=>p.id==x.playlist);
    if(!pl)return{label:lab,wait:'En attente de données Rocket League (intégration ballchasing.com prévue)',cur:0,t:1,p:0,dl};
    const cur=rlVal(pl.tier,pl.div),tgt=rlVal(x.target,x.div||1),start=rankStart('rl_rank',x.target),rem=tgt-cur,p=rankPct(cur,start,tgt);
    return{label:lab,cur:0,t:1,u:'RR',p:Math.max(0,Math.min(100,p)),done:cur>=tgt,dl,info:rem>0?`Actuel : ${esc(pl.tier_name)} div. ${RL_DIV[pl.div-1]} (${fnum(pl.mmr)} MMR, record ${fnum(pl.best_mmr)}) · encore ${rem} division${rem>1?'s':''}. <i>Données manuelles (captures tracker.gg).</i>`:''}}
  if(x.type=='cod_rank'){x.target=codNormStep(x.target);const a=D.ranks[x.mode]||[],c=a.at(-1),lab=`COD Mobile ${x.mode=='BR'?'Battle Royale':'Multijoueur'} : ${codLbl(x.target)}`;
    if(!c)return{label:lab,wait:'Enregistre ton rang actuel (bouton « changement de rang » sur la page COD)',cur:0,t:1,p:0,dl};
    const start=rankStart('cod_rank',x.target),p=rankPct(c.value,start,x.target),rem=Math.max(0,x.target-c.value);
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
/* ========== RL : analyse locale des replays (dossier rl_local/, calculée sur le PC par rl-analyzer) ========== */
/* Terrain en repère « équipe » : x de -4096 à 4096 (16 colonnes de 512), y de -5120 (mon but) à 5120 (but adverse) (20 lignes de 512). Cellule = secondes × 10. */
const RLL_GW=16,RLL_GH=20;
const RLL_GT={centre:'Centre',decale:'Décalé',diagonale:'Diagonale'};
const RLL_GOAL={pres_du_but:'Près du but',aerien:'Aérien',au_sol:'Au sol',longue_distance:'Longue distance',ciseau:'Ciseau',depuis_sa_moitie:'Depuis sa moitié'};
const RLL_OUT={gagne:'Balle gagnée',perdu:'Balle perdue',neutre:'Neutre',but_pour:'But pour moi',but_contre:'But contre',inconnu:'Inconnu'};
const rllClean=(a,minDate,excl)=>(a||[]).filter(r=>r&&r.s&&r.id&&!r.bots&&(!minDate||String(r.date||'').slice(0,10)>=minDate)&&!(excl&&r.bc&&excl.includes(r.bc))).sort((x,y)=>String(x.date)<String(y.date)?-1:1);
const rllSv=(a,k)=>avg(a.map(r=>r.s),k);
const rllTot=(a,k)=>a.reduce((t,r)=>t+(num(r.s&&r.s[k])||0),0);
const rllPct=(n,d)=>d>0?100*n/d:null;
function rllHeat(a,key='d_heat'){const c=new Array(RLL_GW*RLL_GH).fill(0);let n=0;for(const r of a){const h=r[key];if(!Array.isArray(h)||h.length!=c.length)continue;n++;for(let i=0;i<c.length;i++)c[i]+=num(h[i])||0}
  return{cells:c,total:c.reduce((x,y)=>x+y,0),n}}
/* Part du temps (en %) par moitié et tiers de terrain à partir de la grille ; les bornes des tiers (±1707) coupent les lignes 6 et 13 : pondération au prorata. */
function rllHeatZones(h){const row=y=>{let s=0;for(let x=0;x<RLL_GW;x++)s+=h.cells[y*RLL_GW+x];return s},t=h.total;if(!t)return null;
  let def=0,neu=0,off=0,dh=0,oh=0;for(let y=0;y<RLL_GH;y++){const v=row(y);if(y<10)dh+=v;else oh+=v;
    if(y<6)def+=v;else if(y==6){def+=v*2/3;neu+=v/3}else if(y<13)neu+=v;else if(y==13){neu+=v/3;off+=v*2/3}else off+=v}
  return{def:100*def/t,neu:100*neu/t,off:100*off/t,defH:100*dh/t,offH:100*oh/t}}
/* Coups d'envoi : d_kick = [apparition, rôle, 1er contact, issue, réaction(s), flip] */
function rllKick(a){const K=a.flatMap(r=>Array.isArray(r.d_kick)?r.d_kick:[]);const mk=()=>({n:0,fav:0,def:0,neu:0,unk:0,goalFor:0,goalAgainst:0,first:{moi:0,equipe:0,adverse:0,aucun:0},react:[]});
  const add=(o,k)=>{o.n++;const out=k[3];if(out=='gagne'||out=='but_pour')o.fav++;else if(out=='perdu'||out=='but_contre')o.def++;else if(out=='neutre')o.neu++;else o.unk++;if(out=='but_pour')o.goalFor++;if(out=='but_contre')o.goalAgainst++;
    if(o.first[k[2]]!=null)o.first[k[2]]++;if(num(k[4])!=null)o.react.push(k[4])};
  const T=mk(),sp={},ro={};for(const k of K){add(T,k);add(sp[k[0]]??(sp[k[0]]=mk()),k);add(ro[k[1]]??(ro[k[1]]=mk()),k)}
  const fin=o=>{const dec=o.fav+o.def+o.neu;o.rate=rllPct(o.fav,dec);o.teamFirst=rllPct(o.first.moi+o.first.equipe,o.n);o.meFirst=rllPct(o.first.moi,o.n);o.reactAvg=o.react.length?o.react.reduce((x,y)=>x+y,0)/o.react.length:null;return o};
  fin(T);Object.values(sp).forEach(fin);Object.values(ro).forEach(fin);return{...T,bySpawn:sp,byRole:ro}}
/* Taux de coups d'envoi gagnés, replay par replay (courbe de progression) */
const rllKickSeries=a=>a.map(r=>{const k=rllKick([r]);return k.n>=2?k.rate:null});
/* Tirs : d_shots = [x, y, vitesse, cadré, aérien, issue(but|arret|hors|cadre)] ; x,y en repère équipe (but adverse en y > 0) */
function rllShots(a){const S=a.flatMap(r=>Array.isArray(r.d_shots)?r.d_shots:[]),g=S.filter(s=>s[5]=='but').length,on=S.filter(s=>s[3]).length,sp=S.map(s=>s[2]).filter(v=>num(v)!=null&&v>0);
  return{n:S.length,goals:g,onTarget:on,saved:S.filter(s=>s[5]=='arret').length,off:S.filter(s=>s[5]=='hors').length,air:S.filter(s=>s[4]).length,
    onPct:rllPct(on,S.length),goalPct:rllPct(g,S.length),avgSpeed:sp.length?sp.reduce((x,y)=>x+y,0)/sp.length:null,maxSpeed:sp.length?Math.max(...sp):null,pts:S}}
/* Buts : d_goals = [pour(1=mon équipe), auteur(moi|equipier|adverse), type, vitesse, aérien, t] */
function rllGoals(a){const G=a.flatMap(r=>Array.isArray(r.d_goals)?r.d_goals:[]),cnt=(f)=>{const o={};for(const g of G.filter(f))o[g[2]]=(o[g[2]]||0)+1;return o},sp=f=>{const v=G.filter(f).map(g=>g[3]).filter(x=>num(x)!=null);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null};
  const me=g=>g[1]=='moi',team=g=>g[0]==1,opp=g=>g[0]==0;
  return{me:{n:G.filter(me).length,types:cnt(me),speed:sp(me),air:G.filter(g=>me(g)&&g[4]).length},team:{n:G.filter(team).length,types:cnt(team)},opp:{n:G.filter(opp).length,types:cnt(opp),speed:sp(opp),air:G.filter(g=>opp(g)&&g[4]).length}}}
/* Évolution dans le match : moyenne pondérée par la durée de chaque tranche d'une minute (d_periods) */
function rllPeriods(a,minN=3){const P={};for(const r of a)for(const p of (Array.isArray(r.d_periods)?r.d_periods:[])){const o=P[p.n]??(P[p.n]={n:p.n,cnt:0,sec:0,w:{},t:{gf:0,ga:0,shots:0,saves:0,touches:0,pickups:0}});o.cnt++;o.sec+=p.sec||0;
    for(const k of['boost','speed','def','behind','sup','ball_opp'])if(num(p[k])!=null){const w=p.sec||0;(o.w[k]??(o.w[k]=[0,0]));o.w[k][0]+=p[k]*w;o.w[k][1]+=w}
    for(const k of Object.keys(o.t))o.t[k]+=num(p[k])||0}
  return Object.values(P).filter(o=>o.cnt>=minN).sort((x,y)=>x.n-y.n).map(o=>{const v={n:o.n,cnt:o.cnt};for(const k of['boost','speed','def','behind','sup','ball_opp'])v[k]=o.w[k]&&o.w[k][1]?o.w[k][0]/o.w[k][1]:null;for(const k of Object.keys(o.t))v[k]=o.t[k]/o.cnt;return v})}
/* Après un but (marqué ou encaissé) : comportement avant/après et issue du but suivant (d_after_goal) */
function rllAfter(a){const out={};for(const side of['conceded','scored']){const L=a.flatMap(r=>(Array.isArray(r.d_after_goal)?r.d_after_goal:[]).filter(g=>side=='conceded'?g.for==0:g.for==1));
    const m=(w,k)=>{let s=0,t=0;for(const g of L){const x=g[w]&&g[w][k],sec=g[w]&&g[w].sec;if(num(x)!=null&&sec>0){s+=x*sec;t+=sec}}return t?s/t:null};
    const nxt={me:0,opp:0,none:0};for(const g of L){if(g.next_for==1)nxt.me++;else if(g.next_for==0)nxt.opp++;else nxt.none++}
    out[side]={n:L.length,next:nxt,before:{},after:{}};for(const k of['boost','speed','sup','behind','def','touches_min']){out[side].before[k]=m('before',k);out[side].after[k]=m('after',k)}}
  return out}
const rllBench={kick_win:[50,null],kick_react:[null,.4],kick_team_first:[50,null],dc_pm:[null,1.5],shot_on:[50,null],touch_def:[null,55],shot_speed:[1450,null]};
const RLL_TIPS={
 kick_win:['Tu perds plus de coups d’envoi que tu n’en gagnes.','En free play, répète les 3 types d’apparition (centre, décalé, diagonale) : va chercher la balle avec un flip pris tard, puis pousse-la vers le côté adverse ; sur un coup d’envoi perdu, recule au lieu de rester au contact.'],
 kick_react:['Ta réaction au coup d’envoi est lente.','Appuie sur boost + avance dès le « Go ! » (pas après) et enchaîne le flip avant d’arriver à la balle ; entraîne-le 5 min en mode Entraînement › coup d’envoi.'],
 kick_team_first:['Ton équipe prend rarement le premier contact.','Quand tu n’es pas le plus proche, suis en 2e homme pour récupérer la balle ; le plus proche va à la balle, le 2e prend un boost puis monte en soutien.'],
 dc_pm:['Beaucoup de « double commits » : tu vas à la balle en même temps qu’un coéquipier.','Avant d’engager, regarde où sont tes coéquipiers : si l’un d’eux est plus proche, passe en 2e homme (reste derrière, prends un petit boost) et appelle « Je l’ai » / « À toi » au chat rapide.'],
 shot_on:['Beaucoup de tirs hors du cadre.','Vise les coins bas avant de frapper fort ; en entraînement, travaille la précision (packs « shooting ») avant la puissance, et lève les yeux vers le but juste avant le contact.'],
 touch_def:['Tu touches surtout la balle dans ton propre camp.','Quand tu récupères la balle en défense, dégage vers les côtés puis remonte avec la possession ; après un dégagement, avance plutôt que d’attendre au centre.'],
 shot_speed:['Tes tirs manquent de puissance.','Prends de l’élan : touche la balle avec le nez de la voiture à pleine vitesse, flip au contact, et évite de frapper à l’arrêt.']};
const RLL_LAB={kick_win:'Coups d’envoi gagnés',kick_react:'Réaction au coup d’envoi',kick_team_first:'1er contact pour ton équipe',dc_pm:'Doubles engagements / min',shot_on:'Tirs cadrés',touch_def:'Touches dans ton camp',shot_speed:'Vitesse moyenne des tirs'};
const RLL_UNIT={kick_win:' %',kick_react:' s',kick_team_first:' %',dc_pm:'',shot_on:' %',touch_def:' %',shot_speed:' uu/s'};
/* Valeurs servant au coaching pour un ensemble de replays (un seul replay = liste de 1) */
function rllMetrics(a){const k=rllKick(a),sh=rllShots(a),play=rllTot(a,'play_s')/60,dc=rllTot(a,'double_commits'),m={};
  if(k.n>=3){m.kick_win=k.rate;m.kick_react=k.reactAvg;m.kick_team_first=k.teamFirst}
  if(play>=1.5)m.dc_pm=dc/play;
  if(sh.n>=3){m.shot_on=sh.onPct;m.shot_speed=sh.avgSpeed}
  const td=rllSv(a,'touch_def_pct');if(td!=null&&rllTot(a,'touches')>=8)m.touch_def=td;
  for(const x of Object.keys(m))if(num(m[x])==null)delete m[x];return m}
/* Conseils : écart au repère indicatif (plus l'écart relatif est grand, plus c'est prioritaire) + points forts. Retourne {weak,strong,ctx} */
function rllCoach(a,maxW=3){const m=rllMetrics(a),W=[],S=[];
  for(const[k,[lo,hi]]of Object.entries(rllBench)){const v=m[k];if(v==null)continue;let bad=0;if(lo!=null&&v<lo)bad=(lo-v)/lo;else if(hi!=null&&v>hi)bad=(v-hi)/hi;
    if(bad>0)W.push({k,label:RLL_LAB[k],value:v,bench:[lo,hi],unit:RLL_UNIT[k],txt:RLL_TIPS[k][0],drill:RLL_TIPS[k][1],gap:bad});
    else{const ref=lo!=null?lo:hi,mar=Math.abs(v-ref)/Math.max(ref,1e-9);if(mar>=.1)S.push({k,label:RLL_LAB[k],value:v,unit:RLL_UNIT[k],gap:mar})}}
  const af=rllAfter(a),pe=rllPeriods(a,Math.min(3,Math.max(1,a.length))),ex=[];
  const c=af.conceded;if(c.n>=3&&c.before.speed&&c.after.speed&&c.after.speed<c.before.speed*.95)W.push({k:'tilt_speed',label:'Vitesse après un but encaissé',value:c.after.speed,ref:c.before.speed,unit:' uu/s',txt:'Après un but encaissé, tu ralentis : '+Math.round(c.after.speed)+' uu/s contre '+Math.round(c.before.speed)+' avant.',drill:'Respire et relance vite : ramasse un boost, puis rejoue à ta vitesse normale. Un but encaissé ne change rien au plan de rotation.',gap:(c.before.speed-c.after.speed)/c.before.speed*2});
  if(c.n>=3&&c.before.behind!=null&&c.after.behind!=null&&c.after.behind<c.before.behind-6)W.push({k:'tilt_pos',label:'Placement après un but encaissé',value:c.after.behind,ref:c.before.behind,unit:' %',txt:'Après un but encaissé, tu te places moins souvent derrière la balle ('+Math.round(c.after.behind)+' % contre '+Math.round(c.before.behind)+' %).',drill:'Quand on a encaissé, reviens d’abord derrière la balle (3e homme) avant de relancer l’attaque : l’envie de rattraper le score est la cause n°1 des buts en cascade.',gap:(c.before.behind-c.after.behind)/100*2});
  if(pe.length>=3){const f=pe[0],l=pe.at(-1);if(f.sup!=null&&l.sup!=null&&l.cnt>=3&&l.sup<f.sup*.7&&f.sup-l.sup>=4)W.push({k:'fade',label:'Rythme en fin de match',value:l.sup,ref:f.sup,unit:' %',txt:'Tu es nettement moins souvent supersonique en fin de match ('+fnum(l.sup,0)+' % à la minute '+l.n+' contre '+fnum(f.sup,0)+' % à la minute '+f.n+').',drill:'Garde le même rythme : ramasse les petits boosts en continu et évite de rester à l’arrêt en attente ; en fin de match la vitesse fait la différence.',gap:(f.sup-l.sup)/Math.max(f.sup,1)})}
  W.sort((x,y)=>y.gap-x.gap);S.sort((x,y)=>y.gap-x.gap);
  return{weak:W.slice(0,maxW),strong:S.slice(0,3),ctx:m}}
/* Moyenne glissante sur n points (ignore les valeurs absentes) */
const rllRoll=(v,n=5)=>v.map((_,i)=>{const w=v.slice(Math.max(0,i-n+1),i+1).filter(x=>x!=null);return w.length?w.reduce((s,x)=>s+x,0)/w.length:null});
