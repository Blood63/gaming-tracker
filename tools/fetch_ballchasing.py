#!/usr/bin/env python3
"""Rocket League via ballchasing.com (env BALLCHASING_API_KEY). Replays de 443Blood (envoyés par le compte = uploader=me, ou recherchés par nom).
Écrit ballchasing_latest.json (replays cumulés + stats par playlist) et ajoute un résumé à history/ballchasing.jsonl.
Ne touche JAMAIS rocket_league.json (données manuelles)."""
import json, os, sys, time, datetime, urllib.request, urllib.error, urllib.parse
# Compte Epic de 443Blood (ancien pseudo M8_Blood) : reconnu par son id Epic ou son nom.
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/ballchasing_latest.json"
K=os.environ.get("BALLCHASING_API_KEY"); NAMES={"443blood","m8_blood"}; IDS={("epic","8d1cf32b760442a297d5e317093fe9b0")}; B="https://ballchasing.com/api"
EXCLUDE={"7db888fc-1480-4a66-a78c-788b60e97856"}  # replay du 16/04/2026 (débutant) : exclu des stats (reste sur ballchasing)
MIN_DATE="2026-10-01"  # replays plus anciens ignorés
PL={"ranked-duels":"1v1","ranked-doubles":"2v2","ranked-standard":"3v3","unranked-duels":"Occasionnel 1v1","unranked-doubles":"Occasionnel 2v2","unranked-standard":"Occasionnel 3v3"}
def get(p):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(B+p,headers={"Authorization":K}),timeout=30) as f: time.sleep(0.6); return json.loads(f.read().decode())
        except urllib.error.HTTPError as e:
            if e.code==429 and i<3: time.sleep(5*(i+1)); continue
            raise RuntimeError(f"HTTP {e.code} {p.split('?')[0]}")

def metrics(me):
    st=me.get("stats") or {}; c=st.get("core") or {}; b=st.get("boost") or {}; mv=st.get("movement") or {}; po=st.get("positioning") or {}; de=st.get("demo") or {}
    r=lambda x,n=1: None if x is None else round(x,n)
    col=b.get("amount_collected") or 0
    return {"shooting_pct":r(c.get("shooting_percentage")),"shots_against":c.get("shots_against"),"goals_against":c.get("goals_against"),"clears":c.get("clears"),"centers":c.get("centers"),"aerial_hits":c.get("aerial_hits"),
      "bpm":r(b.get("bpm"),0),"avg_boost":r(b.get("avg_amount")),"pct_zero_boost":r(b.get("percent_zero_boost")),"pct_full_boost":r(b.get("percent_full_boost")),
      "stolen":b.get("amount_stolen"),"overfill_pct":r(100*(b.get("amount_overfill") or 0)/col) if col else None,"small_pads":b.get("count_collected_small"),"big_pads":b.get("count_collected_big"),
      "avg_speed":mv.get("avg_speed"),"pct_supersonic":r(mv.get("percent_supersonic_speed")),"pct_slow":r(mv.get("percent_slow_speed")),"pct_ground":r(mv.get("percent_ground")),"pct_high_air":r(mv.get("percent_high_air")),
      "powerslides":mv.get("count_powerslide"),
      "pct_def_third":r(po.get("percent_defensive_third")),"pct_off_third":r(po.get("percent_offensive_third")),"pct_behind_ball":r(po.get("percent_behind_ball")),
      "pct_most_back":r(po.get("percent_most_back")),"pct_most_forward":r(po.get("percent_most_forward")),"pct_closest_ball":r(po.get("percent_closest_to_ball")),"dist_mates":po.get("avg_distance_to_mates"),
      "demos":de.get("inflicted"),"demos_taken":de.get("taken")}

# Repères indicatifs pour un joueur Or en 3v3 (estimation, d'après les moyennes courantes ballchasing) : (min idéal, max idéal)
BENCH={"shooting_pct":(30,None),"avg_boost":(28,45),"pct_zero_boost":(None,12),"pct_full_boost":(None,14),"pct_supersonic":(10,None),"pct_slow":(None,50),
  "pct_behind_ball":(65,None),"pct_most_forward":(None,42),"pct_most_back":(20,45),"overfill_pct":(None,15),"bpm":(300,None),"pct_closest_ball":(None,42)}
