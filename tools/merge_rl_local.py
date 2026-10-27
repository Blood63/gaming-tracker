#!/usr/bin/env python3
"""Fusionne rl_local/index.json (replays analysés sur le PC) dans ballchasing_latest.json, sans appeler ballchasing.
Idempotent : ne modifie aucune stat bc existante (ajoute seulement le lien « lid »), ajoute les replays que bc n'a pas
(« src: local »), recalcule playlists / semaines. Lancé par le workflow « Replays locaux » à chaque envoi du PC."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_ballchasing as fb
def main():
    if not os.path.exists(fb.F) or not os.path.exists(fb.LOCAL_IDX): print("rien à fusionner"); return 0
    old=json.load(open(fb.F,encoding="utf-8"))
    R={r["id"]:r for r in old.get("replays",[])}
    before=json.dumps(old.get("replays"),sort_keys=True)
    n=fb.merge_local(R)
    for i in list(R):
        if i in fb.EXCLUDE or (R[i].get("date") or "")[:10]<fb.MIN_DATE: R.pop(i)
    nrep=fb.finalize(R,old.get("replays_found",len(R)),0,history=False)
    new=json.load(open(fb.F,encoding="utf-8")); new["fetched_at"]=old.get("fetched_at",new["fetched_at"]); json.dump(new,open(fb.F,"w",encoding="utf-8"),ensure_ascii=False,indent=1)
    # on garde la date du dernier relevé bc si rien n'a changé (évite des commits vides)
    if json.dumps(new.get("replays"),sort_keys=True)==before:
        old_txt=json.dumps(old,ensure_ascii=False,indent=1); open(fb.F,"w",encoding="utf-8").write(old_txt); print("inchangé"); return 0
    print(f"OK : {nrep} replays dont {n} uniquement locaux"); return 0
if __name__=="__main__": sys.exit(main())
