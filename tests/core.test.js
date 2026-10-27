// Tests unitaires (node, sans navigateur) des fonctions pures de core.js : node --test tests/
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','core.js'),'utf8'),ctx,{filename:'core.js'});
const run=c=>vm.runInContext(c,ctx);
const setD=o=>{run('for(const k of Object.keys(D))delete D[k]');Object.assign(run('D'),o)};
const near=(a,b,e=1e-6)=>(typeof e=='string'&&(e=1e-6),0)||assert.ok(Math.abs(a-b)<e,`${a} ≉ ${b}`);

test('codStepVal : paliers I–V puis rangs sans division',()=>{
  assert.equal(run("codStepVal('Novice','I')"),1);
  assert.equal(run("codStepVal('Novice','V')"),5);
  assert.equal(run("codStepVal('Vétéran','I')"),6);
  assert.equal(run("codStepVal('Pro','V')"),20);
  assert.equal(run("codStepVal('Maître',null)"),21);
  assert.equal(run("codStepVal('Légendaire')"),23);
  assert.equal(run("codStepVal('Maître','II')"),null,'Maître n\'a pas de division');
  assert.equal(run("codStepVal('Inconnu','I')"),null);
});
test('kdOf : ignore les parties incomplètes, pas de division par zéro',()=>{
  assert.equal(run('kdOf([])'),null);
  near(run('kdOf([{kills:10,deaths:5},{kills:5,deaths:5}])'),1.5);
  near(run('kdOf([{kills:7,deaths:0}])'),7);
  near(run("kdOf([{kills:4,deaths:2},{kills:'x',deaths:1},{kills:3}])"),2);
});
test('wr : victoires, BR gagnée à la 1re place, parties sans résultat ignorées',()=>{
  assert.equal(run('wr([])'),null);
  near(run("wr([{result:'win'},{result:'loss'},{result:'win'},{}])"),100*2/3);
  near(run("wr([{type:'BR',placement:1},{type:'BR',placement:4}])"),50);
  near(run("wr([{result:'draw'},{result:'win'}])"),50);
});
test('vAgg : K/D, HS %, ADR, ACS, premières éliminations',()=>{
  const g=run(`vAgg([{result:'win',kills:20,deaths:10,assists:5,head:10,body:30,leg:10,rounds:20,dmg:3000,score:4000,first_kills:3},
                    {result:'loss',kills:10,deaths:10,assists:5,head:5,body:15,leg:5,rounds:20,dmg:2000,score:3000}])`);
  assert.equal(g.n,2);assert.equal(g.w,1);near(g.wr,50);near(g.kd,1.5);near(g.kda,2);
  near(g.hs,100*15/75);near(g.adr,125);near(g.acs,175);assert.equal(g.fk,3);assert.equal(g.fkn,1);
  const e=run('vAgg([])');assert.equal(e.n,0);assert.equal(e.kd,null);assert.equal(e.hs,null);assert.equal(e.wr,null);
});
test('goalProg : heures, succès, K/D COD, niveau, rang COD',()=>{
  setD({games:[{appid:1,name:'Jeu A',hours:30,pct:50}],totalH:120,ach:40,cod:[{kills:10,deaths:5},{kills:10,deaths:5}],xp:{L:10},ranks:{MP:[{value:6,label:'Vétéran I'}],BR:[]}});
  let p=run("goalProg({type:'game_hours',appid:1,target:60})");assert.equal(p.cur,30);near(p.p,50);assert.match(p.label,/Jeu A/);
  p=run("goalProg({type:'game_ach',appid:1,target:100})");near(p.p,50);
  p=run("goalProg({type:'total_hours',target:100})");near(p.p,120);
  p=run("goalProg({type:'achievements',target:80})");near(p.p,50);
  p=run("goalProg({type:'cod_kd',target:1})");near(p.cur,2);near(p.p,200);
  p=run("goalProg({type:'level',target:20})");near(p.p,50);
  p=run("goalProg({type:'cod_rank',mode:'MP',target:11,start:6})");assert.equal(p.done,false);near(p.p,0);
  run("D.ranks.MP.push({value:11,label:'Élite I'})");p=run("goalProg({type:'cod_rank',mode:'MP',target:11,start:6})");assert.equal(p.done,true);near(p.p,100);
  p=run("goalProg({type:'inconnu',target:1})");assert.equal(p.p,0);
});
test('steamWin : écart de temps de jeu sur la fenêtre, base la plus récente avant la fenêtre',()=>{
  const d=n=>new Date(Date.now()-n*864e5).toISOString();
  setD({steamH:[{fetched_at:d(40),games:[{appid:1,playtime_forever:100}]},{fetched_at:d(10),games:[{appid:1,playtime_forever:200},{appid:2,playtime_forever:5}]},{fetched_at:d(0),games:[{appid:1,playtime_forever:260},{appid:2,playtime_forever:65}]}]});
  let w=run('steamWin(7)');assert.equal(w.full,true);assert.equal(w.m[1],60);assert.equal(w.m[2],60);
  w=run('steamWin(30)');assert.equal(w.m[1],160);assert.equal(w.m[2],undefined,'jeu absent de la base : pas d\'écart inventé');
  w=run('steamWin(90)');assert.equal(w.full,false);assert.equal(w.m[1],160);
  setD({steamH:[{fetched_at:d(0),games:[]}]});assert.equal(run('steamWin(7)'),null);
});

