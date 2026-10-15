#!/usr/bin/env python3
"""Traite une issue 'Modifier mon setup' -> setup.json + commentaire."""
import json, os, re, unicodedata, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev=json.load(open(os.environ.get("GT_EVENT") or os.environ["GITHUB_EVENT_PATH"]));iss=ev["issue"];body=iss.get("body") or ""
def f(l):
    m=re.search(r"###\s*"+re.escape(l)+r"\s*\n+(.*?)(?=\n###|\Z)",body,re.S);v=m.group(1).strip() if m else ""
    return None if v in("","_No response_","None") else v
norm=lambda s:unicodedata.normalize("NFKD",s or "").encode("ascii","ignore").decode().lower().strip()
CATS={"PC (tour)":"pc","Périphériques":"peri","Écran & audio":"screen","Mobile":"mobile","Consoles":"console","Autre":"other"}
db=json.load(open(f"{ROOT}/setup.json"));act=f("Action");cat=CATS.get(f("Catégorie") or "");name=f("Nom")
price=f("Prix en € (optionnel)");p=None;errs=[]
if price:
    m=re.search(r"\d+(?:[.,]\d{1,2})?",price.replace(" ",""))
    if m: p=float(m.group(0).replace(",","."))
    else: errs.append("prix illisible (ignoré)")
date=f("Date d'achat (optionnel, AAAA-MM-JJ)")
if date and not re.match(r"\d{4}-\d{2}-\d{2}$",date): errs.append("date ignorée (format AAAA-MM-JJ)");date=None
fields={"price":p,"date":date,"spec":f("Caractéristiques (optionnel)"),"url":f("Lien produit (optionnel)"),"notes":f("Notes (optionnel)")}
if fields["url"] and not fields["url"].startswith("http"): fields["url"]=None;errs.append("lien ignoré (doit commencer par http)")
match=[i for i in db["items"] if norm(i["name"])==norm(name)]
out=["## 🖥️ Mon setup"];ok=True
if not name or not cat or act not in("Ajouter","Modifier","Retirer"): out.append("⚠️ Action, catégorie et nom sont obligatoires.");ok=False
elif act=="Ajouter":
    it={"id":re.sub(r"[^a-z0-9]+","-",norm(name)).strip("-")[:40]+"-"+str(iss["number"]),"cat":cat,"name":name,"issue":iss["number"],**{k:v for k,v in fields.items() if v is not None}}
    db["items"]=[i for i in db["items"] if i.get("issue")!=iss["number"]]+[it];out.append(f"✅ Ajouté : **{name}**")
elif not match: out.append(f"⚠️ Aucun élément nommé « {name} ». Vérifie le nom exact dans l'app.");ok=False
elif act=="Retirer":
    db["items"]=[i for i in db["items"] if i not in match];db.setdefault("removed",[]).append({**match[0],"removed":datetime.date.today().isoformat()});out.append(f"🗑️ Retiré : **{name}**")
else:
    it=match[0];it["cat"]=cat
    if f("Nouveau nom (optionnel, pour Modifier)"): it["name"]=f("Nouveau nom (optionnel, pour Modifier)")
    for k,v in fields.items():
        if v is not None: it[k]=v
    it.pop("to_confirm",None) if p is not None else None
    out.append(f"✏️ Modifié : **{it['name']}**")
if ok:
    db["updated"]=datetime.date.today().isoformat();json.dump(db,open(f"{ROOT}/setup.json","w"),ensure_ascii=False,indent=1)
    out.append("| Champ | Valeur |\n|---|---|\n"+"\n".join(f"| {k} | {v} |" for k,v in [("Catégorie",f("Catégorie")),("Prix",f"{p:.2f} €".replace('.',',') if p is not None else '—'),("Date",date or '—')]))
out+=[f"- {e}" for e in errs]
open(os.environ.get("COMMENT_FILE","/tmp/c.md"),"w").write("\n\n".join(out))
print("OK" if ok else "FAIL")
