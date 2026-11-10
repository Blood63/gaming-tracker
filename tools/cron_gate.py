#!/usr/bin/env python3
"""Filtre les crons d'été/hiver et saute un créneau déjà relevé.
Usage :
  tools/cron_gate.py --kind valorant|steam --phase season
  tools/cron_gate.py --kind valorant|steam --phase slot --file FICHIER [--slot 18:00]
Lit EVENT_NAME / EVENT_SCHEDULE (ou --event / --schedule). Écrit run=/skip=/slot= sur la sortie
(et dans $GITHUB_OUTPUT s'il est défini). TZ : Europe/Paris.
"""
import argparse, datetime, json, os, sys
from zoneinfo import ZoneInfo
PARIS=ZoneInfo("Europe/Paris")

# cron UTC -> (kind, slot visé heure de Paris, saison +0200/+0100)
# Premier passage ~4 h avant l'heure visée ; secours juste après. Minute creuse :17 / :43.
VALORANT={
    "17 11 * * *": ("18:00", "+0200"),  # 13:17 Paris été
    "17 16 * * *": ("18:00", "+0200"),  # 18:17 Paris été (secours)
    "17 12 * * *": ("18:00", "+0100"),  # 13:17 Paris hiver
    "17 17 * * *": ("18:00", "+0100"),  # 18:17 Paris hiver (secours)
    "17 19 * * *": ("01:00", "+0200"),  # 21:17 Paris été (veille)
    "17 23 * * *": ("01:00", "+0200"),  # 01:17 Paris été (secours)
    "17 20 * * *": ("01:00", "+0100"),  # 21:17 Paris hiver (veille)
    "17 0 * * *":  ("01:00", "+0100"),  # 01:17 Paris hiver (secours)
}
STEAM={
    "43 18 * * 2": ("00:00", "+0200"),  # 20:43 Paris mar été
    "43 18 * * 6": ("00:00", "+0200"),
    "43 22 * * 2": ("00:00", "+0200"),  # 00:43 mer été (secours)
    "43 22 * * 6": ("00:00", "+0200"),
    "43 19 * * 2": ("00:00", "+0100"),  # 20:43 Paris mar hiver
    "43 19 * * 6": ("00:00", "+0100"),
    "43 23 * * 2": ("00:00", "+0100"),  # 00:43 mer hiver (secours)
    "43 23 * * 6": ("00:00", "+0100"),
}

def now_paris(now=None):
    if now is None: now=datetime.datetime.now(PARIS)
    elif now.tzinfo is None: now=now.replace(tzinfo=PARIS)
    else: now=now.astimezone(PARIS)
    return now

def offset(now=None):
    return now_paris(now).strftime("%z")

def table(kind):
    return VALORANT if kind=="valorant" else STEAM

def season_ok(kind, schedule, now=None):
    """True si lancement manuel, ou cron de la saison en cours."""
    if not schedule: return True
    meta=table(kind).get(schedule)
    if not meta: return False
    return meta[1]==offset(now)

def slot_of(kind, schedule):
    meta=table(kind).get(schedule) if schedule else None
    return meta[0] if meta else ""

def parse_iso(s):
    if not s: return None
    s=str(s)
    if s.endswith("Z"): s=s[:-1]+"+00:00"
    try:
        dt=datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None: dt=dt.replace(tzinfo=PARIS)
    return dt.astimezone(PARIS)

def read_fetched_at(path, kind):
    if not path or not os.path.exists(path): return None
    if kind=="steam" and path.endswith(".jsonl"):
        last=None
        with open(path,encoding="utf-8") as fh:
            lines=fh.readlines()
        for line in lines:
            line=line.strip()
            if not line: continue
            try: rec=json.loads(line)
            except Exception: continue
            if rec.get("status") in ("ok","incomplete"): last=parse_iso(rec.get("fetched_at"))
        return last
    try:
        with open(path,encoding="utf-8") as f: data=json.load(f)
    except Exception: return None
    return parse_iso(data.get("fetched_at"))

def slot_covered(fetched, slot, now=None):
    """Un relevé existe déjà pour ce créneau (le secours peut alors être sauté)."""
    now=now_paris(now)
    fetched=fetched if isinstance(fetched,datetime.datetime) else parse_iso(fetched)
    if not fetched: return False
    if slot=="18:00":
        # fenêtre : aujourd'hui à partir de 13 h (premier passage)
        start=now.replace(hour=13,minute=0,second=0,microsecond=0)
        end=now.replace(hour=23,minute=59,second=59,microsecond=0)
        return start<=fetched<=end
    if slot=="01:00":
        # premier passage 21:17 la veille → relevé entre 21 h (veille) et 12 h (jour)
        start=(now.replace(hour=21,minute=0,second=0,microsecond=0)-datetime.timedelta(days=1))
        end=now.replace(hour=12,minute=0,second=0,microsecond=0)
        if now.hour>=21:  # on est déjà dans le premier passage du créneau suivant
            start=now.replace(hour=21,minute=0,second=0,microsecond=0)
            end=start+datetime.timedelta(hours=15)
        return start<=fetched<=end
    if slot=="00:00":
        # mercredi/dimanche 00:00 : premier passage 20:43 la veille
        start=(now.replace(hour=20,minute=43,second=0,microsecond=0)-datetime.timedelta(days=1))
        end=now.replace(hour=12,minute=0,second=0,microsecond=0)
        if now.hour>=20:  # soirée du premier passage
            start=now.replace(hour=20,minute=43,second=0,microsecond=0)
            end=start+datetime.timedelta(hours=16)
        return start<=fetched<=end
    return False

def emit(pairs):
    text="".join(f"{k}={v}\n" for k,v in pairs)
    sys.stdout.write(text)
    out=os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out,"a",encoding="utf-8") as f: f.write(text)

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--kind",required=True,choices=("valorant","steam"))
    p.add_argument("--phase",required=True,choices=("season","slot"))
    p.add_argument("--file")
    p.add_argument("--slot")
    p.add_argument("--event",default=os.environ.get("EVENT_NAME") or os.environ.get("GITHUB_EVENT_NAME") or "")
    p.add_argument("--schedule",default=os.environ.get("EVENT_SCHEDULE") if "EVENT_SCHEDULE" in os.environ else os.environ.get("GITHUB_EVENT_SCHEDULE") or "")
    p.add_argument("--now")
    args=p.parse_args(argv)
    now=parse_iso(args.now) if args.now else now_paris()
    sched=args.schedule.strip() or ""
    event=args.event.strip()
    manual=event in ("workflow_dispatch","") and not sched
    if args.phase=="season":
        ok=True if (manual or event=="workflow_dispatch" or not sched) else season_ok(args.kind,sched,now)
        # un cron inconnu en schedule : ne pas lancer
        if sched and sched not in table(args.kind) and event=="schedule": ok=False
        if event=="schedule" and sched and not season_ok(args.kind,sched,now): ok=False
        if event in ("workflow_dispatch",) or (not sched and event!="schedule"): ok=True
        slot=slot_of(args.kind,sched) or (args.slot or "")
        emit([("run","true" if ok else "false"),("slot",slot)])
        return 0
    # phase slot
    slot=args.slot or slot_of(args.kind,sched)
    if event=="workflow_dispatch" or not sched:
        emit([("skip","false"),("slot",slot or "")]); return 0
    fetched=read_fetched_at(args.file,args.kind)
    skip=slot_covered(fetched,slot,now) if slot else False
    emit([("skip","true" if skip else "false"),("slot",slot or "")])
    return 0

if __name__=="__main__":
    sys.exit(main())