LABEL={"shooting_pct":"Précision de tir","avg_boost":"Boost moyen","pct_zero_boost":"Temps à 0 boost","pct_full_boost":"Temps à 100 boost","pct_supersonic":"Temps supersonique",
  "pct_slow":"Temps à vitesse lente","pct_behind_ball":"Temps derrière la balle","pct_most_forward":"Temps en joueur le plus avancé","pct_most_back":"Temps en dernier défenseur",
  "overfill_pct":"Boost gaspillé (surplus)","bpm":"Boost ramassé / min","pct_closest_ball":"Temps au plus près de la balle"}
UNIT={"bpm":""}
TIPS={
 "shooting_pct":("Tes tirs manquent souvent le cadre.","Training packs de tir débutant/intermédiaire (menu Entraînement › Packs de la communauté, recherche « shooting ») et 10 min de free play à frapper la balle au sol vers le but en visant les coins."),
 "avg_boost":("Gestion du boost à revoir.","Joue « Boost minimum » : ramasse surtout les petites pastilles sur ton trajet et ne roule pas en boostant à fond sans raison."),
 "pct_zero_boost":("Tu passes trop de temps sans boost : tu es lent et vulnérable.","Après chaque action, repasse par 2-3 petites pastilles avant de revenir ; en free play, fais des tours de terrain en ramassant uniquement les petites pastilles."),
 "pct_full_boost":("Tu gardes ton boost plein trop longtemps (boost « dormant »).","Utilise ton boost dès 100 pour gagner en vitesse ou mettre la pression ; vise à arriver à la balle avec 30-60 de boost."),
 "pct_supersonic":("Tu ne joues pas assez vite.","Free play : fais des tours de terrain en restant supersonique (boost court + flips au sol/wavedash) et, en match, garde ta vitesse en rotation au lieu de freiner."),
 "pct_slow":("Tu passes beaucoup de temps à vitesse lente.","Évite de freiner/attendre : en rotation, flippe au sol pour garder de la vitesse ; entraîne les « half-flips » pour te retourner vite."),
 "pct_behind_ball":("Tu es souvent devant la balle (hors position).","Règle de base en 3v3 : reviens derrière la balle côté opposé (« back post ») avant de remonter ; regarde la mini-carte."),
 "pct_most_forward":("Tu es trop souvent le joueur le plus avancé : risque de double commit.","Applique la rotation en « cercle » : après ton touché, sors par le côté et redescends ; laisse le coéquipier le mieux placé jouer la balle."),
 "pct_most_back":("Ton équilibre attaque/défense est déséquilibré.","En 3v3, vise ~1/3 du temps en dernier défenseur : alterne 1er, 2e, 3e homme."),
 "overfill_pct":("Tu ramasses des gros boosts alors que tu en as déjà beaucoup.","Ne prends un gros boost (100) que sous 50 de boost ; sinon laisse-le ou vole celui de l'adversaire."),
 "bpm":("Tu ramasses peu de boost.","Trace tes rotations en passant sur les petites pastilles ; vole les gros boosts adverses quand tu es en attaque."),
 "pct_closest_ball":("Tu es souvent le plus près de la balle : tendance à « ball chase ».","Compte 1-2-3 : si un coéquipier est déjà sur la balle, reste en soutien (2e homme) au lieu d'y aller aussi."),
}
STRONG={k:v for k,v in {"shooting_pct":"Bonne précision devant le but","avg_boost":"Bonne gestion du boost","pct_zero_boost":"Rarement à court de boost","pct_supersonic":"Bonne vitesse de jeu","pct_behind_ball":"Bon placement derrière la balle","pct_most_forward":"Bonnes rotations (peu de surengagement)","overfill_pct":"Peu de boost gaspillé","bpm":"Bon ramassage de boost","pct_slow":"Rarement à l'arrêt","pct_closest_ball":"Tu laisses jouer tes coéquipiers"}.items()}
def judge(m):
    W=[];S=[]
    for k,(lo,hi) in BENCH.items():
        v=m.get(k)
        if v is None: continue
        if lo is not None and v<lo: W.append((k,(lo-v)/max(lo,1)))
        elif hi is not None and v>hi: W.append((k,(v-hi)/max(hi,1)))
        else:
            ref=lo if lo is not None else hi; marg=abs(v-ref)/max(ref,1)
            if k in STRONG: S.append((k,marg))
    W.sort(key=lambda x:-x[1]); S.sort(key=lambda x:-x[1])
    return {"weaknesses":[{"k":k,"label":LABEL[k],"value":m[k],"bench":BENCH[k],"txt":TIPS[k][0],"drill":TIPS[k][1]} for k,_ in W[:3]],
            "strengths":[{"k":k,"label":LABEL[k],"value":m[k],"txt":STRONG[k]} for k,_ in S[:3]]}
