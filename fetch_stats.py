#!/usr/bin/env python3
"""Relevé Steam (mercredi et dimanche 00:00, heure de Paris) -> history/steam.jsonl + steam_latest.json.
Valorant : HenrikDev (tools/fetch_valorant.py, HENRIK_API_KEY) ; Rocket League : ballchasing (tools/fetch_ballchasing.py).
tracker.gg n'est plus interrogé (clé refusée, 401) : on n'ajoute plus d'échecs à history/valorant.jsonl ni history/rocket_league.jsonl,
et les fichiers existants sont conservés tels quels."""
import urllib.error, json, os, datetime, urllib.request, re, time
D=os.path.dirname(os.path.abspath(__file__)); NOW=datetime.datetime.now().astimezone().isoformat()
def get(u,h={}):
    r=urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0",**h})
    with urllib.request.urlopen(r,timeout=20) as f: return f.status,f.read().decode()
def save(game,data):
    now=datetime.datetime.now().astimezone().isoformat()
    with open(f"{D}/history/{game}.jsonl","a") as f: f.write(json.dumps({"fetched_at":now,**data},ensure_ascii=False)+"\n")
    json.dump({"fetched_at":now,**data},open(f"{D}/{game}_latest.json","w"),ensure_ascii=False,indent=1)
import subprocess, sys
# Valorant : HenrikDev (valorant.json). tracker.gg : plus aucun appel (voir en-tête).
# NB : rocket_league.json = données manuelles (captures tracker.gg), jamais écrit par ce script.
if os.environ.get("HENRIK_API_KEY"): subprocess.run([sys.executable,f"{D}/tools/fetch_valorant.py"])
SID="76561198754159593"; out={"steamid64":SID}
try:
    try: s,x=get(f"https://steamcommunity.com/profiles/{SID}/?xml=1")
    except Exception as e: x=""; out["profile_xml_error"]=str(e)
    for t in ["steamID","privacyState","onlineState","memberSince","hoursPlayed2Wk","location","vacBanned"]:
        m=re.search(rf"<{t}>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{t}>",x,re.S); out[t]=m.group(1) if m else None
    SK=os.environ.get("STEAM_API_KEY")
    if SK:
        A="https://api.steampowered.com"
        def api(path,**q):
            qs="&".join(f"{k}={v}" for k,v in q.items())
            try: return json.loads(get(f"{A}/{path}/?key={SK}&{qs}")[1])
            except urllib.error.HTTPError as e: return {"error_http":e.code}
            except Exception as e: return {"error":type(e).__name__}
        out["level"]=api("IPlayerService/GetSteamLevel/v1",steamid=SID).get("response",{}).get("player_level")
        out["recent"]=api("IPlayerService/GetRecentlyPlayedGames/v1",steamid=SID).get("response")
        og=api("IPlayerService/GetOwnedGames/v1",steamid=SID,include_appinfo=1,include_played_free_games=1)
        games=og.get("response",{}).get("games",[]) if "response" in og else []
        if not games: out["owned_error"]=og
        for g in games:
            time.sleep(0.25)  # politesse API Steam (17 jeux, ~20 appels)
            g["hours"]=round(g.get("playtime_forever",0)/60,1)
            pa=api("ISteamUserStats/GetPlayerAchievements/v1",steamid=SID,appid=g["appid"])
            ps=pa.get("playerstats",{})
            if ps.get("success") and "achievements" in ps:
                a=ps["achievements"]; g["ach_unlocked"]=sum(x["achieved"] for x in a); g["ach_total"]=len(a)
            else:
                sc=api("ISteamUserStats/GetSchemaForGame/v2",appid=g["appid"])
                n=len(sc.get("game",{}).get("availableGameStats",{}).get("achievements",[]))
                g["ach_total"]=n; g["ach_note"]=ps.get("error") or pa.get("error_http") or "no achievements"
        out["games"]=sorted(games,key=lambda g:-g.get("playtime_forever",0))
    else: out["games_note"]="games/playtime page requires Steam login or STEAM_API_KEY"
    out["status"]="ok"
except Exception as e: out.update(status="error",reason=str(e))
save("steam",out)
print("done",NOW)
