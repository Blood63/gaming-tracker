#!/usr/bin/env python3
"""Issue « Objectif » -> goals.json. Données JSON : {"action":"add|edit|delete|sync","goal":{...}|"goals":[...]|"id":n}"""
import json, os, re, datetime
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/goals.json"
TYPES={"game_hours","game_ach","total_hours","achievements","level","cod_kd","cod_matches","val_rank","rl_rank","cod_rank"}
KEYS={"id","type","target","appid","deadline","start","playlist","div","mode","created"}
def out(ok,msg):
    open(os.environ.get("COMMENT_FILE","comment.md"),"w").write(("✅ " if ok else "❌ ")+msg+"\n\n_Les objectifs sont stockés dans `goals.json` et identiques sur tous tes appareils (mise à jour de l'app sous quelques minutes)._")
    print("OK" if ok else "FAIL")
def clean(g):
    g={k:v for k,v in g.items() if k in KEYS and v not in (None,"")}
    if g.get("type") not in TYPES: raise ValueError("type d'objectif inconnu")
    t=g.get("target")
    if not isinstance(t,(int,float)) or t<=0: raise ValueError("cible invalide")
    if "deadline" in g and not re.fullmatch(r"\d{4}-\d{2}-\d{2}",str(g["deadline"])): raise ValueError("échéance invalide (AAAA-MM-JJ)")
    for k in ("id","appid","div","start"):
        if k in g and not isinstance(g[k],(int,float)): raise ValueError(f"{k} invalide")
    if "playlist" in g and g["playlist"] not in ("1v1","2v2","3v3"): raise ValueError("playlist invalide")
    if "mode" in g and g["mode"] not in ("MP","BR"): raise ValueError("mode invalide")
    g.setdefault("id",int(datetime.datetime.now().timestamp()*1000)); g.setdefault("created",datetime.datetime.now().astimezone().isoformat(timespec="seconds"))
    return g
def main():
    ev=json.load(open(os.environ["GITHUB_EVENT_PATH"])); body=ev["issue"].get("body") or ""
    m=re.search(r"### Données\s*\n+(?:```(?:json)?\s*\n)?(.*?)(?:\n```|\n### |\Z)",body,re.S)
    if not m: return out(False,"Bloc « Données » introuvable.")
    try: d=json.loads(m.group(1).strip())
    except Exception as e: return out(False,f"Données JSON illisibles : {e}")
    a=d.get("action")
    if not a:
        am=re.search(r"### Action\s*\n+(\w+)",body); a={"Ajouter":"add","Modifier":"edit","Supprimer":"delete","Synchroniser":"sync"}.get(am.group(1) if am else "","add")
    G=json.load(open(F)) if os.path.exists(F) else {"goals":[]}; L=G["goals"]
    try:
        if a in ("add","sync"):
            items=d.get("goals") or [d.get("goal")]; n=0
            for g in items:
                g=clean(g or {})
                if any(x["id"]==g["id"] for x in L): continue
                L.append(g); n+=1
            dl=[x for x in (d.get("delete") or []) if isinstance(x,(int,float))]
            if dl: b=len(L); G["goals"]=L=[x for x in L if x["id"] not in dl]; n_del=b-len(L)
            else: n_del=0
            msg=(f"{n_del} supprimé{'s' if n_del>1 else ''}, " if n_del else "")+f"{n} objectif{'s' if n>1 else ''} ajouté{'s' if n>1 else ''}" + (f" ({len(items)-n} déjà présent{'s' if len(items)-n>1 else ''})" if len(items)-n else "")
        elif a=="edit":
            g=clean(d["goal"]); i=next((i for i,x in enumerate(L) if x["id"]==g["id"]),None)
            if i is None: return out(False,"Objectif à modifier introuvable.")
            L[i]=g; msg="Objectif modifié"
        elif a=="delete":
            ids=d.get("ids") or [d.get("id")]; before=len(L); G["goals"]=L=[x for x in L if x["id"] not in ids]
            if before==len(L): return out(False,"Objectif à supprimer introuvable (déjà supprimé ?).")
            msg="Objectif supprimé"
        else: return out(False,f"Action inconnue : {a}")
    except (ValueError,KeyError,TypeError) as e: return out(False,f"Objectif invalide : {e}")
    G["updated"]=datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    json.dump(G,open(F,"w"),ensure_ascii=False,indent=1); out(True,msg+f". Total : {len(L)} objectif{'s' if len(L)>1 else ''}.")
main()