def weekly(reps):
    import collections
    W=collections.OrderedDict()
    for r in reps:
        if r.get("m") is None: continue
        d=datetime.date.fromisoformat(r["date"][:10]); y,w,_=d.isocalendar(); W.setdefault(f"{y}-S{w:02d}",[]).append(r)
    out=[]
    for k,a in W.items():
        avg=lambda key:(lambda v: round(sum(v)/len(v),1) if v else None)([x["m"][key] for x in a if x["m"].get(key) is not None])
        cnt=collections.Counter(w["k"] for x in a for w in (x.get("analysis") or {}).get("weaknesses",[])[:2])
        f=cnt.most_common(1)[0][0] if cnt else None
        out.append({"week":k,"start":min(x["date"] for x in a)[:10],"matches":len(a),"wins":sum(1 for x in a if x["result"]=="win"),
          "avg":{key:avg(key) for key in ("shooting_pct","avg_boost","pct_zero_boost","pct_supersonic","pct_behind_ball","pct_def_third","pct_most_forward","bpm")},
          "saves":round(sum(x.get("saves") or 0 for x in a)/len(a),2),"goals":round(sum(x.get("goals") or 0 for x in a)/len(a),2),
          "focus":{"k":f,"label":LABEL[f],"txt":TIPS[f][0],"drill":TIPS[f][1]} if f else None})
    return out

# ───────── Replays analysés localement (rl_local/index.json, voir tools/rl-analyzer) ─────────
LOCAL_IDX=f"{D}/rl_local/index.json"
LPL={13:"3v3",11:"2v2",10:"1v1",3:"Occasionnel 3v3",2:"Occasionnel 2v2",1:"Occasionnel 1v1"}
MAPS={"TrainStation_Dawn_P":"Urban Central (Dawn)","UtopiaStadium_Dusk_P":"Utopia Coliseum (Dusk)","EuroStadium_P":"Mannfield","TrainStation_Night_P":"Urban Central (Night)","stadium_day_p":"DFH Stadium (Day)","Park_Night_P":"Beckwith Park (Midnight)","Farm_GRS_P":"Farmstead (Pitched)","street_p":"Sovereign Heights (Dusk)","CHN_Stadium_P":"Forbidden Temple","cs_p":"Champions Field","Wasteland_GRS_P":"Wasteland (Pitched)","Underwater_GRS_P":"AquaDome (Salty Shallows)","NeoTokyo_Standard_P":"Neo Tokyo (Standard)","Outlaw_Oasis_P":"Deadeye Canyon (Oasis)","Beach_Night_GRS_P":"Salty Shores (Salty Fest)","Park_Rainy_P":"Beckwith Park (Stormy)","TrainStation_P":"Urban Central","Underwater_P":"Aquadome","UtopiaStadium_Lux_P":"Utopia Coliseum (Gilded)","CHN_Stadium_Day_P":"Forbidden Temple (Day)","EuroStadium_Rainy_P":"Mannfield (Stormy)","NeoTokyo_Arcade_P":"Neo Tokyo (Arcade)","cs_day_p":"Champions Field (Day)","FF_Dusk_P":"Estadio Vida (Dusk)","EuroStadium_Night_P":"Mannfield (Night)","Stadium_P":"DFH Stadium","UtopiaStadium_P":"Utopia Coliseum","EuroStadium_Dusk_P":"Mannfield (Dusk)","Park_P":"Beckwith Park"}
def map_name(code):
    if code in MAPS: return MAPS[code]
    s=(code or "").replace("_P","").replace("_GRS","").replace("_"," ").strip()
    return s.title() if s else None
def local_metrics(s):
    k=("shooting_pct","shots_against","goals_against","clears","centers","aerial_hits","bpm","avg_boost","pct_zero_boost","pct_full_boost","stolen","overfill_pct","small_pads","big_pads","avg_speed","pct_supersonic","pct_slow","pct_ground","pct_high_air","powerslides","pct_def_third","pct_off_third","pct_behind_ball","pct_most_back","pct_most_forward","pct_closest_ball","dist_mates","demos","demos_taken")
    m={x:s.get(x) for x in k}
    if m.get("bpm") is not None: m["bpm"]=round(m["bpm"])
    return m
