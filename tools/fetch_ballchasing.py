#!/usr/bin/env python3
"""Rocket League via ballchasing.com (env BALLCHASING_API_KEY). Replays de 443Blood (envoyés par le compte = uploader=me, ou recherchés par nom).
Écrit ballchasing_latest.json (replays cumulés + stats par playlist) et ajoute un résumé à history/ballchasing.jsonl.
Ne touche JAMAIS rocket_league.json (données manuelles)."""
import json, os, sys, time, datetime, urllib.request, urllib.error, urllib.parse
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/ballchasing_latest.json"
K=os.environ.get("BALLCHASING_API_KEY"); NAMES={"443blood"}; B="https://ballchasing.com/api"
PL={"ranked-duels":"1v1","ranked-doubles":"2v2","ranked-standard":"3v3","unranked-duels":"Occasionnel 1v1","unranked-doubles":"Occasionnel 2v2","unranked-standard":"Occasionnel 3v3"}
def get(p):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(B+p,headers={"Authorization":K}),timeout=30) as f: time.sleep(0.6); return json.loads(f.read().decode())
        except urllib.error.HTTPError as e:
            if e.code==429 and i<3: time.sleep(5*(i+1)); continue
            raise RuntimeError(f"HTTP {e.code} {p.split('?')[0]}")
def now(): return datetime.datetime.now().astimezone().isoformat(timespec="seconds")
def main():
    if not K: print("no BALLCHASING_API_KEY"); return 1
    get("/")  # vérifie la clé
    old=json.load(open(F)) if os.path.exists(F) else {}
    R={r["id"]:r for r in old.get("replays",[])}
    found={}
    for q in ["uploader=me","player-name=443Blood"]:
        url=f"/replays?{q}&count=200&sort-by=replay-date&sort-dir=desc"
        for _ in range(3):
            r=get(url); [found.setdefault(x["id"],x) for x in r.get("list",[])]
            nxt=r.get("next")
            if not nxt: break
            url=nxt.replace(B,"")
    new=[i for i in found if i not in R][:150]
    for rid in new:
        d=get(f"/replays/{rid}"); me=None; my=None
        for t in ("blue","orange"):
            for p in d.get(t,{}).get("players",[]) or []:
                if (p.get("name") or "").lower() in NAMES: me,my=p,t
        if not me: continue
        oth="orange" if my=="blue" else "blue"
        gs=lambda t:((d.get(t,{}).get("stats") or {}).get("core") or {}).get("goals",0)
        c=(me.get("stats") or {}).get("core") or {}; bo=(me.get("stats") or {}).get("boost") or {}
        R[rid]={"id":rid,"date":d.get("date"),"playlist":PL.get(d.get("playlist_id"),d.get("playlist_name") or d.get("playlist_id")),"map":d.get("map_name"),
          "duration":d.get("duration"),"overtime":d.get("overtime"),"team_goals":gs(my),"opp_goals":gs(oth),"result":"win" if gs(my)>gs(oth) else "loss",
          "goals":c.get("goals"),"assists":c.get("assists"),"saves":c.get("saves"),"shots":c.get("shots"),"score":c.get("score"),"mvp":c.get("mvp"),
          "boost_avg":bo.get("avg_amount"),"bpm":bo.get("bpm"),"rank":(me.get("rank") or {}).get("name"),"rank_tier":(me.get("rank") or {}).get("tier"),"rank_div":(me.get("rank") or {}).get("division"),
          "mmr":me.get("mmr")}
    reps=sorted(R.values(),key=lambda r:r["date"] or "")
    per={}
    for r in reps: per.setdefault(r["playlist"],[]).append(r)
    def agg(a):
        s=lambda k:sum((x.get(k) or 0) for x in a); n=len(a); w=sum(1 for x in a if x["result"]=="win"); b=[x["boost_avg"] for x in a if x.get("boost_avg") is not None]
        last=next((x for x in reversed(a) if x.get("rank")),None)
        return {"matches":n,"wins":w,"win_rate":round(100*w/n,1) if n else None,"goals":s("goals"),"assists":s("assists"),"saves":s("saves"),"shots":s("shots"),
          "score_avg":round(s("score")/n,1) if n else None,"goals_avg":round(s("goals")/n,2) if n else None,"shot_pct":round(100*s("goals")/s("shots"),1) if s("shots") else None,
          "mvp":s("mvp"),"boost_avg":round(sum(b)/len(b),1) if b else None,"rank":last and last["rank"],"mmr":next((x["mmr"] for x in reversed(a) if x.get("mmr")),None)}
    out={"source":"ballchasing.com","fetched_at":now(),"status":"ok" if reps else "no_replays","replays_found":len(found),"replays_count":len(reps),
         "playlists":{k:agg(v) for k,v in per.items()},"replays":reps}
    json.dump(out,open(F,"w"),ensure_ascii=False,indent=1)
    with open(f"{D}/history/ballchasing.jsonl","a") as f: f.write(json.dumps({k:v for k,v in out.items() if k!="replays"},ensure_ascii=False)+"\n")
    print(f"OK ballchasing: {len(reps)} replays ({len(new)} nouveaux)"); return 0
if __name__=="__main__":
    try: sys.exit(main())
    except Exception as e: print("FAIL",e); sys.exit(1)
