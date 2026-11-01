#!/usr/bin/env python3
"""Découpe rl_local/index.json (index complet, écrit par l'outil du PC : NE PAS le modifier) en deux fichiers dérivés pour l'appli :
  - rl_local/light.json : une entrée par replay SANS les blocs détaillés d_* (stats `s`, date, résultat…) -> chargé tout de suite (~1/4 de la taille) ;
  - rl_local/deep.json  : {"v":1,"deep":{id:{d_heat,d_kick,d_shots,…}}} -> chargé après l'affichage de la page, à la demande.
L'index complet reste la source de vérité (uploader PC et fusion ballchasing inchangés). Sortie déterministe et idempotente (rien n'est réécrit si rien ne change).
Lancé par le workflow « Replays locaux » juste après chaque envoi du PC. Usage : split_rl_index.py [dossier_racine]"""
import json, os, sys
D=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def split(idx):
    light,deep=[],{}
    for r in idx.get("replays") or []:
        if not isinstance(r,dict) or not r.get("id"): continue
        d={k:v for k,v in r.items() if k.startswith("d_")}
        light.append({k:v for k,v in r.items() if not k.startswith("d_")})
        if d: deep[r["id"]]=d
    return {"v":idx.get("v",1),"replays":light},{"v":idx.get("v",1),"deep":deep}
def dump(o): return json.dumps(o,ensure_ascii=False,separators=(",",":"))+"\n"
def write_if_changed(path,txt):
    try:
        if open(path,encoding="utf-8").read()==txt: return False
    except OSError: pass
    tmp=path+".tmp"; open(tmp,"w",encoding="utf-8").write(txt); os.replace(tmp,path); return True
def main():
    src=f"{D}/rl_local/index.json"
    if not os.path.exists(src): print("pas d'index"); return 0
    try:
        with open(src,encoding="utf-8") as fh: idx=json.load(fh)
    except Exception as e: print("index illisible :",e); return 1
    if not isinstance(idx.get("replays"),list): print("index sans « replays »"); return 1
    light,deep=split(idx)
    a=write_if_changed(f"{D}/rl_local/light.json",dump(light)); b=write_if_changed(f"{D}/rl_local/deep.json",dump(deep))
    print(f"light.json {'écrit' if a else 'inchangé'} ({len(light['replays'])} replays) · deep.json {'écrit' if b else 'inchangé'} ({len(deep['deep'])} blocs)")
    return 0
if __name__=="__main__": sys.exit(main())
