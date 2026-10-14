#!/usr/bin/env python3
"""Infos boutique Steam (FR) pour les jeux possédés + DLC -> store.json. Appelé par le workflow hebdo."""
import json, os, time, urllib.request, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_DLC = int(os.environ.get("MAX_DLC", "60"))
def ad(appid):
    for t in range(4):
        try:
            r = urllib.request.Request(f"https://store.steampowered.com/api/appdetails?appids={appid}&l=french&cc=fr", headers={"User-Agent":"Mozilla/5.0"})
            j = json.loads(urllib.request.urlopen(r, timeout=30).read())[str(appid)]
            time.sleep(1.6); return j.get("data") if j.get("success") else None
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(60); continue
            return None
        except Exception: time.sleep(5)
    return None
def price(d):
    if d.get("is_free"): return {"free": True, "text": "Gratuit"}
    p = d.get("price_overview")
    return {"text": p["final_formatted"], "initial": p.get("initial_formatted") or None, "discount": p.get("discount_percent", 0)} if p else None
games = json.load(open(f"{ROOT}/steam_latest.json")).get("games", [])
out = {"fetched_at": datetime.datetime.now().astimezone().isoformat(), "apps": {}}
for g in games:
    d = ad(g["appid"])
    if not d: out["apps"][str(g["appid"])] = {"error": "appdetails indisponible"}; continue
    dl = []
    for did in d.get("dlc", [])[:MAX_DLC]:
        x = ad(did)
        dl.append({"appid": did, "name": x.get("name") if x else None, "price": price(x) if x else None,
                   "image": x.get("header_image") if x else None, "release": (x or {}).get("release_date", {}).get("date"),
                   "url": f"https://store.steampowered.com/app/{did}/"})
    out["apps"][str(g["appid"])] = {
        "name": d.get("name"), "type": d.get("type"), "short_description": d.get("short_description"),
        "header_image": d.get("header_image"), "capsule": d.get("capsule_image"), "background": d.get("background_raw") or d.get("background"),
        "developers": d.get("developers"), "publishers": d.get("publishers"),
        "genres": [x["description"] for x in d.get("genres", [])], "categories": [x["description"] for x in d.get("categories", [])][:8],
        "release_date": d.get("release_date", {}).get("date"), "metacritic": d.get("metacritic"),
        "price": price(d), "screenshots": [s["path_thumbnail"] for s in d.get("screenshots", [])[:8]],
        "screenshots_full": [s["path_full"] for s in d.get("screenshots", [])[:8]],
        "achievements_total": d.get("achievements", {}).get("total"),
        "dlc_count": len(d.get("dlc", [])), "dlc": dl, "url": f"https://store.steampowered.com/app/{g['appid']}/"}
    print(g["name"], "ok", len(dl), "DLC", flush=True)
json.dump(out, open(f"{ROOT}/store.json", "w"), ensure_ascii=False, indent=1)
