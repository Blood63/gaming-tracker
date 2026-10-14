#!/usr/bin/env python3
"""Fetch public gaming stats and append dated snapshots to history/<game>.jsonl.
Valorant: HenrikDev API (tools/fetch_valorant.py, HENRIK_API_KEY), tracker.gg fallback.
RL: needs official TRN API key (https://tracker.gg/developers) in env TRN_API_KEY;
scraping tracker.gg is blocked by them, so do not scrape. Steam: public profile XML (+ STEAM_API_KEY optional for games/playtime)."""
import urllib.error, json, os, datetime, urllib.request, re
D=os.path.dirname(os.path.abspath(__file__)); NOW=datetime.datetime.now().astimezone().isoformat()
def get(u,h={}):
    r=urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0",**h})
    with urllib.request.urlopen(r,timeout=20) as f: return f.status,f.read().decode()
def save(game,data):
    with open(f"{D}/history/{game}.jsonl","a") as f: f.write(json.dumps({"fetched_at":NOW,**data},ensure_ascii=False)+"\n")
    json.dump({"fetched_at":NOW,**data},open(f"{D}/{game}_latest.json","w"),ensure_ascii=False,indent=1)
K=os.environ.get("TRN_API_KEY")
import subprocess, sys
# Valorant : HenrikDev en priorité (valorant.json) ; tracker.gg seulement en secours
HENRIK_OK=bool(os.environ.get("HENRIK_API_KEY")) and subprocess.run([sys.executable,f"{D}/tools/fetch_valorant.py"]).returncode==0
for game,path in [("valorant","valorant/standard/profile/riot/Blood%237629"),("rocket_league","rocket-league/standard/profile/epic/443Blood")]:
    if game=="valorant" and HENRIK_OK: continue
    if not K: save(game,{"status":"skipped","reason":"no TRN_API_KEY; tracker.gg blocks unauthenticated requests"}); continue
    try: s,b=get("https://public-api.tracker.gg/v2/"+path,{"TRN-Api-Key":K}); save(game,{"status":"ok","raw":json.loads(b)})
    except urllib.error.HTTPError as e: save(game,{"status":"error","http":e.code,"reason":e.read().decode(errors="replace")[:500]})
    except Exception as e: save(game,{"status":"error","reason":str(e)})
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
