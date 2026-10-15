#!/usr/bin/env python3
"""Issue « Partie COD » (remplie par l'app après lecture des 2 captures) -> ajout idempotent dans cod_mobile.json.
Données JSON : {"action":"add","matches":[{...}]}. Les parties existantes ne sont jamais modifiées.
Aucun nom d'autre joueur n'est accepté (liste blanche de champs)."""
import json, os, re, datetime
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F=f"{D}/cod_mobile.json"
NUM=("score_team","score_enemy","team_place","team_size","score","kills","deaths","assists","kd","impact","rank_xp","xp_gained","accuracy_pct","headshot_pct","damage","capture_kills","distance","objective_time_s")
STR={"mode":60,"map":60,"objective_time":5}
BOOL={"ranked","mvp"}
def out(ok,msg):
    open(os.environ.get("COMMENT_FILE","comment.md"),"w").write(("✅ " if ok else "❌ ")+msg+"\n\n_Les parties sont stockées dans `cod_mobile.json` (mise à jour de l'app sous quelques minutes)._")
    print("OK" if ok else "FAIL")
def clean(m):
    if not isinstance(m,dict): raise ValueError("partie invalide")
    try: dt=datetime.datetime.fromisoformat(str(m.get("date")))
    except Exception: raise ValueError("date invalide")
    if dt.tzinfo is None: raise ValueError("date sans fuseau horaire")
    r={"id":None,"date":dt.isoformat(timespec="seconds"),"source":"app-ocr","type":"MP"}
    for k in NUM:
        v=m.get(k)
        if v is None: continue
        if isinstance(v,bool) or not isinstance(v,(int,float)) or v<0 or v>1e6: raise ValueError(f"{k} invalide")
        r[k]=v
    for k,n in STR.items():
        v=m.get(k)
        if v is None: continue
        if not isinstance(v,str) or len(v)>n: raise ValueError(f"{k} invalide")
        r[k]=v.strip()
    for k in BOOL:
        if k in m: r[k]=bool(m[k])
    if m.get("result") not in ("win","loss","draw"): raise ValueError("résultat invalide")
    r["result"]=m["result"]
    if "kills" not in r or "deaths" not in r: raise ValueError("éliminations / morts manquantes")
    for k in ("accuracy_pct","headshot_pct"):
        if k in r and r[k]>100: raise ValueError(f"{k} > 100")
    if "objective_time" in r:
        t=re.fullmatch(r"(\d{2}):(\d{2})",r["objective_time"])
        if not t: raise ValueError("temps sur l'objectif invalide")
        r["objective_time_s"]=int(t[1])*60+int(t[2])
    if "kd" not in r: r["kd"]=round(r["kills"]/r["deaths"],2) if r["deaths"] else r["kills"]
    r["id"]="app-"+r["date"][:16].replace("-","").replace(":","").replace("T","")
    return r
def main():
    ev=json.load(open(os.environ["GITHUB_EVENT_PATH"])); body=ev["issue"].get("body") or ""
    m=re.search(r"### Données\s*\n+(?:```(?:json)?\s*\n)?(.*?)(?:\n```|\n### |\Z)",body,re.S)
    if not m: return out(False,"Bloc « Données » introuvable.")
    try: d=json.loads(m.group(1).strip())
    except Exception as e: return out(False,f"Données JSON illisibles : {e}")
    if d.get("action","add")!="add": return out(False,"Action inconnue.")
    items=d.get("matches") or []
    if not isinstance(items,list) or not items or len(items)>50: return out(False,"Aucune partie dans les données.")
    try: new=[clean(x) for x in items]
    except ValueError as e: return out(False,f"Partie refusée : {e}. Rien n'a été modifié.")
    C=json.load(open(F)); L=C.setdefault("matches",[])
    key=lambda s: datetime.datetime.fromisoformat(s).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M") if s else None
    have=set()
    for x in L:
        try: have.add(key(x.get("date")))
        except Exception: pass
    ids={x.get("id") for x in L}; added=[]; skipped=0
    for r in new:
        k=key(r["date"])
        if k in have or r["id"] in ids: skipped+=1; continue
        L.append(r); have.add(k); ids.add(r["id"]); added.append(r)
    if added:
        json.dump(C,open(F,"w"),ensure_ascii=False,indent=1)
    msg=f"{len(added)} partie(s) ajoutée(s)"+(f", {skipped} déjà présente(s) (ignorée(s))" if skipped else "")+"."
    msg+="".join(f"\n- {r['date'][:16].replace('T',' ')} · {r.get('mode') or '?'} · {r.get('map') or '?'} · {r['kills']}/{r['deaths']}/{r.get('assists','?')}" for r in added)
    out(True,msg)
if __name__=="__main__": main()
