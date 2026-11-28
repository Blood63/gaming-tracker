#!/usr/bin/env python3
"""Contrôle d'intégrité et de confidentialité des données publiées (lecture seule, ne modifie rien).
Usage : python3 tools/check_data.py [--strict]   -> code 1 si un problème est trouvé.
Vérifie : JSON lisibles, pas de doublons (parties, replays, relevés), historiques triés, valeurs plausibles,
aucun pseudo d'un autre joueur dans valorant.json, aucune trace de jeton GitHub dans les fichiers de données,
aucune localisation (ville/pays du profil Steam : champs location, city…) dans aucun fichier publié,
fichiers dérivés pour l'appli à jour et identiques à leur source (rl_local/summary.json, ballchasing_app.json, ballchasing_analysis.json),
build.json à jour (empreintes = contenu réel des fichiers ; sinon l'appli pourrait garder une ancienne version en cache)."""
import json, os, re, sys, glob, collections, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN=re.compile(r"(github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,})")

def rd(p):
    with open(os.path.join(D,p),encoding="utf-8") as f: return json.load(f)
def jl(p):
    with open(os.path.join(D,p),encoding="utf-8") as f: return [json.loads(l) for l in f if l.strip()]
def dups(L,key):
    c=collections.Counter(key(x) for x in L); return sorted(str(k) for k,n in c.items() if n>1 and k is not None)

# vie privée : la localisation du profil Steam (ville, région, pays) ne doit jamais être publiée
LOC_KEYS=re.compile(r"(?i)^(location|city|ville|loccityid|locstatecode|loccountrycode|country|countrycode)$")
def loc_keys(o,path=""):
    if isinstance(o,dict):
        for k,v in o.items():
            if LOC_KEYS.match(str(k)): yield f"{path}{k}"
            yield from loc_keys(v,f"{path}{k}.")
    elif isinstance(o,list):
        for x in o: yield from loc_keys(x,path)
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
        if '"' in txt and re.search(r'(?i)"(location|city|ville|loccityid|locstatecode|loccountrycode|country|countrycode)"\s*:',txt):
            if k:=next(loc_keys(json.loads(txt)),None): P.append(f"{rel} : localisation publiée ({k}) (vie privée)")
    for f in glob.glob(os.path.join(D,"history","*.jsonl")):
        rel=os.path.relpath(f,D)
        try: L=jl(rel)
        except Exception as e: P.append(f"{rel} : ligne illisible ({e})"); continue
        if k:=next((k for x in L for k in loc_keys(x)),None): P.append(f"{rel} : localisation publiée ({k}) (vie privée)")
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
    P+=check_cod_names()
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
    P+=check_derived()
    return P

# COD : aucun pseudo d'un autre joueur ni UID. Seuls champs « nom » permis : ton propre pseudo (player),
# le nom d'un clan sur ta carte, et les noms de médailles (medals[].name).
COD_NAME_KEYS=re.compile(r"(?i)^(opponents?|enemy(_name)?|enemies|teammates?|allies|ally|squad|players|scoreboard|killer|killed_by|victims?|nick(name)?|pseudo|gamertag|username|user_name|name|uid|player_?id|account_?id|open_?id)$")
COD_ALLOWED={("cod_mobile.json","player"),("cod_profile.json","player"),("cod_profile.json","player_card.player"),("cod_mobile.json","matches[].medals[].name")}
def check_cod_names():
    P=[]
    def walk(f,o,path,lab=None):
        if isinstance(o,dict):
            for k,v in o.items():
                q=(path+"." if path else "")+k
                if COD_NAME_KEYS.match(k) and (f,q) not in COD_ALLOWED and v not in (None,"",[],{}) and not isinstance(v,(int,float,bool)):
                    P.append(f"{lab or f} : champ « {q} » contient un nom de joueur ou un identifiant (vie privée)")
                walk(f,v,q,lab)
        elif isinstance(o,list):
            for v in o: walk(f,v,path+"[]",lab)
    for f in ("cod_mobile.json","cod_profile.json","cod_ranks.json"):
        if os.path.exists(os.path.join(D,f)): walk(f,rd(f),"")
    if os.path.exists(os.path.join(D,"home.json")):
        h=rd("home.json")
        for k,f in (("cod","cod_mobile.json"),("codp","cod_profile.json"),("codr","cod_ranks.json")):
            if k in h: walk(f,h[k],"",f"home.json ({k})")
    return sorted(set(P))

def check_derived():
    """Fichiers dérivés (format tableau) identiques à leur source, et build.json à jour."""
    import tabpack, split_rl_index
    P=[]; ex=lambda p:os.path.exists(os.path.join(D,p))
    if ex("ballchasing_latest.json"):
        if not (ex("ballchasing_app.json") and ex("ballchasing_analysis.json")): P.append("ballchasing_app.json / ballchasing_analysis.json absents : lancer tools/build_home.py")
        else:
            app,an=tabpack.pack_bc(rd("ballchasing_latest.json"))
            if rd("ballchasing_app.json")!=json.loads(json.dumps(app)) or rd("ballchasing_analysis.json")!=json.loads(json.dumps(an)):
                P.append("ballchasing_app.json / ballchasing_analysis.json périmés (≠ ballchasing_latest.json) : lancer tools/build_home.py")
            elif tabpack.unpack_bc(rd("ballchasing_app.json"),rd("ballchasing_analysis.json"))!=rd("ballchasing_latest.json"):
                P.append("ballchasing_app.json : le décodage ne redonne pas ballchasing_latest.json")
    if ex("rl_local/index.json"):
        if not ex("rl_local/summary.json"): P.append("rl_local/summary.json absent : lancer tools/split_rl_index.py")
        else:
            split_rl_index.D=D
            light,deep=split_rl_index.split(rd("rl_local/index.json")); S=rd("rl_local/summary.json")
            if tabpack.untab(S.get("replays"))!=light["replays"] or S.get("v")!=light["v"]: P.append("rl_local/summary.json périmé (≠ index.json) : lancer tools/split_rl_index.py")
            # deep.json = blocs d_* reconstruits depuis les fiches rl_local/<id>.json (ou l'index s'il les contient encore)
            if ex("rl_local/deep.json") and rd("rl_local/deep.json")!=json.loads(json.dumps(deep)): P.append("rl_local/deep.json périmé (≠ fiches rl_local/<id>.json) : lancer tools/split_rl_index.py")
    if ex("build.json"):
        b=rd("build.json"); F=b.get("f")
        if isinstance(F,dict):
            for p,h in F.items():
                try: real=hashlib.sha1(open(os.path.join(D,p),"rb").read()).hexdigest()[:len(h)]
                except OSError: real=None
                if real!=h: P.append(f"build.json périmé pour {p} : lancer tools/build_home.py"); break
    return P

if __name__=="__main__":
    P=check()
    for p in P: print("⚠️ ",p)
    print("Données : OK" if not P else f"{len(P)} problème(s)")
    sys.exit(1 if P else 0)