def find_local_match(L,R):
    """Réplique bc correspondant à une analyse locale : liens connus (lid / bc / rl_id), sinon date (±6 s) + score identique."""
    for r in R.values():
        if r.get("src")=="local": continue
        if r.get("lid")==L["id"] or L.get("bc")==r["id"] or (r.get("rl_id") and r["rl_id"]==L["id"]): return r
    try: t=datetime.datetime.fromisoformat(L["date"].replace("Z","+00:00"))
    except Exception: return None
    for r in R.values():
        if r.get("src")=="local" or r.get("lid"): continue
        try: u=datetime.datetime.fromisoformat(r["date"].replace("Z","+00:00"))
        except Exception: continue
        if abs((t-u).total_seconds())<=6 and r.get("team_goals")==L.get("team_goals") and r.get("opp_goals")==L.get("opp_goals"): return r
    return None
def local_entry(L):
    s=L["s"]; pl=LPL.get(L.get("playlist_id")) or {1:"1v1",2:"2v2",3:"3v3"}.get(L.get("team_size"),"Autre")
    if L.get("bots"): pl="Contre des bots ("+pl+")"
    return {"id":L["id"],"src":"local","lid":L["id"],"date":L["date"],"playlist":pl,"map":map_name(L.get("map")),"duration":round(L.get("duration") or 0),"overtime":bool(L.get("overtime")),
      "team_goals":L.get("team_goals"),"opp_goals":L.get("opp_goals"),"result":L.get("result"),"goals":s.get("goals"),"assists":s.get("assists"),"saves":s.get("saves"),"shots":s.get("shots"),"score":s.get("score"),
      "mvp":False,"boost_avg":s.get("avg_boost"),"bpm":round(s["bpm"]) if s.get("bpm") is not None else None,"rank":None,"rank_tier":None,"rank_div":None,"mmr":None,"rl_id":L["id"],
      "m":local_metrics(s),"name":"443Blood","bots":bool(L.get("bots"))}
def merge_local(R):
    """Ajoute à R (dict id → replay) les replays analysés localement. Idempotent. Ne modifie jamais les stats bc existantes :
    sur une entrée bc déjà connue on ajoute seulement le lien « lid » ; un replay absent de bc devient une entrée « src: local »."""
    try: idx=json.load(open(LOCAL_IDX,encoding="utf-8")).get("replays",[])
    except Exception: return 0
    for i in [i for i,r in R.items() if r.get("src")=="local"]: R.pop(i)   # reconstruit : évite tout doublon si bc reçoit le replay plus tard
    n=0
    for L in sorted(idx,key=lambda x:x.get("date") or ""):
        if (L.get("date") or "")[:10]<MIN_DATE or L.get("bc") in EXCLUDE: continue
        r=find_local_match(L,R)
        if r is not None: r["lid"]=L["id"]; continue
        if not L.get("s") or L.get("result") not in ("win","loss"): continue
        R[L["id"]]=local_entry(L); n+=1
    return n
