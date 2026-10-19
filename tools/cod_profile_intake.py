#!/usr/bin/env python3
"""Issue « Profil COD » (app) -> met à jour le seul champ player_card de cod_profile.json (snapshot remplacé, historique intact)."""
import json, os, sys, datetime
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gt_payload import extract
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/cod_profile.json"
def out(ok,msg):
    open(os.environ.get("COMMENT_FILE","comment.md"),"w").write(("✅ " if ok else "❌ ")+msg+"\n\n_Carte de joueur stockée dans `cod_profile.json` (historique de carrière inchangé)._");print("OK" if ok else "FAIL")
def main():
    ev=json.load(open(os.environ.get("GT_EVENT") or os.environ["GITHUB_EVENT_PATH"]))
    try: d,_=extract(ev["issue"])
    except ValueError as e: return out(False,str(e).capitalize()+".")
    if not d or d.get("action")!="profile": return out(False,"Aucune donnée de profil trouvée : relance la synchronisation depuis l'app.")
    lvl=d.get("level");likes=d.get("likes");clan=d.get("clan")
    if isinstance(lvl,bool) or not isinstance(lvl,int) or not 1<=lvl<=2000: return out(False,"Niveau invalide.")
    if likes is not None and (isinstance(likes,bool) or not isinstance(likes,int) or likes<0): return out(False,"J'aime invalides.")
    if not isinstance(clan,str) or len(clan)>60: return out(False,"Clan invalide.")
    try: dt=datetime.date.fromisoformat(str(d.get("date"))[:10])
    except Exception: return out(False,"Date invalide.")
    C=json.load(open(F)); old=C.get("player_card") or {}
    lc=d.get("legendary_count") or {}
    for k in ("MP","BR"):
        if k in lc and (isinstance(lc[k],bool) or not isinstance(lc[k],int) or lc[k]<0 or lc[k]>999): return out(False,"Compteur Légendaire invalide.")
    new={"legendary_count":{"MP":lc.get("MP",old.get("legendary_count",{}).get("MP",0)),"BR":lc.get("BR",old.get("legendary_count",{}).get("BR",0))},"player":"NVCBlood","level":lvl,"clan":clan.strip(),"likes":likes,"date":dt.isoformat(),"source":"saisie dans l'app","ranked_season":(str(d["season"])[:20] if d.get("season") else old.get("ranked_season")),"season_snapshot":old.get("season_snapshot"),"note":old.get("note")}
    if {k:new.get(k) for k in ("level","clan","likes","date")}=={k:old.get(k) for k in ("level","clan","likes","date")}: return out(True,"Carte de joueur déjà à jour : aucun changement.")
    C["player_card"]=new; json.dump(C,open(F,"w"),ensure_ascii=False,indent=1)
    out(True,f"Carte de joueur mise à jour : niveau {lvl} · clan {new['clan'] or '—'} · {likes if likes is not None else '—'} J'aime ({dt.isoformat()}).")
if __name__=="__main__": main()
