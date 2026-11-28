#!/usr/bin/env python3
"""Découpe rl_local/index.json (index complet, écrit par l'outil du PC : NE PAS le modifier) en deux fichiers dérivés pour l'appli :
  - rl_local/summary.json : une entrée par replay SANS les blocs détaillés d_* (stats `s`, date, résultat…), au format « tableau »
    (tools/tabpack.py : mêmes données, ~2× plus petit compressé) -> chargé tout de suite. Remplace l'ancien light.json (même contenu, en lignes) ;
  - rl_local/deep.json  : {"v":1,"deep":{id:{d_heat,d_kick,d_shots,…}}} -> chargé après l'affichage de la page, à la demande.
L'index complet reste la source de vérité (uploader PC et fusion ballchasing inchangés). Sortie déterministe et idempotente (rien n'est réécrit si rien ne change).
Lancé par le workflow « Replays locaux » juste après chaque envoi du PC. Usage : split_rl_index.py [dossier_racine]"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tabpack import tab, untab, dump, write_if_changed
D=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def split(idx):
    light,deep=[],{}
    for r in idx.get("replays") or []:
        if not isinstance(r,dict) or not r.get("id"): continue
        d={k:v for k,v in r.items() if k.startswith("d_")}
        light.append({k:v for k,v in r.items() if not k.startswith("d_")})
        if d: deep[r["id"]]=d
    return {"v":idx.get("v",1),"replays":light},{"v":idx.get("v",1),"deep":deep}
def summary(light): return {"v":light["v"],"replays":tab(light["replays"])}
def main():
    src=f"{D}/rl_local/index.json"
    if not os.path.exists(src): print("pas d'index"); return 0
    try:
        with open(src,encoding="utf-8") as fh: idx=json.load(fh)
    except Exception as e: print("index illisible :",e); return 1
    if not isinstance(idx.get("replays"),list): print("index sans « replays »"); return 1
    light,deep=split(idx)
    a=write_if_changed(f"{D}/rl_local/summary.json",dump(summary(light))); b=write_if_changed(f"{D}/rl_local/deep.json",dump(deep))
    old=f"{D}/rl_local/light.json"   # ancien format (lignes), remplacé par summary.json
    if os.path.exists(old): os.remove(old)
    print(f"summary.json {'écrit' if a else 'inchangé'} ({len(light['replays'])} replays) · deep.json {'écrit' if b else 'inchangé'} ({len(deep['deep'])} blocs)")
    return 0
if __name__=="__main__": sys.exit(main())
