#!/usr/bin/env python3
"""Traite une issue 'Partie COD Mobile' : télécharge les images, OCR, applique les corrections, ajoute à cod_mobile.json."""
import json, os, re, sys, urllib.request, datetime, hashlib
sys.path.insert(0, os.path.dirname(__file__)); from cod_ocr import parse_image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.environ["GITHUB_EVENT_PATH"])); iss = ev["issue"]; body = iss.get("body") or ""
TOKEN = os.environ.get("GITHUB_TOKEN","")
def field(label):
    m = re.search(r"###\s*"+re.escape(label)+r"\s*\n+(.*?)(?=\n###|\Z)", body, re.S)
    v = m.group(1).strip() if m else ""
    return None if v in ("", "_No response_", "Aucune réponse", "None") else v
urls = re.findall(r"https://(?:github\.com/user-attachments/assets/[\w-]+|user-images\.githubusercontent\.com/\S+?\.(?:png|jpe?g)|private-user-images\.githubusercontent\.com/[^\s)\"']+)", body)
urls = list(dict.fromkeys(urls))
db = json.load(open(f"{ROOT}/cod_mobile.json")); db["matches"] = [m for m in db["matches"] if m.get("issue") != iss["number"]]
now = datetime.datetime.now().astimezone()
date = field("Date de la partie (optionnel, AAAA-MM-JJ HH:MM)") or iss["created_at"]
over = {"mode": field("Mode (correction)"), "map": field("Carte (correction)"), "result": {"Victoire":"win","Défaite":"loss","Égalité":"draw"}.get(field("Résultat (correction)") or "", None)}
for k in ["kills","deaths","assists","score"]:
    v = field({"kills":"Éliminations (correction)","deaths":"Morts (correction)","assists":"Assistances (correction)","score":"Score (correction)"}[k])
    over[k] = int(v) if v and v.isdigit() else None
for k,l in [("placement","Classement BR (correction)"),("damage","Dégâts (correction)")]:
    v = field(l); v = re.sub(r"\D","",v) if v else ""; over[k] = int(v) if v else None
over["survival_time"] = field("Temps de survie BR (correction)")
added, report = [], []
os.makedirs(f"{ROOT}/screenshots/cod", exist_ok=True)
for i,u in enumerate(urls or [None]):
    rec = {"issue": iss["number"], "date": date, "type": {"Multijoueur":"MP","Battle Royale":"BR"}.get(field("Type de partie") or "", None), "ranked": {"Oui":True,"Non":False}.get(field("Classée ?") or "")}
    notes = []
    if u:
        req = urllib.request.Request(u, headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "cod-intake"})
        try:
            data = urllib.request.urlopen(req, timeout=60).read()
            fn = f"screenshots/cod/{iss['number']}-{i+1}-{hashlib.sha1(data).hexdigest()[:8]}.png"
            open(f"{ROOT}/{fn}","wb").write(data); rec["screenshot"] = fn
            parsed, notes, _ = parse_image(f"{ROOT}/{fn}"); rec.update(parsed); rec["source"] = "ocr"
        except Exception as e: notes.append(f"téléchargement/OCR impossible : {e}")
    else: notes.append("aucune image trouvée dans l'issue")
    for k,v in over.items():
        if v is not None: rec[k] = v; rec.setdefault("overrides", []).append(k)
    if rec.get("kills") is not None and rec.get("deaths") is not None:
        rec["kd"] = round(rec["kills"]/rec["deaths"],2) if rec["deaths"] else float(rec["kills"])
    rec["ocr_notes"] = notes; db["matches"].append(rec); added.append(rec)
db["matches"].sort(key=lambda m: m["date"]); json.dump(db, open(f"{ROOT}/cod_mobile.json","w"), ensure_ascii=False, indent=1)
L = {"type":"Type","placement":"Classement BR","damage":"Dégâts","survival_time":"Survie","mode":"Mode","map":"Carte","result":"Résultat","score":"Score","kills":"Éliminations","deaths":"Morts","assists":"Assistances","kd":"K/D"}
FR = {"win":"Victoire","loss":"Défaite","draw":"Égalité"}
out = ["## 🎮 Partie enregistrée", ""]
for n,r in enumerate(added,1):
    if len(added)>1: out.append(f"**Capture {n}**")
    out += ["| Stat | Valeur |","|---|---|"]
    for k,lab in L.items():
        if k in ('placement','survival_time') and r.get('type')!='BR': continue
        if k=='damage' and r.get('damage') is None and r.get('type')!='BR': continue
        v = r.get(k); v = FR.get(v,v) if k=="result" else v
        out.append(f"| {lab} | {'⚠️ non trouvé' if v is None else str(v) + (' ✏️' if k in r.get('overrides',[]) else '')} |")
    out += [f"- {x}" for x in r["ocr_notes"]]
    out.append("")
miss = any(r.get(k) is None for r in added for k in ["kills","deaths"])
out.append("⚠️ Des valeurs manquent : modifie l'issue (champs *correction*) pour les compléter, elle sera retraitée." if miss else "✅ Ajoutée au tableau de bord (mise à jour d'ici quelques minutes).")
out.append("\n_✏️ = valeur saisie manuellement. Rien n'est deviné : un champ illisible reste vide._")
open(os.environ.get("COMMENT_FILE","/tmp/comment.md"),"w").write("\n".join(out))
