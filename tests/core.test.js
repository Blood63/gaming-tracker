// Tests unitaires (node, sans navigateur) des fonctions pures de core.js : node --test tests/
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','core.js'),'utf8'),ctx,{filename:'core.js'});
const run=c=>vm.runInContext(c,ctx);
const setD=o=>{run('for(const k of Object.keys(D))delete D[k]');Object.assign(run('D'),o)};
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} ≉ ${b}`);

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
  p=run("goalProg({type:'cod_rank',mode:'MP',target:11,start:6})");assert.equal(p.cur,0);assert.equal(p.done,false);near(p.p,0);
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