def finalize(R,found_n,new_n,history=True):
    for r in R.values():
        if r.get("bots") and not str(r.get("playlist","")).startswith("Contre"): r["playlist"]="Contre des bots ("+str(r["playlist"])+")"
    for r in R.values():
        if r.get("m"): r["analysis"]=judge(r["m"])
    reps=sorted(R.values(),key=lambda r:r["date"] or "")
    per={}
    for r in reps: per.setdefault(r["playlist"],[]).append(r)
    def agg(a):
        s=lambda k:sum((x.get(k) or 0) for x in a); n=len(a); w=sum(1 for x in a if x["result"]=="win"); b=[x["boost_avg"] for x in a if x.get("boost_avg") is not None]
        last=next((x for x in reversed(a) if x.get("rank")),None)
        return {"matches":n,"wins":w,"win_rate":round(100*w/n,1) if n else None,"goals":s("goals"),"assists":s("assists"),"saves":s("saves"),"shots":s("shots"),
          "score_avg":round(s("score")/n,1) if n else None,"goals_avg":round(s("goals")/n,2) if n else None,"shot_pct":round(100*s("goals")/s("shots"),1) if s("shots") else None,
          "mvp":s("mvp"),"boost_avg":round(sum(b)/len(b),1) if b else None,"rank":last and last["rank"],"mmr":next((x["mmr"] for x in reversed(a) if x.get("mmr")),None)}
    out={"source":"ballchasing.com","fetched_at":now(),"status":"ok" if reps else "no_replays","replays_found":found_n,"replays_count":len(reps),
         "playlists":{k:agg(v) for k,v in per.items()},"weekly":weekly([r for r in reps if not r.get("bots")]),"bench_note":"Repères indicatifs pour un joueur Or en 3v3 (estimation).","excluded":sorted(EXCLUDE),"min_date":MIN_DATE,"replays":reps}
    json.dump(out,open(F,"w"),ensure_ascii=False,indent=1)
    if history:
      with open(f"{D}/history/ballchasing.jsonl","a") as f: f.write(json.dumps({k:v for k,v in out.items() if k not in ("replays","weekly")},ensure_ascii=False)+"\n")
    return len(reps)
def now(): return datetime.datetime.now().astimezone().isoformat(timespec="seconds")
def main():
    if not K: print("no BALLCHASING_API_KEY"); return 1
    get("/")  # vérifie la clé
    old=json.load(open(F)) if os.path.exists(F) else {}
    R={r["id"]:r for r in old.get("replays",[])}
    found={}
    for q in ["uploader=me","player-id=epic:8d1cf32b760442a297d5e317093fe9b0","player-name=443Blood"]:
        url=f"/replays?{q}&count=200&sort-by=replay-date&sort-dir=desc"
        for _ in range(3):
            r=get(url); [found.setdefault(x["id"],x) for x in r.get("list",[])]
            nxt=r.get("next")
            if not nxt: break
            url=nxt.replace(B,"")
    for i in list(R):
        if i in EXCLUDE or (R[i].get("date") or "")[:10]<MIN_DATE: R.pop(i)
    new=[i for i in found if (i not in R or "m" not in R[i]) and i not in EXCLUDE and (found[i].get("date") or "")[:10]>=MIN_DATE][:150]
    for rid in new:
        d=get(f"/replays/{rid}"); me=None; my=None
        for t in ("blue","orange"):
            for p in d.get(t,{}).get("players",[]) or []:
                pid=p.get("id") or {}
                if (pid.get("platform"),pid.get("id")) in IDS or (p.get("name") or "").lower() in NAMES: me,my=p,t
        if not me: print("joueur introuvable dans",rid); continue
        if d.get("status") not in (None,"ok"): continue
        oth="orange" if my=="blue" else "blue"
        gs=lambda t:((d.get(t,{}).get("stats") or {}).get("core") or {}).get("goals",0)
        c=(me.get("stats") or {}).get("core") or {}; bo=(me.get("stats") or {}).get("boost") or {}
        R[rid]={"id":rid,"date":d.get("date"),"playlist":PL.get(d.get("playlist_id"),d.get("playlist_name") or d.get("playlist_id")),"map":d.get("map_name"),
          "duration":d.get("duration"),"overtime":d.get("overtime"),"team_goals":gs(my),"opp_goals":gs(oth),"result":"win" if gs(my)>gs(oth) else "loss",
          "goals":c.get("goals"),"assists":c.get("assists"),"saves":c.get("saves"),"shots":c.get("shots"),"score":c.get("score"),"mvp":c.get("mvp"),
          "boost_avg":bo.get("avg_amount"),"bpm":bo.get("bpm"),"rank":(me.get("rank") or {}).get("name"),"rank_tier":(me.get("rank") or {}).get("tier"),"rank_div":(me.get("rank") or {}).get("division"),
          "mmr":me.get("mmr"),"rl_id":d.get("rocket_league_id"),"m":metrics(me),"name":me.get("name"),"bots":any((p.get("id") or {})=={} for t in ("blue","orange") for p in d.get(t,{}).get("players",[]) or [])}
    merge_local(R)
    nrep=finalize(R,len(found),len(new))
    print(f"OK ballchasing: {nrep} replays ({len(new)} nouveaux)"); return 0
if __name__=="__main__":
    try: sys.exit(main())
    except Exception as e: print("FAIL",e); sys.exit(1)