test('codKey / codFind : clé stable (id, sinon minute UTC), ancienne clé toujours valable',()=>{
  run(`var L=[{id:'a1',date:'2026-10-19T13:11:29+02:00'},{id:null,date:'2026-10-15T15:00:47Z'}]`);
  const k='t'+Math.floor(Date.parse('2026-10-15T15:00:47Z')/6e4);
  assert.equal(run('codKey(L[0])'),'a1');
  assert.equal(run('codKey(L[1])'),k);
  assert.equal(run('codFind(L,"a1")'),0);
  assert.equal(run(`codFind(L,"${k}")`),1);
  assert.equal(run('codFind(L,"zzz")'),-1);
  assert.equal(run('codKey({})'),null);
  // partie synchronisée ensuite (id donné par le robot) : l'ancienne clé minute la retrouve encore
  assert.equal(run(`codFind([{id:'app-202610151500',date:'2026-10-15T15:00:10Z'}],"${k}")`),0);
});
test('rlStyle : texte offensif / défensif / équilibré calculé',()=>{
  assert.match(run('rlStyle({goals_pct:54.8,saves_pct:23.1,assists_pct:22.1})'),/offensif/);
  assert.match(run('rlStyle({goals_pct:20,saves_pct:45})'),/défensif/);
  assert.match(run('rlStyle({goals_pct:33,saves_pct:30})'),/équilibré/);
  assert.equal(run('rlStyle({})'),'');
  assert.equal(run('MIN_SAMPLE'),5);
});
test('codMapRank : minimum de parties, pas de « pire carte » à 100 %',()=>{
  const M=(map,result,k,d)=>({type:'MP',map,result,kills:k,deaths:d});
  // cas réel du bug : cartes à 1 partie, toutes gagnées -> rien
  let r=run(`codMapRank(${JSON.stringify([M('Express','win',7,1),M('Nuketown','win',20,3),M('Stand de tir','win',16,5),M('Stand de tir','win',44,4)])})`);
  assert.equal(r.ok,false);assert.equal(r.worst,null);assert.equal(r.eligible,0);
  // 2 cartes avec 3 parties : la pire = moins de victoires
  const L=[M('A','win',10,5),M('A','win',8,4),M('A','loss',6,6),M('B','loss',3,9),M('B','loss',4,8),M('B','win',7,7),M('C','loss',0,9)];
  r=run(`codMapRank(${JSON.stringify(L)})`);
  assert.equal(r.ok,true);assert.equal(r.best.map,'A');assert.equal(r.worst.map,'B');assert.equal(r.eligible,2);assert.equal(r.maps,3);
  assert.ok(Math.abs(r.worst.wr-100/3)<1e-9);assert.equal(r.worst.n,3);
  // égalité parfaite -> pas de pire carte inventée
  r=run(`codMapRank(${JSON.stringify([M('A','win',5,5),M('A','win',5,5),M('A','win',5,5),M('B','win',5,5),M('B','win',5,5),M('B','win',5,5)])})`);
  assert.equal(r.ok,false);
  // BR ignoré
  r=run(`codMapRank(${JSON.stringify([{type:'BR',map:'Isolated',placement:1},{type:'BR',map:'Isolated',placement:1},{type:'BR',map:'Isolated',placement:1}])})`);assert.equal(r.maps,0);
});

