#!/usr/bin/env python3
"""Contrat de versionnage de l'appli (cache des téléphones) — lecture seule.
Usage : python3 tools/check_versions.py [REF_DE_BASE]
1) Toujours : index.html cohérent — chaque fichier de l'appli (app.js, core.js, app.css, cod-ocr.js, sw.js) est appelé avec UN seul numéro ?v=,
   identique dans les préchargements (<link rel=preload>) et dans les balises ; les listes de démarrage rapide (script en tête de index.html)
   correspondent aux fichiers NEED et aux pages CHART_R de app.js, et à l'adresse de Chart.js.
2) Avec REF_DE_BASE (ex. le commit précédent) : tout fichier de l'appli MODIFIÉ depuis REF doit avoir un ?v= différent dans index.html,
   sinon les téléphones garderaient l'ancienne version en cache. Si REF est introuvable (premier commit, historique absent), ce contrôle est sauté.
Code de sortie 1 si un problème est trouvé."""
import os, re, subprocess, sys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS=["app.js","core.js","app.css","cod-ocr.js","sw.js"]

def versions(html):
    """{fichier: ensemble des ?v= trouvés dans index.html}"""
    V={}
    for f in ASSETS:
        V[f]=set(re.findall(r"""['"(]"""+re.escape(f)+r"""\?v=([\w.-]+)['")]""",html))
    return V

def static_problems(html,appjs):
    P=[]; V=versions(html)
    for f,vs in V.items():
        if not vs: P.append(f"index.html : {f} appelé sans ?v=")
        elif len(vs)>1: P.append(f"index.html : {f} appelé avec plusieurs versions {sorted(vs)} (préchargement ≠ balise : double téléchargement)")
    m=re.search(r"\{rl:\[([^\]]*)\],valorant:\[([^\]]*)\]\}",html)
    if not m: P.append("index.html : liste de démarrage rapide introuvable")
    else:
        SRC=dict(re.findall(r"(\w+):\['([^']+)'",re.search(r"const SRC=\{(.*?)\};",appjs).group(1)))
        NEED=re.search(r"const NEED=\{(.*?)\};",appjs).group(1)
        for i,route in enumerate(("rl","valorant")):
            pre=re.findall(r"'([^']+)'",m.group(i+1)); keys=re.findall(r"'(\w+)'",re.search(route+r":\[([^\]]*)\]",NEED).group(1))
            want=[SRC[k] for k in keys if k in SRC]
            if sorted(pre)!=sorted(f for f in want if f!="history/steam.jsonl"): P.append(f"index.html : fichiers préchargés pour #/{route} {pre} ≠ NEED de app.js {want}")
    cr=re.search(r"const CHART_R=\[([^\]]*)\]",appjs); hc=re.search(r"if\(\[([^\]]*)\]\.includes\(r\)\)",html)
    if not cr or not hc or sorted(re.findall(r"'(\w+)'",cr.group(1)))!=sorted(re.findall(r"'(\w+)'",hc.group(1))): P.append("index.html : pages préchargeant Chart.js ≠ CHART_R de app.js")
    cu=re.findall(r"https://cdn\.jsdelivr\.net/npm/chart\.js@[\w.]+/dist/chart\.umd\.min\.js",appjs+html)
    if len(set(cu))!=1: P.append(f"adresse de Chart.js différente entre app.js et index.html : {sorted(set(cu))}")
    return P

def git(*a):
    return subprocess.run(["git","-C",D,*a],capture_output=True,text=True)

def bump_problems(base):
    if not base or set(base)<={"0"} or git("cat-file","-e",base+"^{commit}").returncode: return [],f"référence {base!r} introuvable : contrôle des numéros sauté"
    old=git("show",f"{base}:index.html")
    if old.returncode: return [],"index.html absent dans la référence : contrôle sauté"
    V0,V1=versions(old.stdout),versions(open(os.path.join(D,"index.html"),encoding="utf-8").read())
    P=[]
    for f in ASSETS:
        if git("diff","--quiet",base,"--",f).returncode==1 and V0.get(f)==V1.get(f):
            P.append(f"{f} modifié depuis {base[:10]} mais ?v={','.join(sorted(V1.get(f) or []))} inchangé dans index.html : augmente le numéro")
    return P,None

def main():
    html=open(os.path.join(D,"index.html"),encoding="utf-8").read(); appjs=open(os.path.join(D,"app.js"),encoding="utf-8").read()
    P=static_problems(html,appjs)
    if len(sys.argv)>1:
        B,note=bump_problems(sys.argv[1]); P+=B
        if note: print("ℹ️ ",note)
    for p in P: print("⚠️ ",p)
    print("Versions : OK" if not P else f"{len(P)} problème(s)")
    return 1 if P else 0
if __name__=="__main__": sys.exit(main())
