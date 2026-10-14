#!/usr/bin/env python3
"""Valorant via HenrikDev API (unofficial, https://docs.henrikdev.xyz). Env HENRIK_API_KEY.
Accumulates account/MMR/MMR history/matches into valorant.json (merged by match id). Exit 1 on failure."""
import json, os, sys, time, datetime, urllib.request, urllib.error
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/valorant.json"
NAME,TAG,REG="Blood","7629","eu"; B="https://api.henrikdev.xyz/valorant"
K=os.environ.get("HENRIK_API_KEY")
def get(p):
    for i in range(3):
        try:
            r=urllib.request.Request(B+p,headers={"Authorization":K,"User-Agent":"gaming-tracker"})
            with urllib.request.urlopen(r,timeout=30) as f: return json.loads(f.read().decode())
        except urllib.error.HTTPError as e:
            if e.code==429 and i<2: time.sleep(30); continue
            raise RuntimeError(f"HTTP {e.code} {p.split('?')[0]}: {e.read().decode(errors='replace')[:200]}")
def main():
    if not K: print("no HENRIK_API_KEY"); return 1
    old=json.load(open(F)) if os.path.exists(F) else {}
    acc=get(f"/v1/account/{NAME}/{TAG}")["data"]
    mmr=get(f"/v3/mmr/{REG}/pc/{NAME}/{TAG}")["data"]
    hist=get(f"/v2/mmr-history/{REG}/pc/{NAME}/{TAG}")["data"].get("history") or []
    stored=[];page=1
    while page<=8:
        r=get(f"/v1/stored-matches/{REG}/{NAME}/{TAG}?size=25&page={page}"); stored+=r.get("data") or []
        if not (r.get("results") or {}).get("after"): break
        page+=1
    det=get(f"/v4/matches/{REG}/pc/{NAME}/{TAG}?size=10").get("data") or []
    puuid=acc["puuid"]
    H={h["match_id"]:h for h in old.get("mmr_history",[])}
    for h in hist:
        H[h["match_id"]]={"match_id":h["match_id"],"date":h["date"],"tier":h["tier"]["name"],"tier_id":h["tier"]["id"],"rr":h["rr"],"change":h.get("last_change"),"elo":h.get("elo"),"map":(h.get("map") or {}).get("name"),"season":(h.get("season") or {}).get("short")}
    M={m["id"]:m for m in old.get("matches",[])}
    for s in stored:
        me,st=s["meta"],s["stats"]; t=(s.get("teams") or {}); my=(st.get("team") or "").lower(); oth="blue" if my=="red" else "red"
        rw,rl=t.get(my),t.get(oth)
        x=M.get(me["id"],{}); x.update({"id":me["id"],"date":me["started_at"],"mode":me.get("mode"),"map":(me.get("map") or {}).get("name"),"season":(me.get("season") or {}).get("short"),
          "agent":(st.get("character") or {}).get("name"),"team":st.get("team"),"rounds_won":rw,"rounds_lost":rl,
          "result":None if rw is None or rl is None else ("win" if rw>rl else "loss" if rw<rl else "draw"),
          "kills":st.get("kills"),"deaths":st.get("deaths"),"assists":st.get("assists"),"score":st.get("score"),
          "head":(st.get("shots") or {}).get("head"),"body":(st.get("shots") or {}).get("body"),"leg":(st.get("shots") or {}).get("leg"),
          "dmg":(st.get("damage") or {}).get("made"),"dmg_recv":(st.get("damage") or {}).get("received"),"tier_id":st.get("tier")})
        M[me["id"]]=x
    for m in det:
        md=m["metadata"]; mid=md["match_id"]; rounds=len(m.get("rounds") or [])
        pl=[{"name":p["name"],"tag":p["tag"],"me":p["puuid"]==puuid,"team":p["team_id"],"agent":p["agent"]["name"],"tier":(p.get("tier") or {}).get("name"),
             "k":p["stats"]["kills"],"d":p["stats"]["deaths"],"a":p["stats"]["assists"],"score":p["stats"]["score"],
             "hs":p["stats"]["headshots"],"bs":p["stats"]["bodyshots"],"ls":p["stats"]["legshots"],"dmg":p["stats"]["damage"]["dealt"]} for p in m["players"]]
        meP=next((p for p in pl if p["me"]),None)
        if not meP: continue
        teams={t["team_id"]:t for t in m["teams"]}; myT=teams.get(meP["team"],{}); oT=next((t for k,t in teams.items() if k!=meP["team"]),{})
        fk=0
        byround={}
        for k in m.get("kills") or []: byround.setdefault(k.get("round"),[]).append(k)
        for r,ks in byround.items():
            f=min(ks,key=lambda k:k.get("time_in_round_in_ms",0))
            if f["killer"]["puuid"]==puuid: fk+=1
        x=M.get(mid,{}); x.update({"id":mid,"date":md["started_at"],"mode":md["queue"]["name"],"map":md["map"]["name"],"season":(md.get("season") or {}).get("short"),
          "length_s":round(md["game_length_in_ms"]/1000),"rounds":rounds,"agent":meP["agent"],"team":meP["team"],
          "rounds_won":(myT.get("rounds") or {}).get("won"),"rounds_lost":(myT.get("rounds") or {}).get("lost"),
          "kills":meP["k"],"deaths":meP["d"],"assists":meP["a"],"score":meP["score"],"head":meP["hs"],"body":meP["bs"],"leg":meP["ls"],"dmg":meP["dmg"],"first_kills":fk,
          "mvp":(myT.get("mvp") or {}).get("name")=="Blood" and (myT.get("mvp") or {}).get("tag")=="7629",
          "scoreboard":sorted(pl,key=lambda p:-p["score"])})
        rw,rl=x["rounds_won"],x["rounds_lost"]
        if rw is not None and rl is not None: x["result"]="win" if rw>rl else "loss" if rw<rl else "draw"
        M[mid]=x
    for x in M.values():
        if not x.get("rounds") and x.get("rounds_won") is not None and x.get("rounds_lost") is not None: x["rounds"]=x["rounds_won"]+x["rounds_lost"]
        if mid2:=H.get(x["id"]): x["rr_change"]=mid2.get("change"); x["tier_after"]=mid2.get("tier")
    cur=mmr.get("current") or {}; pk=mmr.get("peak") or {}
    out={"source":"HenrikDev API (non officielle)","fetched_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
      "account":{"name":acc["name"],"tag":acc["tag"],"region":acc.get("region"),"level":acc.get("account_level"),"card":(acc.get("card") or {}).get("small") if isinstance(acc.get("card"),dict) else None},
      "mmr":{"tier":(cur.get("tier") or {}).get("name"),"tier_id":(cur.get("tier") or {}).get("id"),"rr":cur.get("rr"),"last_change":cur.get("last_change"),"elo":cur.get("elo"),
             "peak":(pk.get("tier") or {}).get("name"),"peak_id":(pk.get("tier") or {}).get("id"),"peak_season":(pk.get("season") or {}).get("short"),
             "seasons":[{"season":(s.get("season") or {}).get("short"),"wins":s.get("wins"),"games":s.get("games"),"end_tier":(s.get("end_tier") or {}).get("name"),"end_tier_id":(s.get("end_tier") or {}).get("id"),"end_rr":s.get("end_rr")} for s in mmr.get("seasonal") or []]},
      "mmr_history":sorted(H.values(),key=lambda h:h["date"]),"matches":sorted(M.values(),key=lambda m:m["date"])}
    out["level_history"]=old.get("level_history",[])
    if not out["level_history"] or out["level_history"][-1]["level"]!=out["account"]["level"]: out["level_history"].append({"date":out["fetched_at"],"level":out["account"]["level"]})
    json.dump(out,open(F,"w"),ensure_ascii=False,indent=1)
    print(f"OK valorant: {out['mmr']['tier']} {out['mmr']['rr']} RR, {len(out['matches'])} matches, {len(out['mmr_history'])} RR changes"); return 0
if __name__=="__main__":
    try: sys.exit(main())
    except Exception as e: print("FAIL",e); sys.exit(1)