/* ===== t94 ===== */
const deq=(a,b,m)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),b,m);
const T=s=>Date.parse(s);
test('weekStart / monthStart : lundi et 1er du mois à minuit heure de Paris, changement d’heure compris',()=>{
  assert.equal(new Date(run(`weekStart(${T('2026-10-27T17:00:00Z')})`)).toISOString(),'2026-10-25T23:00:00.000Z'); // lun. 26 oct. 00:00 (UTC+1)
  assert.equal(new Date(run(`weekStart(${T('2026-10-25T21:30:00Z')})`)).toISOString(),'2026-10-18T22:00:00.000Z'); // dim. 25 23:30 Paris → lun. 19 (UTC+2)
  assert.equal(new Date(run(`weekStart(${T('2026-10-25T23:30:00Z')})`)).toISOString(),'2026-10-25T23:00:00.000Z'); // lun. 26 00:30 Paris
  assert.equal(new Date(run(`monthStart(${T('2026-11-01T10:00:00Z')})`)).toISOString(),'2026-10-31T23:00:00.000Z');
  const p=run(`periodOf('S',${T('2026-10-21T12:00:00Z')})`);assert.equal(p.key,'S2026-10-19');assert.equal(p.to-p.from,7*864e5+36e5,'semaine du passage à l’heure d’hiver = 169 h');
  assert.equal(run(`periodFromKey('M2026-10').key`),'M2026-10');assert.equal(run(`periodFromKey('S2026-10-19').from`),p.from);assert.equal(run(`periodFromKey('x')`),null);
});
test('periodList : de la période en cours jusqu’à la première donnée, la plus récente d’abord',()=>{
  const L=run(`periodList('S',${T('2026-10-07T10:00:00Z')},${T('2026-10-27T10:00:00Z')})`);
  deq(L.map(p=>p.key),['S2026-10-26','S2026-10-19','S2026-10-12','S2026-10-05']);
  deq(run(`periodList('M',NaN,1)`),[]);
});
const SRC=`({vh:{mmr_history:[{date:'2026-10-13T20:00:00Z',change:20,elo:620,tier:'Silver 1'},{date:'2026-10-20T20:00:00Z',change:-10,elo:610,tier:'Silver 1'},{date:'2026-10-21T20:00:00Z',change:30,elo:640,tier:'Silver 1'}],
  matches:[{date:'2026-10-20T20:00:00Z',mode:'Competitive',result:'loss',kills:10,deaths:15},{date:'2026-10-21T20:00:00Z',mode:'Competitive',result:'win',kills:20,deaths:10},{date:'2026-10-21T21:00:00Z',mode:'Deathmatch',kills:40,deaths:20},{date:'2026-10-13T20:00:00Z',mode:'Competitive',result:'win',kills:12,deaths:12}]},
  cod:[{date:'2026-10-20T12:00:00+02:00',kills:20,deaths:10,result:'win',damage:2000},{date:'2026-10-14T12:00:00+02:00',kills:10,deaths:10,result:'loss',damage:1000}],
  rl:[{date:'2026-10-20T19:00:00Z',result:'win',goals:2,saves:1,id:'a'},{date:'2026-10-20T19:10:00Z',result:'win',goals:3,saves:0,id:'b'},{date:'2026-10-20T19:20:00Z',result:'loss',goals:0,saves:2,id:'c'}],
  steamH:[{fetched_at:'2026-10-11T22:00:00Z',games:[{appid:1,playtime_forever:100}]},{fetched_at:'2026-10-18T21:00:00Z',games:[{appid:1,playtime_forever:160}]},{fetched_at:'2026-10-25T21:00:00Z',games:[{appid:1,playtime_forever:400}]}]})`;
