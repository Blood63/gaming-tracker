#!/usr/bin/env python3
"""Issue « Changement de rang COD » (créée par l'app, données JSON dans le corps ou le titre) -> cod_ranks.json.
Ajout idempotent ; aucune capture n'est téléchargée ni publiée."""
import json, os, re, sys, datetime
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gt_payload import extract
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/cod_ranks.json"
LADDER=[("Novice",0,5),("Vétéran",1001,5),("Élite",2001,5),("Pro",3001,5),("Maître",4501,0),("Grand Maître",6001,0),("Légendaire",8001,0)]
SUBS=["I","II","III","IV","V"]
STEPS=[]
for ti,(n,p,d) in enumerate(LADDER):
    if d:
        for i in range(d): STEPS.append((n,SUBS[i],p+round(i*(200 if ti<3 else 300))))
    else: STEPS.append((n,None,p))
def out(ok,msg):
    open(os.environ.get("COMMENT_FILE","comment.md"),"w").write(("✅ " if ok else "❌ ")+msg+"\n\n_Le rang est stocké dans `cod_ranks.json` (mise à jour de l'app sous quelques minutes)._")
    print("OK" if ok else "FAIL")
def main():
    ev=json.load(open(os.environ.get("GT_EVENT") or os.environ["GITHUB_EVENT_PATH"])); iss=ev["issue"]
    try: d,_=extract(iss)
    except ValueError as e: return out(False,str(e).capitalize()+".")
    if not d: return out(False,"Aucune donnée trouvée (ni dans le corps, ni dans le titre) : relance la synchronisation depuis l'app (version à jour).")
    if d.get("action","rank")!="rank": return out(False,"Action inconnue.")
    mode=d.get("mode"); tier=d.get("tier"); sub=d.get("sub") or None; pts=d.get("points")
    if mode not in ("MP","BR"): return out(False,"Mode invalide (MP ou BR).")
    lad=dict((n,(p,dd)) for n,p,dd in LADDER)
    if tier not in lad: return out(False,f"Rang invalide : {tier}.")
    if lad[tier][1]==0: sub=None
    elif sub not in SUBS: return out(False,"Division I–V manquante pour ce rang.")
    if pts is not None and (isinstance(pts,bool) or not isinstance(pts,(int,float)) or pts<0 or pts>200000): return out(False,"Points invalides.")
    try: dt=datetime.datetime.fromisoformat(str(d.get("date")))
    except Exception: return out(False,"Date invalide.")
    if dt.tzinfo is None: return out(False,"Date sans fuseau horaire.")
    idx=[i for i,(n,s2,p) in enumerate(STEPS) if n==tier and s2==sub]
    if not idx: return out(False,"Palier invalide.")
    rec={"date":dt.isoformat(timespec="seconds"),"tier":tier,"sub":sub,"label":tier+(" "+sub if sub else ""),"value":idx[0]+1,"points":pts,"season":(str(d["season"])[:40] if d.get("season") else None),"source":"app"}
    C=json.load(open(F)) if os.path.exists(F) else {"MP":[],"BR":[]}
    for k in ("MP","BR"): C.setdefault(k,[])
    def key(r):
        try: d=datetime.datetime.fromisoformat(str(r.get("date")).replace("Z","+00:00")); d=d.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M")
        except Exception: d=str(r.get("date"))[:16]
        return (d,r.get("tier"),None if r.get("tier") in ("Maître","Grand Maître","Légendaire") else r.get("sub"))
    if any(key(x)==key(rec) for x in C[mode]): return out(True,f"Rang déjà enregistré ({mode} · {rec['label']}, {rec['date'][:16].replace('T',' ')}) : aucun changement.")
    C[mode].append(rec); C[mode].sort(key=lambda x:x["date"])
    json.dump(C,open(F,"w"),ensure_ascii=False,indent=1)
    inc=""
    if tier=="Légendaire":
        i=C[mode].index(rec); prev=C[mode][i-1] if i else None
        # transition : le rang précédent (chronologique) n'était pas Légendaire, et cette entrée n'a jamais été comptée
        if not rec.get("counted") and (prev is None or prev.get("tier")!="Légendaire"):
            rec["counted"]=True; json.dump(C,open(F,"w"),ensure_ascii=False,indent=1)
            PF=f"{D}/cod_profile.json"
            try:
                P=json.load(open(PF)); pc=P.setdefault("player_card",{}); lc=pc.setdefault("legendary_count",{"MP":0,"BR":0})
                lc[mode]=int(lc.get(mode) or 0)+1; json.dump(P,open(PF,"w"),ensure_ascii=False,indent=1)
                inc=f" Compteur « fois Légendaire » {mode} : {lc[mode]}."
            except Exception as e: inc=f" (compteur Légendaire non mis à jour : {e})"
    out(True,f"Rang enregistré : **{mode} · {rec['label']}**{inc} ({rec['date'][:10]}). Historique {mode} : {len(C[mode])} entrée(s).")
if __name__=="__main__": main()
