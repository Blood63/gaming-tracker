"""Extraction robuste des données d'une issue créée par l'app.
Ordre : bloc « ### Données » (formulaire), bloc ```json``` du corps (lien sans formulaire), puis marqueur `gt:{...}` en fin de titre
(certains clients — appli GitHub mobile — ne gardent que le titre : ni modèle, ni étiquettes, ni corps)."""
import json, re
def extract(issue):
    body=issue.get("body") or ""; title=issue.get("title") or ""
    for rx in (r"### Données\s*\n+(?:```(?:json)?\s*\n)?(.*?)(?:\n```|\n### |\Z)", r"```json\s*\n(.*?)\n```", r"<!--\s*gt-data\s*(\{.*?\})\s*-->"):
        m=re.search(rx,body,re.S)
        if m and m.group(1).strip():
            try: return json.loads(m.group(1).strip()),"corps"
            except Exception: pass
    m=re.search(r"gt:(\{.*\})\s*$",title)
    if m:
        try: return json.loads(m.group(1)),"titre"
        except Exception as e: raise ValueError(f"données du titre illisibles : {e}")
    return None,None
