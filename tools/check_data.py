#!/usr/bin/env python3
"""Contrôle d'intégrité et de confidentialité des données publiées (lecture seule, ne modifie rien).
Usage : python3 tools/check_data.py [--strict]   -> code 1 si un problème est trouvé.
Vérifie : JSON lisibles, pas de doublons (parties, replays, relevés), historiques triés, valeurs plausibles,
aucun pseudo d'un autre joueur dans valorant.json, aucune trace de jeton GitHub dans les fichiers de données."""
import json, os, re, sys, glob, collections
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN=re.compile(r"(github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,})")

def rd(p):
    with open(os.path.join(D,p),encoding="utf-8") as f: return json.load(f)
def jl(p):
    with open(os.path.join(D,p),encoding="utf-8") as f: return [json.loads(l) for l in f if l.strip()]
def dups(L,key):
    c=collections.Counter(key(x) for x in L); return sorted(str(k) for k,n in c.items() if n>1 and k is not None)

def check(root=None):
    global D
    if root: D=root
    P=[]  # problèmes
    files=[p for p in glob.glob(os.path.join(D,"*.json"))+glob.glob(os.path.join(D,"rl_local","*.json"))]
    for f in files:
        rel=os.path.relpath(f,D)
        try: txt=open(f,encoding="utf-8").read(); json.loads(txt)
        except Exception as e: P.append(f"{rel} : JSON illisible ({e})"); continue
        if TOKEN.search(txt): P.append(f"{rel} : ressemble à un jeton GitHub (secret publié !)")
    for f in glob.glob(os.path.join(D,"history","*.jsonl")):
        rel=os.path.relpath(f,D)
        try: L=jl(rel)
        except Exception as e: P.append(f"{rel} : ligne illisible ({e})"); continue
        ts=[str(x.get("fetched_at")) for x in L]
        if ts!=sorted(ts): P.append(f"{rel} : relevés non triés par date")
        if len(ts)!=len(set(ts)): P.append(f"{rel} : relevé en double")
    if os.path.exists(os.path.join(D,"valorant.json")):
        v=rd("valorant.json"); M=v.get("matches") or []
        if d:=dups(M,lambda m:m.get("id")): P.append(f"valorant.json : parties en double {d[:3]}")
        for m in M:
            if any((m.get(k) or 0)<0 for k in ("kills","deaths","assists","rounds")): P.append(f"valorant.json : valeur négative ({m.get('id')})")
            for p in m.get("scoreboard") or []:
                if not p.get("me") and (p.get("name") or p.get("tag")):
                    P.append("valorant.json : pseudo d'un autre joueur publié (vie privée)"); break
            else: continue
            break
    if os.path.exists(os.path.join(D,"ballchasing_latest.json")):
        b=rd("ballchasing_latest.json")
        if d:=dups(b.get("replays") or [],lambda r:r.get("id")): P.append(f"ballchasing_latest.json : replays en double {d[:3]}")
        if bad:=[r.get("id") for r in b.get("replays") or [] if r.get("result") not in ("win","loss",None)]: P.append(f"ballchasing_latest.json : résultat invalide {bad[:3]}")
    if os.path.exists(os.path.join(D,"rl_local","index.json")):
        idx=rd("rl_local/index.json").get("replays") or []
        if d:=dups(idx,lambda r:r.get("id")): P.append(f"rl_local/index.json : replays en double {d[:3]}")
        if any('"name"' in json.dumps(r) for r in idx): P.append("rl_local/index.json : un nom de joueur est présent (vie privée)")
    if os.path.exists(os.path.join(D,"cod_mobile.json")):
        c=rd("cod_mobile.json"); M=c.get("matches") or []
        if d:=dups([m for m in M if m.get("id")],lambda m:m.get("id")): P.append(f"cod_mobile.json : parties en double {d[:3]}")
        if any(not m.get("id") and not m.get("date") for m in M): P.append("cod_mobile.json : partie sans identifiant ni date")
    if os.path.exists(os.path.join(D,"rocket_league.json")):
        rl=rd("rocket_league.json")
        if d:=dups(rl.get("rank_log") or [],lambda x:json.dumps(x,sort_keys=True)): P.append("rocket_league.json : rang en double dans rank_log")
        for x in rl.get("rank_log") or []:
            if not (0<=int(x.get("tier",-1))<=22) or int(x.get("div") or 1) not in (1,2,3,4): P.append(f"rocket_league.json : rang invalide {x}"); break
    if os.path.exists(os.path.join(D,"goals.json")):
        g=rd("goals.json").get("goals") or []
        if d:=dups(g,lambda x:x.get("id")): P.append(f"goals.json : objectifs en double {d[:3]}")
    if os.path.exists(os.path.join(D,"cod_ranks.json")):
        r=rd("cod_ranks.json")
        for m in ("MP","BR"):
            if d:=dups(r.get(m) or [],lambda x:(x.get("date"),x.get("tier"),x.get("sub"))): P.append(f"cod_ranks.json : rang {m} en double")
    return P

if __name__=="__main__":
    P=check()
    for p in P: print("⚠️ ",p)
    print("Données : OK" if not P else f"{len(P)} problème(s)")
    sys.exit(1 if P else 0)
