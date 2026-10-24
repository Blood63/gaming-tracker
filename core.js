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