test('periodStats : chaque jeu sur la période (classé seulement pour Valorant)',()=>{
  const P=run(`periodOf('S',${T('2026-10-21T12:00:00Z')})`);const s=run(`periodStats(${SRC},${P.from},${P.to})`);
  assert.equal(s.val.n,2);near(s.val.wr,50);near(s.val.kd,30/25);assert.equal(s.val.rr,20);assert.equal(s.val.elo,640);
  assert.equal(s.cod.n,1);near(s.cod.kd,2);assert.equal(s.rl.n,3);near(s.rl.wr,200/3);near(s.rl.goals,5/3);
  assert.equal(s.steam.min,240,'400 − 160 min (relevé ≤ début → dernier relevé avant la fin)');
  const e=run(`periodStats({vh:null,cod:[],rl:[],steamH:[]},0,1)`);assert.equal(e.val.n,0);assert.equal(e.val.wr,null);assert.equal(e.steam.min,null);
});
test('compareStats / weekRecap : écarts et sens (▲ mieux)',()=>{
  const R=run(`weekRecap(${SRC},${T('2026-10-27T10:00:00Z')})`);assert.equal(R.week.key,'S2026-10-19');assert.equal(R.prev.key,'S2026-10-12');assert.ok(R.played);
  const g=(x,k)=>R.rows.find(r=>r.g==x&&r.k==k);
  assert.equal(g('val','rr').d,0);assert.equal(g('val','rr').dir,0);
  near(g('cod','kd').d,1);assert.equal(g('cod','kd').dir,1);near(g('steam','min').a,4);near(g('steam','min').b,1);
  assert.equal(run(`compareStats(null,null)`).length,0);
});
test('records : pics, séries de victoires, maximum par partie ; Deathmatch exclu',()=>{
  const R=run(`records(${SRC})`),g=id=>R.find(r=>r.id==id);
  assert.equal(g('val_elo').v,640);assert.equal(g('val_kills').v,20,'le Deathmatch (40) ne compte pas');assert.equal(g('val_streak').v,1);
  assert.equal(g('cod_kills').v,20);near(g('cod_kd').v,2);assert.equal(g('rl_streak').v,2);assert.equal(g('rl_streak').cur,0);assert.equal(g('rl_goals').v,3);assert.equal(g('rl_goals').link,'#/rl/b');
  deq(run(`streaks([{date:'1',result:'win'},{date:'2',result:'win'},{date:'3'},{date:'4',result:'win'}],x=>x.result=='win',x=>!!x.result)`),{best:3,bestAt:'4',cur:3},'parties sans résultat ignorées');
  assert.equal(run(`records({})`).length,0);
});
test('recordsUpdate : 1re visite = point de départ, puis record battu signalé 7 jours',()=>{
  const a=run(`recordsUpdate(null,[{id:'x',v:5}],1000)`);assert.equal(a.beaten.length,0);assert.equal(a.st.v.x,5);
  ctx.ST=a.st;const b=run(`recordsUpdate(ST,[{id:'x',v:7},{id:'y',v:2}],2000)`);deq(b.beaten.map(r=>r.id),['x'],'un nouveau type de record n’est pas « battu »');assert.equal(b.st.b.x,2000);
  ctx.ST=b.st;const c=run(`recordsUpdate(ST,[{id:'x',v:6}],2000+8*864e5)`);assert.equal(c.beaten.length,0);assert.equal(c.st.v.x,7,'on garde le meilleur');assert.equal(c.st.b.x,undefined,'badge expiré');
});
test('goalsUpdate : objectif atteint une seule fois, progression gardée entre deux relevés',()=>{
  const a=run(`goalsUpdate(null,[{id:1,p:90,done:false}],1)`);assert.equal(a.reached.length,0);
  ctx.GS=a.st;const b=run(`goalsUpdate(GS,[{id:1,p:100,done:true},{id:2,p:100,done:true}],2)`);deq(b.reached.map(g=>g.id),[1],'un objectif ajouté déjà atteint ne déclenche pas d’alerte');assert.equal(b.recent.length,1);
  ctx.GS=b.st;const c=run(`goalsUpdate(GS,[{id:1,p:100,done:true}],3)`);assert.equal(c.reached.length,0,'pas de 2e alerte');assert.equal(c.st[1].t,2);
  ctx.GS=run(`goalsUpdate(null,[{id:3,p:10}],1)`).st;ctx.GS=run(`goalsUpdate(GS,[{id:3,p:30}],2)`).st;assert.equal(ctx.GS[3].d,20);ctx.GS=run(`goalsUpdate(GS,[{id:3,p:30}],3)`).st;assert.equal(ctx.GS[3].d,20,'écart conservé tant que rien ne bouge');
});
test('snapEvents : rang Valorant et nouveaux replays RL',()=>{
  const e=run(`snapEvents({vt:9,vn:'Silver 1',rlN:5},{vt:10,vn:'Silver 2',rlN:7})`);assert.equal(e.length,2);assert.match(e[0].title,/promotion/);assert.equal(e[0].body,'Argent 1 → Argent 2');assert.match(e[1].title,/2 nouveaux replays/);
  assert.equal(run(`snapEvents(null,{vt:1})`).length,0);assert.equal(run(`snapEvents({vt:9,rlN:3},{vt:9,rlN:3})`).length,0);
  assert.match(run(`snapEvents({vt:10,vn:'Silver 2'},{vt:9,vn:'Silver 1'})`)[0].title,/rétrogradation/);
});

