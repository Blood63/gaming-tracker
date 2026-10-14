#!/usr/bin/env python3
"""Traite une issue 'Changement de rang COD' -> cod_ranks.json + commentaire."""
import json, os, re, urllib.request, hashlib, datetime
from zoneinfo import ZoneInfo
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIERS=["Recrue","Régulier","Vaillant","Élite","Pro","Maître","Grand maître","Légendaire"]
SUBS=["I","II","III","IV","V"]
ev=json.load(open(os.environ["GITHUB_EVENT_PATH"]));iss=ev["issue"];body=iss.get("body") or ""
def field(l):
    m=re.search(r"###\s*"+re.escape(l)+r"\s*\n+(.*?)(?=\n###|\Z)",body,re.S);v=m.group(1).strip() if m else ""
    return None if v in("","_No response_","None") else v
mode={"Multijoueur":"MP","Battle Royale":"BR"}.get(field("Mode") or "")
tier=field("Rang");sub=field("Niveau (I à V)");pts=field("Points / étoiles (optionnel)");date=field("Date (optionnel, AAAA-MM-JJ HH:MM)")
errs=[]
if not mode: errs.append("mode manquant")
if tier not in TIERS: errs.append("rang invalide")
if tier=="Légendaire": sub=None
elif sub not in SUBS: errs.append("niveau I–V manquant")
p=None
if pts:
    m=re.search(r"\d[\d\s.,]*",pts); p=int(re.sub(r"\D","",m.group(0))) if m else None
    if p is None: errs.append("points illisibles (ignorés)")
if date and re.match(r"\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$",date): d=datetime.datetime.fromisoformat(date if " " in date else date+" 12:00").replace(tzinfo=ZoneInfo("Europe/Paris")).isoformat()
else: d=iss["created_at"]
shots=[]
for i,u in enumerate(re.findall(r"https://github\.com/user-attachments/assets/[\w-]+",body)):
    try:
        b=urllib.request.urlopen(urllib.request.Request(u,headers={"Authorization":"Bearer "+os.environ.get("GITHUB_TOKEN",""),"User-Agent":"x"}),timeout=60).read()
        f=f"screenshots/cod/ranks/{iss['number']}-{i+1}-{hashlib.sha1(b).hexdigest()[:8]}.png";os.makedirs(f"{ROOT}/screenshots/cod/ranks",exist_ok=True);open(f"{ROOT}/{f}","wb").write(b);shots.append(f)
    except Exception as e: errs.append(f"capture non téléchargée ({e})")
fatal=[e for e in errs if "manquant" in e or "invalide" in e]
out=["## 🎖️ Changement de rang"]
if fatal:
    out.append("⚠️ Non enregistré : "+", ".join(fatal)+". Modifie l'issue pour corriger.")
else:
    path=f"{ROOT}/cod_ranks.json";db=json.load(open(path)) if os.path.exists(path) else {"MP":[],"BR":[]}
    for k in("MP","BR"): db[k]=[x for x in db.get(k,[]) if x.get("issue")!=iss["number"]]
    rec={"date":d,"tier":tier,"sub":sub,"label":tier+(" "+sub if sub else ""),"value":TIERS.index(tier)*5+(SUBS.index(sub)+1 if sub else 1),"points":p,"season":field("Saison (optionnel)"),"issue":iss["number"],"screenshots":shots}
    db[mode].append(rec);db[mode].sort(key=lambda x:x["date"]);json.dump(db,open(path,"w"),ensure_ascii=False,indent=1)
    out+=["| | |","|---|---|",f"| Mode | {field('Mode')} |",f"| Rang | **{rec['label']}** |",f"| Points | {p if p is not None else '—'} |",f"| Date | {d} |",f"| Saison | {rec['season'] or '—'} |"]
    out+=[f"- {e}" for e in errs if e not in fatal]+["","✅ Ajouté au tableau de bord."]
open(os.environ.get("COMMENT_FILE","/tmp/c.md"),"w").write("\n".join(out))
