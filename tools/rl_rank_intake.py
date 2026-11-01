#!/usr/bin/env python3
"""Issue / synchro « Rang Rocket League » (créée par l'app, données JSON dans le corps ou le titre) -> rocket_league.json.
Met à jour le rang (tier, division, MMR facultatif) d'une playlist classée. Aucun relevé existant n'est supprimé :
chaque saisie est ajoutée à `rank_log` (idempotent) et les anciennes valeurs (percentile, série) restent en place ;
l'app masque simplement celles qui datent d'avant la saisie. Une saisie plus ancienne que la dernière ne remplace pas le rang courant."""
import json, os, sys, datetime
from zoneinfo import ZoneInfo
PARIS = ZoneInfo("Europe/Paris")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gt_payload import extract
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); F = f"{D}/rocket_league.json"
RL_T = [f"{t} {n}" for t in ["Bronze", "Argent", "Or", "Platine", "Diamant", "Champion", "Grand Champion"] for n in ["I", "II", "III"]] + ["Supersonic Legend"]
def out(ok, msg):
    open(os.environ.get("COMMENT_FILE", "comment.md"), "w").write(("✅ " if ok else "❌ ") + msg + "\n\n_Le rang est stocké dans `rocket_league.json` (mise à jour de l'app sous quelques minutes)._")
    print("OK" if ok else "FAIL")
def isint(v): return isinstance(v, int) and not isinstance(v, bool)
def main():
    ev = json.load(open(os.environ.get("GT_EVENT") or os.environ["GITHUB_EVENT_PATH"])); iss = ev["issue"]
    try: d, _ = extract(iss)
    except ValueError as e: return out(False, str(e).capitalize() + ".")
    if not d: return out(False, "Aucune donnée trouvée (ni dans le corps, ni dans le titre) : relance la synchronisation depuis l'app (version à jour).")
    if d.get("action") != "rlrank": return out(False, "Action inconnue.")
    R = json.load(open(F, encoding="utf-8")); P = {p["id"]: p for p in R.get("playlists", [])}
    pid = d.get("playlist"); tier = d.get("tier"); div = d.get("div", 1); mmr = d.get("mmr")
    if pid not in P: return out(False, f"Playlist invalide : {pid}.")
    if not isint(tier) or not 0 <= tier < len(RL_T): return out(False, "Rang invalide.")
    if tier == len(RL_T) - 1: div = 1
    elif not isint(div) or not 1 <= div <= 4: return out(False, "Division invalide (I à IV).")
    if mmr is not None and (not isint(mmr) or not 0 <= mmr <= 5000): return out(False, "MMR invalide (0 à 5000).")
    try: dt = datetime.datetime.fromisoformat(str(d.get("date")).replace("Z", "+00:00"))
    except Exception: return out(False, "Date invalide.")
    if dt.tzinfo is None: return out(False, "Date sans fuseau horaire.")
    if dt > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1): return out(False, "Date dans le futur.")
    iso = dt.isoformat(timespec="seconds"); key = lambda e: (str(e.get("date"))[:16], e.get("playlist"), e.get("tier"), e.get("div"), e.get("mmr"))
    rec = {"date": iso, "playlist": pid, "tier": tier, "div": div, "mmr": mmr}
    log = R.setdefault("rank_log", [])
    if any(key(e) == key(rec) for e in log): return out(True, f"Rang déjà enregistré ({pid} · {RL_T[tier]}) : aucun changement.")
    log.append(rec); log.sort(key=lambda e: str(e.get("date")))
    p = P[pid]; prev = p.get("rank_at")
    def ts(s):
        try: return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00")).astimezone(datetime.timezone.utc)
        except Exception: return None
    newer = (prev is None) or (ts(prev) is None) or dt >= ts(prev)
    if newer:
        old_at = prev or R.get("updated")
        p.update({"tier": tier, "tier_name": RL_T[tier], "div": div, "rank_at": iso})
        if mmr is not None:
            p["mmr"] = mmr; p.pop("mmr_at", None)
            if mmr > (p.get("best_mmr") or 0): p["best_mmr"] = mmr; p["best_season"] = "saison actuelle"
        elif "mmr_at" not in p: p["mmr_at"] = old_at          # MMR non ressaisi : on garde l'ancien en le datant
        day = dt.astimezone(PARIS).date().isoformat()
        if str(R.get("updated") or "") < day: R["updated"] = day
    if mmr is not None and pid == "3v3":
        H = R.setdefault("mmr_history", []); day = dt.astimezone(PARIS).date().isoformat()
        if not any(h.get("date") == day and h.get("playlist") == "3v3" and h.get("mmr") == mmr for h in H):
            H.append({"date": day, "playlist": "3v3", "mmr": mmr, "note": "saisi dans l'app"}); H.sort(key=lambda h: h.get("date", ""))
    json.dump(R, open(F, "w", encoding="utf-8"), ensure_ascii=False, indent=1); open(F, "a").write("\n")
    out(True, f"Rang enregistré : **{pid} · {RL_T[tier]}{'' if tier == len(RL_T) - 1 else ' div. ' + 'I II III IV'.split()[div - 1]}**{'' if mmr is None else f' · {mmr} MMR'}{'' if newer else ' (plus ancien que le rang actuel : ajouté à l’historique seulement)'} ({iso[:10]}).")
if __name__ == "__main__": main()
