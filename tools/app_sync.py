#!/usr/bin/env python3
"""Synchro « un geste » depuis l'app (repository_dispatch gt-sync).
Chaque élément {k, d} est traité par le MÊME script d'intégration que les issues (mêmes validations, fusion
idempotente : objectifs par id, parties COD par minute/id, rangs par minute+rang, profil inchangé si identique).
Entrée : variable d'environnement GT_ITEMS (JSON). Sortie : sync_result.json + ligne OK/FAIL par élément."""
import json, os, subprocess, sys, tempfile
T=os.path.dirname(os.path.abspath(__file__))
SCRIPTS={"goal":"goal_intake.py","cod":"cod_match_intake.py","rank":"cod_rank_intake.py","profile":"cod_profile_intake.py"}
def main():
    try: items=json.loads(os.environ.get("GT_ITEMS") or "[]")
    except Exception: items=None
    if not isinstance(items,list) or not items or len(items)>50: print("FAIL éléments invalides"); return 1
    res=[]
    for it in items:
        k=(it or {}).get("k"); d=(it or {}).get("d")
        if k not in SCRIPTS or not isinstance(d,dict): res.append({"k":k,"ok":False,"msg":"élément invalide"}); continue
        with tempfile.TemporaryDirectory() as tmp:
            ev=os.path.join(tmp,"ev.json"); cm=os.path.join(tmp,"c.md")
            json.dump({"issue":{"title":"Synchro app","body":"```json\n"+json.dumps(d,ensure_ascii=False)+"\n```\n","labels":[]}},open(ev,"w"),ensure_ascii=False)
            p=subprocess.run([sys.executable,os.path.join(T,SCRIPTS[k])],env={**os.environ,"GT_EVENT":ev,"COMMENT_FILE":cm},capture_output=True,text=True)
            out=(p.stdout.strip().splitlines() or [""])[-1]; msg=open(cm).read().split("\n\n")[0] if os.path.exists(cm) else (p.stderr.strip()[-300:] or "erreur")
            res.append({"k":k,"ok":out=="OK" and p.returncode==0,"msg":msg})
    json.dump(res,open("sync_result.json","w"),ensure_ascii=False,indent=1)
    for r in res: print(("OK " if r["ok"] else "FAIL ")+str(r["k"])+" : "+r["msg"])
    return 0
if __name__=="__main__": sys.exit(main())
