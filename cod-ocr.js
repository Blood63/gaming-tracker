/* OCR COD Mobile (client) — 2 captures par partie : 1) « Détails de la partie » (tableau des scores), 2) « Détails » onglet Impact.
   Mise en page relative (captures paysage, ex. 2712×1220). Tesseract.js chargé à la demande. */
const COD_OCR={T:null,
  async worker(){if(this.T)return this.T;if(!window.Tesseract)await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=ok;s.onerror=()=>ko(new Error('Impossible de charger le moteur OCR (connexion ?)'));document.head.appendChild(s)});
    this.T=await Tesseract.createWorker(['fra','eng'],1);return this.T},
  async load(file){const url=URL.createObjectURL(file);try{const im=new Image();im.src=url;await im.decode();return im}finally{setTimeout(()=>URL.revokeObjectURL(url),5000)}},
  // découpe une zone (fractions) → canvas agrandi, niveaux de gris, inversé (texte clair sur fond sombre), contraste
  crop(im,x0,y0,x1,y1,{scale=3,inv=true,thr=null,nobars=false}={}){const W=im.naturalWidth,H=im.naturalHeight,sx=x0*W,sy=y0*H,sw=(x1-x0)*W,sh=(y1-y0)*H;
    const k=scale*1400/W,c=document.createElement('canvas');c.width=Math.round(sw*k);c.height=Math.round(sh*k);
    const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=g.getImageData(0,0,c.width,c.height),p=d.data;
    for(let i=0;i<p.length;i+=4){let v=Math.max(p[i],p[i+1],p[i+2]);if(inv)v=255-v;if(thr!=null)v=v<thr?0:255;p[i]=p[i+1]=p[i+2]=v}
    if(nobars){const w=c.width,h=c.height;for(let x=0;x<w;x++){let n=0;for(let y=0;y<h;y++)if(p[(y*w+x)*4]<110)n++;if(n>.7*h)for(let y=0;y<h;y++){const i=(y*w+x)*4;p[i]=p[i+1]=p[i+2]=255}}}
    g.putImageData(d,0,0);return c},
  async read(c,{psm='7',wl=''}={}){const w=await this.worker();await w.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:wl,preserve_interword_spaces:'1'});const r=await w.recognize(c);return r.data.text.replace(/\s+/g,' ').trim()},
  async tryScales(im,box,opts,valid,scales=[3,4.5,6,2]){let last='';for(const sc of scales){const t=await this.read(this.crop(im,...box,{...opts.crop,scale:sc}),opts.read||{});last=t;if(valid(t))return t}return last},
  int:s=>{const m=String(s).replace(/[oO]/g,'0').replace(/[^\d]/g,'');return m?parseInt(m,10):null},
  lev(a,b){a=a.toLowerCase();b=b.toLowerCase();const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[a.length][b.length]},
  ROWS:[.386,.488,.59,.692,.794],RH:.042,
  MODES:['Point stratégique','Recherche et Destruction','Match à mort par équipe','Domination','Contrôle','Élimination confirmée','Prise d\'otage','Fusillade','Tir à la cible','Attaque frontale','Mêlée générale','Chacun pour soi','Pendaison','Infecté','Gun Game'],
  norm:s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  async header(im){const o={};
    const tab=await this.read(this.crop(im,.035,.015,.25,.075),{});o.kind=/partie/i.test(tab)?'scoreboard':/d[ée]tails/i.test(tab)?'details':null;o.tab_text=tab;
    const res=await this.read(this.crop(im,.0,.07,.225,.17,{thr:110}),{wl:'VICTOIREDÉFAITEGALÉ0123456789:'});o.result_text=res;
    o.result=/VICT/i.test(res)?'win':/D[ÉE]F/i.test(res)?'loss':/GAL/i.test(res)?'draw':null;
    const sc=res.match(/(\d{1,3})\s*:\s*(\d{1,3})/);if(sc){o.score_team=+sc[1];o.score_enemy=+sc[2]}
    const DRX=/(\d{2}):?(\d{2}):?(\d{2})\s*(\d{2})-(\d{2})-(\d{2})/;const ts=await this.tryScales(im,[.005,.165,.12,.195],{read:{wl:'0123456789:- '}},t=>DRX.test(t),[4,3,6,8,10]);o.ts_text=ts;
    const t=ts.match(DRX);if(t)o.date=`20${t[4]}-${t[5]}-${t[6]}T${t[1]}:${t[2]}:${t[3]}`;
    const mm=await this.read(this.crop(im,.005,.195,.3,.235,{scale:3}),{});o.mode_text=mm;
    const n=this.norm(mm);const md=this.MODES.find(x=>n.startsWith(this.norm(x)))||this.MODES.map(x=>[x,this.lev(this.norm(x),n.slice(0,x.length))]).sort((a,b)=>a[1]-b[1]).filter(x=>x[1]<=3).map(x=>x[0])[0];
    if(md){o.mode=md;const rest=mm.slice(md.length).trim();o.map=rest?rest.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()):null}
    return o},
  async findRow(im,player){let best=null;
    for(const side of [0,1])for(let i=0;i<5;i++){const y=this.ROWS[i],x0=side?.588:.098,t=await this.read(this.crop(im,x0,y-this.RH,x0+.09,y-.004,{scale:3}),{});
      const w=t.split(' ').map(s=>s.replace(/[^\w]/g,'')).filter(Boolean),dist=Math.min(99,...w.map(s=>this.lev(s,player)));
      if(!best||dist<best.dist)best={side,i,dist,text:t}}
    return best&&best.dist<=3?best:null},
  cells(side,xs){const off=side?.492:0;return xs.map(([a,b])=>[a+off,b+off])},
  async analyse(file,player='NVCBlood'){const im=await this.load(file),h=await this.header(im),out={kind:h.kind,header:h,fields:{}};
    const row=await this.findRow(im,player);out.row=row;if(!row){out.error=`Ligne « ${player} » introuvable`;return out}
    const y=this.ROWS[row.i],cy0=y-.024,cy1=y+.026,F=out.fields;F.team_place=row.i+1;F.side=row.side?'enemy':'team';
    const rd=async([a,b],wl='0123456789',ok=t=>/^\d+$/.test(t.replace(/\s/g,'')))=>this.tryScales(im,[a,cy0,b,cy1],{read:{wl}},ok,[3,4.5,2,6]);
    if(h.kind=='scoreboard'){
      const [c1,c2,c3,c4]=this.cells(row.side,[[.212,.268],[.275,.35],[.35,.415],[.415,.475]]);
      F.score=this.int(await rd(c1));const ema=(await rd(c2,'0123456789/',t=>/^\d+\/\d+\/\d+$/.test(t.replace(/\s/g,'')))).match(/(\d+)\D+(\d+)\D+(\d+)/);if(ema){F.kills=+ema[1];F.deaths=+ema[2];F.assists=+ema[3]}
      const tm=(await rd(c3,'0123456789:',t=>/^\d{2}:\d{2}$/.test(t.replace(/\s/g,'')))).match(/(\d{1,2}):?(\d{2})/);if(tm){F.objective_time=tm[1].padStart(2,'0')+':'+tm[2];F.objective_time_s=+tm[1]*60+ +tm[2]}
      F.impact=this.int(await rd(c4));
      // valeurs d'en-tête : une seule ligne « | 110 | 5881 | 6.67 | 34.4 % | 0.0 % » (les barres séparent les valeurs)
      const fl=v=>{const m=String(v).replace(',','.').match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):null};
      const line=await this.tryScales(im,[.53,.163,.995,.205],{crop:{nobars:true},read:{wl:'0123456789., %'}},t=>{const a=(t.replace(/,/g,'.').match(/\d+(\.\d+)?/g)||[]);return a.length==5&&+a[3]<=100&&+a[4]<=100},[3,4.5,6,2]);out.header_values_text=line;
      const tok=(line.replace(/,/g,'.').match(/\d+(\.\d+)?/g)||[]);
      if(tok.length==5){F.rank_xp=this.int(tok[0]);F.xp_gained=this.int(tok[1]);F.kd=fl(tok[2]);F.accuracy_pct=fl(tok[3]);F.headshot_pct=fl(tok[4])}
      else{const hv=async(a,b,wl)=>this.read(this.crop(im,a,.163,b,.205,{scale:3}),{wl});
        F.rank_xp=this.int(await hv(.538,.598,'0123456789'));F.xp_gained=this.int(await hv(.637,.72,'0123456789'));
        F.kd=fl(await hv(.732,.81,'0123456789.,'));F.accuracy_pct=fl(await hv(.824,.905,'0123456789.,%'));F.headshot_pct=fl(await hv(.918,.99,'0123456789.,%'))}
      if(F.kills!=null&&F.deaths!=null){const k=F.deaths?F.kills/F.deaths:F.kills;if(F.kd==null||Math.abs(F.kd-k)>.06){out.notes=(out.notes||[]).concat(`ratio É/M lu ${F.kd} → recalculé`);F.kd=Math.round(k*100)/100}}
      for(const k of ['accuracy_pct','headshot_pct'])if(F[k]!=null&&F[k]>100){F[k]=null;out.notes=(out.notes||[]).concat(k+' illisible')}
      const mvp=await this.tryScales(im,[(row.side?.492:0)+.175,y-.05,(row.side?.492:0)+.215,y-.022],{},t=>/mvp|mv|vp/i.test(t),[4,6,3]);F.mvp=/mvp|mv|vp/i.test(mvp);out.mvp_text=mvp;
    }else if(h.kind=='details'){
      const [c1,c2,c3]=this.cells(row.side,[[.205,.272],[.3,.37],[.39,.475]]);
      F.damage=this.int(await rd(c1));F.capture_kills=this.int(await rd(c2));F.distance=this.int(await rd(c3));
    }
    return out}
};
