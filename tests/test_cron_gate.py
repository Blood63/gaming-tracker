#!/usr/bin/env python3
import datetime, json, os, sys, tempfile, unittest
from zoneinfo import ZoneInfo
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import cron_gate as g
PARIS=ZoneInfo("Europe/Paris")
def winter(h, m=0, day=10, month=11, year=2026):
    return datetime.datetime(year,month,day,h,m,tzinfo=PARIS)  # +0100
class Season(unittest.TestCase):
    def test_hiver_premier_18h_ok(self):
        self.assertTrue(g.season_ok("valorant","17 12 * * *",winter(13,17)))
        self.assertFalse(g.season_ok("valorant","17 11 * * *",winter(13,17)))  # cron d'été
    def test_hiver_secours_18h_ok(self):
        self.assertTrue(g.season_ok("valorant","17 17 * * *",winter(18,17)))
    def test_hiver_1h(self):
        self.assertTrue(g.season_ok("valorant","17 20 * * *",winter(21,17,day=9)))
        self.assertTrue(g.season_ok("valorant","17 0 * * *",winter(1,17)))
        self.assertFalse(g.season_ok("valorant","17 19 * * *",winter(21,17,day=9)))
    def test_steam_hiver(self):
        self.assertTrue(g.season_ok("steam","43 19 * * 2",winter(20,43,day=3)))  # mardi
        self.assertTrue(g.season_ok("steam","43 23 * * 6",winter(0,43,day=8)))
        self.assertFalse(g.season_ok("steam","43 18 * * 2",winter(20,43,day=3)))
    def test_inconnu(self):
        self.assertFalse(g.season_ok("valorant","17 15 * * *",winter(13)))  # ancien cron d'été
        self.assertIsNone(g.table("valorant").get("0 0 * * *"))
class SlotCovered(unittest.TestCase):
    def test_18h_deja_releve(self):
        now=winter(18,17)
        ok=datetime.datetime(2026,11,10,16,5,tzinfo=PARIS)
        self.assertTrue(g.slot_covered(ok,"18:00",now))
        trop_tot=datetime.datetime(2026,11,10,5,39,tzinfo=PARIS)  # créneau 1 h du matin
        self.assertFalse(g.slot_covered(trop_tot,"18:00",now))
        hier=datetime.datetime(2026,11,9,21,31,tzinfo=PARIS)
        self.assertFalse(g.slot_covered(hier,"18:00",now))
    def test_1h_couvre_veille_et_matin(self):
        now=winter(1,17)
        soiree=datetime.datetime(2026,11,9,22,10,tzinfo=PARIS)
        self.assertTrue(g.slot_covered(soiree,"01:00",now))
        matin=datetime.datetime(2026,11,10,0,47,tzinfo=PARIS)
        self.assertTrue(g.slot_covered(matin,"01:00",now))
        aprem=datetime.datetime(2026,11,10,16,0,tzinfo=PARIS)
        self.assertFalse(g.slot_covered(aprem,"01:00",now))
    def test_steam_minuit(self):
        now=winter(0,43,day=8)  # dimanche
        soiree=datetime.datetime(2026,11,7,22,10,tzinfo=PARIS)  # samedi soir
        self.assertTrue(g.slot_covered(soiree,"00:00",now))
        ancien=datetime.datetime(2026,11,4,3,43,tzinfo=PARIS)
        self.assertFalse(g.slot_covered(ancien,"00:00",now))
class Cli(unittest.TestCase):
    def test_season_cli_hiver(self):
        out=g.main.__wrapped__ if False else None
        # capture
        import io, contextlib
        buf=io.StringIO()
        with contextlib.redirect_stdout(buf):
            g.main(["--kind","valorant","--phase","season","--event","schedule","--schedule","17 12 * * *","--now","2026-11-10T13:17:00+01:00"])
        self.assertIn("run=true",buf.getvalue()); self.assertIn("slot=18:00",buf.getvalue())
        buf=io.StringIO()
        with contextlib.redirect_stdout(buf):
            g.main(["--kind","valorant","--phase","season","--event","schedule","--schedule","17 11 * * *","--now","2026-11-10T13:17:00+01:00"])
        self.assertIn("run=false",buf.getvalue())
    def test_slot_skip_et_manuel(self):
        import io, contextlib, tempfile
        with tempfile.NamedTemporaryFile("w",suffix=".json",delete=False) as f:
            json.dump({"fetched_at":"2026-11-10T16:05:00+01:00"},f); path=f.name
        try:
            buf=io.StringIO()
            with contextlib.redirect_stdout(buf):
                g.main(["--kind","valorant","--phase","slot","--file",path,"--slot","18:00","--event","schedule","--schedule","17 17 * * *","--now","2026-11-10T18:17:00+01:00"])
            self.assertIn("skip=true",buf.getvalue())
            buf=io.StringIO()
            with contextlib.redirect_stdout(buf):
                g.main(["--kind","valorant","--phase","slot","--file",path,"--slot","18:00","--event","workflow_dispatch","--now","2026-11-10T18:17:00+01:00"])
            self.assertIn("skip=false",buf.getvalue())
        finally:
            os.remove(path)
if __name__=="__main__":
    unittest.main()
