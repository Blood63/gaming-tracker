#!/usr/bin/env python3
"""Succès Steam détaillés -> steam_achievements.json (fichier unique, réécrit à chaque passage ; l'historique n'est pas touché).
Sources : ISteamUserStats/GetPlayerAchievements (l=french), GetSchemaForGame (l=french : nom, description, icônes, caché),
GetGlobalAchievementPercentagesForApp (rareté). Icônes = URL du CDN Steam (non téléchargées). Clé : STEAM_API_KEY (jamais affichée)."""
import json, os, re, time, urllib.request, urllib.error, datetime
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SID="76561198754159593"; SK=os.environ.get("STEAM_API_KEY"); A="https://api.steampowered.com"
CDN="https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/"  # vérifié : sert les mêmes fichiers que steamcdn-a / shared.*.steamstatic
def api(path,**q):
    qs="&".join(f"{k}={v}" for k,v in q.items())
    try:
        with urllib.request.urlopen(urllib.request.Request(f"{A}/{path}/?key={SK}&{qs}",headers={"User-Agent":"Mozilla/5.0"}),timeout=20) as f: return json.loads(f.read().decode())
    except urllib.error.HTTPError as e:
        try: body=json.loads(e.read().decode())
        except Exception: body={}
        return {"error_http":e.code,"body":body}
    except Exception as e: return {"error":type(e).__name__}
def ico(u,appid):
    # on ne garde que le nom de fichier ; l'app reconstruit l'URL du CDN Steam (cdn + appid + "/" + fichier)
    if not u: return ""
    m=re.search(rf"/apps/{appid}/([^/?#]+)$",u); return m.group(1) if m else u
PAT=re.compile(r'api_name\\+":\\+"([A-Za-z0-9_.\-]+)\\+",\\+"name\\+":\\+"(?:.*?)\\+",\\+"description\\+":\\+"(.*?)\\+",\\+"hidden')
def dec(v):
    for _ in range(4):
        try: n=json.loads('"'+v+'"')
        except Exception: break
        if n==v: break
        v=n
    return v
def community_desc(appid):
    """Descriptions officielles (fr) de la page publique des statistiques du jeu : sert uniquement à combler les descriptions absentes de l'API (succès cachés). Jamais de texte inventé."""
    try:
        with urllib.request.urlopen(urllib.request.Request(f"https://steamcommunity.com/stats/{appid}/achievements/?l=french",headers={"User-Agent":"Mozilla/5.0","Accept-Language":"fr"}),timeout=25) as f: s=f.read().decode("utf-8","replace")
    except Exception: return {}
    return {m.group(1):dec(m.group(2)).strip() for m in PAT.finditer(s) if dec(m.group(2)).strip()}
if not SK: raise SystemExit("STEAM_API_KEY manquante")
games=json.load(open(f"{D}/steam_latest.json")).get("games",[])
out={"fetched_at":datetime.datetime.now().astimezone().isoformat(),"cdn":CDN,"games":{}}
for g in games:
    ap=g["appid"]; time.sleep(0.3)
    sc=api("ISteamUserStats/GetSchemaForGame/v2",appid=ap,l="french")
    sch=sc.get("game",{}).get("availableGameStats",{}).get("achievements",[]) or []
    if not sch: out["games"][str(ap)]={"name":g.get("name"),"total":0,"note":"aucun succès"}; continue
    pa=api("ISteamUserStats/GetPlayerAchievements/v1",steamid=SID,appid=ap,l="french")
    ps=pa.get("playerstats") or pa.get("body",{}).get("playerstats") or {}
    mine={x["apiname"]:x for x in ps.get("achievements",[])} if ps.get("success") else {}
    gp=api("ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2",gameid=ap)
    pct={x["name"]:round(float(x["percent"]),1) for x in gp.get("achievementpercentages",{}).get("achievements",[])}
    L=[]
    for s in sch:
        k=s["name"];m=mine.get(k,{})
        d=(s.get("description") or m.get("description") or "").strip()
        L.append({"k":k,"n":(s.get("displayName") or m.get("name") or k).strip(),"d":d,"i":ico(s.get("icon"),ap),"g":ico(s.get("icongray"),ap),
                  **({"h":1} if s.get("hidden") else {}),**({"t":m["unlocktime"]} if m.get("achieved") and m.get("unlocktime") else {}),
                  **({"u":1} if m.get("achieved") else {}),**({"p":pct[k]} if k in pct else {})})
    if any(not x["d"] for x in L):
        time.sleep(0.5); cd=community_desc(ap)
        for x in L:
            if not x["d"] and cd.get(x["k"]): x["d"]=cd[x["k"]]; x["ds"]=1   # ds = description issue de la page publique Steam
    e={"name":g.get("name"),"total":len(L),"unlocked":sum(1 for x in L if x.get("u")),"list":L}
    if not ps.get("success"): e["note"]=ps.get("error") or f"HTTP {pa.get('error_http')}" or "erreur"
    out["games"][str(ap)]=e
json.dump(out,open(f"{D}/steam_achievements.json","w"),ensure_ascii=False,separators=(",",":"))
for ap,e in out["games"].items(): print(ap,(e.get("name") or "")[:30],e.get("unlocked",0),"/",e["total"],e.get("note",""))
