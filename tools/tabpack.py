#!/usr/bin/env python3
"""Format « tableau » (colonnes) pour les gros fichiers lus par l'appli : MÊMES données, mêmes clés dans le même ordre, ~2× plus petit une fois compressé.
Une liste d'objets [{a:1,b:2},{a:3}] devient {"$tab":{"sh":[["a","b"],["a"]],"r":[0,1],"c":{"a":[1,3],"b":[2]}}} :
  sh = formes (liste ordonnée des clés), r = forme de chaque ligne, c = valeurs de chaque clé, dans l'ordre des lignes qui l'ont.
Une colonne dont toutes les valeurs sont des objets est elle-même encodée en tableau (ex. stats `s` des replays). Les valeurs null sont conservées
telles quelles ; une clé absente reste absente. Décodage côté appli : untab() dans core.js (testé : décodage(encodage(x)) == x, à l'octet près en JSON).
Fichiers produits (dérivés, régénérés par les robots ; la source de vérité reste le fichier d'origine) :
  rl_local/summary.json (depuis rl_local/index.json, sans blocs d_*) : split_rl_index.py
  ballchasing_app.json + ballchasing_analysis.json (depuis ballchasing_latest.json) : pack_ballchasing() ci-dessous, appelé par build_home.py"""
import json, os

def tab(rows):
    sh, shi, r, c = [], {}, [], {}
    for o in rows:
        ks = tuple(o.keys())
        if ks not in shi: shi[ks] = len(sh); sh.append(list(ks))
        r.append(shi[ks])
        for k in ks: c.setdefault(k, []).append(o[k])
    for k, v in c.items():
        if v and all(isinstance(x, dict) for x in v): c[k] = tab(v)
    return {"$tab": {"sh": sh, "r": r, "c": c}}

def untab(t):
    if not (isinstance(t, dict) and "$tab" in t): return t
    T = t["$tab"]; cols = {k: untab(v) for k, v in T["c"].items()}; ptr = {k: 0 for k in cols}; out = []
    for si in T["r"]:
        o = {}
        for k in T["sh"][si]: o[k] = cols[k][ptr[k]]; ptr[k] += 1
        out.append(o)
    return out

def dump(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n"

def write_if_changed(path, txt):
    try:
        if open(path, encoding="utf-8").read() == txt: return False
    except OSError: pass
    tmp = path + ".tmp"; open(tmp, "w", encoding="utf-8").write(txt); os.replace(tmp, path); return True

def pack_bc(b):
    """ballchasing_latest.json -> (version appli sans les conseils par replay, conseils {id: analysis}). Ordre des clés conservé."""
    reps = b.get("replays") if isinstance(b.get("replays"), list) else None
    if reps is None: return dict(b), {"v": 1, "a": {}}
    light = [{k: v for k, v in r.items() if k != "analysis"} if isinstance(r, dict) else r for r in reps]
    has = [r for r in reps if isinstance(r, dict) and r.get("id") and "analysis" in r]
    an = {r["id"]: r["analysis"] for r in has}
    pos = {r["id"]: list(r).index("analysis") for r in has}   # place de la clé dans l'objet d'origine (pour un retour à l'identique)
    return {k: (tab(light) if k == "replays" else v) for k, v in b.items()}, {"v": 1, "a": an, "pos": pos}

def unpack_bc(app, an):
    """Inverse exact de pack_bc (utilisé par les tests et check_data.py)."""
    A = (an or {}).get("a") or {}; P = (an or {}).get("pos") or {}
    def put(r):
        if not (isinstance(r, dict) and r.get("id") in A): return r
        it = list(r.items()); i = P.get(r["id"], len(it)); it.insert(i, ("analysis", A[r["id"]])); return dict(it)
    return {k: ([put(r) for r in untab(v)] if k == "replays" else v) for k, v in app.items()}

def pack_ballchasing(D):
    """Écrit ballchasing_app.json et ballchasing_analysis.json à partir de ballchasing_latest.json (rien n'est réécrit si inchangé)."""
    src = f"{D}/ballchasing_latest.json"
    try: b = json.load(open(src, encoding="utf-8"))
    except Exception: return None
    if not isinstance(b, dict): return None
    app, an = pack_bc(b)
    return write_if_changed(f"{D}/ballchasing_app.json", dump(app)), write_if_changed(f"{D}/ballchasing_analysis.json", dump(an))
