#!/usr/bin/env python3
"""Génère home.json (résumé compact pour l'accueil) et build.json (empreinte des données).
Fichiers ADDITIFS uniquement : aucun fichier de données existant n'est modifié.
home.json contient des versions allégées (mêmes champs que ceux lus par l'accueil) ; les pages détaillées
chargent les fichiers complets à la demande. build.json = empreinte des fichiers de données : l'app l'utilise
comme clé de cache (?v=) au lieu de Date.now()."""
import json, os, hashlib, datetime
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA=["history/steam.jsonl","store.json","history/valorant.jsonl","history/rocket_league.jsonl","cod_mobile.json","cod_profile.json","cod_ranks.json",
      "setup.json","valorant.json","goals.json","rocket_league.json","ballchasing_latest.json","steam_achievements.json","rl_local/index.json"]
def rd(p,default=None):
    try: return json.load(open(f"{D}/{p}",encoding="utf-8"))
    except Exception: return default
def jl(p):
    try: return [json.loads(l) for l in open(f"{D}/{p}",encoding="utf-8") if l.strip()]
    except Exception: return []
pick=lambda o,ks:{k:o[k] for k in ks if k in o}
def main():
    sh=jl("history/steam.jsonl"); full=[s for s in sh if s.get("games")]
    # l'accueil (chronologie) ne lit que le dernier relevé de chaque jour : on garde exactement ceux-là
    day=[]
    for s in full:
        if day and str(day[-1].get("fetched_at"))[:10]==str(s.get("fetched_at"))[:10]: day[-1]=s
        else: day.append(s)
    full=day
    G=("appid","name","hours","ach_unlocked","ach_total","playtime_forever")
    steamH=[{"fetched_at":s.get("fetched_at"),"games":[pick(g,G) for g in s["games"]]} for s in full[:-1]]+full[-1:]
    st=rd("store.json",{}) or {}
    store={"fetched_at":st.get("fetched_at"),"apps":{k:pick(v,("header_image","genres","categories")) for k,v in (st.get("apps") or {}).items()}}
    v=rd("valorant.json")
    vh=None
    if v and v.get("mmr"):
        vh={**pick(v,("source","fetched_at","account","mmr","mmr_history")),"matches":[pick(m,("id","date","mode","map","agent","result","kills","deaths","assists","rr_change","length_s")) for m in v.get("matches") or []]}
    b=rd("ballchasing_latest.json")
    bc=None
    if b: bc={"fetched_at":b.get("fetched_at"),"replays":[{**pick(r,("id","date","playlist","map","team_goals","opp_goals","result","goals","assists","saves")),"m":1} for r in b.get("replays") or [] if r.get("date") and r.get("m") and not r.get("bots")]}
    home={"lite":True,"steamH":steamH,"store":store,"val":jl("history/valorant.jsonl")[-3:],"rl":jl("history/rocket_league.jsonl")[-3:],
          "cod":rd("cod_mobile.json"),"codp":rd("cod_profile.json"),"codr":rd("cod_ranks.json"),"vh":vh,"gj":rd("goals.json"),"rlm":rd("rocket_league.json"),"bc":bc}
    out=json.dumps(home,ensure_ascii=False,separators=(",",":"))
    h=hashlib.sha1()
    for p in DATA:
        try: h.update(p.encode()+b"\0"+open(f"{D}/{p}","rb").read())
        except Exception: h.update(p.encode()+b"\0-")
    ver=h.hexdigest()[:12]
    old=rd("build.json",{}) or {}
    if old.get("v")==ver and os.path.exists(f"{D}/home.json") and open(f"{D}/home.json",encoding="utf-8").read()==out: print("home.json inchangé"); return
    open(f"{D}/home.json","w",encoding="utf-8").write(out)
    json.dump({"v":ver,"at":datetime.datetime.now().astimezone().isoformat(timespec="seconds")},open(f"{D}/build.json","w"),indent=1)
    print(f"home.json {len(out)//1024} Ko · build {ver}")
if __name__=="__main__": main()