test('t95 : objectifs de rang par divisions, départ = division 1 de la catégorie en dessous',()=>{
  assert.equal(run("rankStart('val_rank',12)"),9,'Or 1 → Argent 1');assert.equal(run("rankStart('val_rank',10)"),6,'Argent 2 → Bronze 1');
  assert.equal(run("rankStart('val_rank',4)"),3,'Fer : plancher');assert.equal(run("rankStart('val_rank',27)"),24,'Radiant → Immortel 1');
  const V=(id,rr,tg)=>{setD({games:[],vh:{mmr:{tier_id:id,rr,tier:'x'},mmr_history:[],matches:[]}});return run(`goalProg({type:'val_rank',target:${tg},start:999})`).p};
  near(V(9,0,12),0);near(V(10,0,12),100/3);near(V(11,0,12),200/3);near(V(12,0,12),100);near(V(9,84,12),28);
  near(V(10,0,13),25,'Argent 1→Or 2 : Argent 2 = 1/4');near(V(12,0,13),75,'Or 1 sur la route d\u2019Or 2 = 3/4');near(V(15,0,12),100);
  assert.equal(run("rankStart('rl_rank',9)"),24,'Platine I → Or I div I');assert.equal(run("rankStart('rl_rank',7)"),12,'Or II → Argent I');assert.equal(run("rankStart('rl_rank',21)"),72,'SSL → GC I');
  const R=(t,d,tg)=>{setD({games:[],rlm:{playlists:[{id:'3v3',tier:t,div:d,tier_name:'x'}]}});return run(`goalProg({type:'rl_rank',playlist:'3v3',target:${tg},div:1,start:0})`).p};
  near(R(6,1,9),0);near(R(7,1,9),100/3);near(R(9,1,9),100);near(R(4,3,7),100*6/16);
  assert.equal(run("rankStart('cod_rank',36)"),22);assert.equal(run("rankStart('cod_rank',11)"),6);assert.equal(run("rankStart('cod_rank',3)"),1);
});
