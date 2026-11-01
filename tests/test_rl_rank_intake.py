"""Tests de la saisie de rang Rocket League (tools/rl_rank_intake.py) — python3 -m unittest discover -s tests -p "test_*.py" """
import json, os, sys, tempfile, unittest, copy, io, contextlib
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import rl_rank_intake as ri

BASE = {"updated": "2026-10-14", "playlists": [
  {"id": "1v1", "tier": 4, "tier_name": "Argent II", "div": 3, "mmr": 359, "best_mmr": 409, "best_season": "S36"},
  {"id": "3v3", "tier": 7, "tier_name": "Or II", "div": 4, "mmr": 578, "best_mmr": 654, "best_season": "S38", "percentile": "Bottom 14 %", "streak": {"type": "loss", "count": 2}}],
  "mmr_history": [{"date": "2026-10-13", "playlist": "3v3", "mmr": 578, "note": "fin de session"}], "sessions": [{"date": "2026-10-11"}]}

class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(); ri.F = self.d + "/rocket_league.json"; json.dump(BASE, open(ri.F, "w")); os.environ["COMMENT_FILE"] = self.d + "/c.md"
    def run_(self, data):
        ev = self.d + "/ev.json"; json.dump({"issue": {"title": "t", "body": "```json\n" + json.dumps(data) + "\n```"}}, open(ev, "w")); os.environ["GT_EVENT"] = ev
        b = io.StringIO()
        with contextlib.redirect_stdout(b): ri.main()
        return b.getvalue().strip(), json.load(open(ri.F)), open(self.d + "/c.md").read()
    def P(self, R, i): return next(p for p in R["playlists"] if p["id"] == i)

    def test_mise_a_jour_complete(self):
        o, R, c = self.run_({"action": "rlrank", "playlist": "3v3", "tier": 8, "div": 2, "mmr": 700, "date": "2026-11-01T12:00:00+01:00"})
        p = self.P(R, "3v3"); self.assertEqual(o, "OK")
        self.assertEqual((p["tier"], p["tier_name"], p["div"], p["mmr"], p["best_mmr"], p["rank_at"]), (8, "Or III", 2, 700, 700, "2026-11-01T12:00:00+01:00"))
        self.assertEqual(R["updated"], "2026-11-01"); self.assertEqual(len(R["rank_log"]), 1)
        self.assertEqual(R["mmr_history"][-1]["mmr"], 700); self.assertEqual(len(R["mmr_history"]), 2)
        self.assertEqual(p["percentile"], "Bottom 14 %"); self.assertEqual(R["sessions"], BASE["sessions"])      # rien d'ancien supprimé
    def test_idempotent(self):
        d = {"action": "rlrank", "playlist": "1v1", "tier": 5, "div": 1, "mmr": 400, "date": "2026-11-01T12:00:00+01:00"}
        self.run_(d); o, R, c = self.run_(d); self.assertEqual(o, "OK"); self.assertEqual(len(R["rank_log"]), 1); self.assertIn("déjà", c)
    def test_sans_mmr_garde_l_ancien_et_le_date(self):
        o, R, c = self.run_({"action": "rlrank", "playlist": "1v1", "tier": 5, "div": 1, "date": "2026-11-01T12:00:00+01:00"})
        p = self.P(R, "1v1"); self.assertEqual(p["mmr"], 359); self.assertEqual(p["mmr_at"], "2026-10-14"); self.assertEqual(p["tier_name"], "Argent III")
        self.assertEqual(len(R["mmr_history"]), 1)
    def test_saisie_plus_ancienne_ne_remplace_pas(self):
        self.run_({"action": "rlrank", "playlist": "1v1", "tier": 6, "div": 1, "mmr": 450, "date": "2026-11-01T12:00:00+01:00"})
        o, R, c = self.run_({"action": "rlrank", "playlist": "1v1", "tier": 4, "div": 1, "mmr": 300, "date": "2026-10-20T12:00:00+02:00"})
        self.assertEqual(o, "OK"); self.assertEqual(self.P(R, "1v1")["tier"], 6); self.assertEqual(len(R["rank_log"]), 2)
    def test_supersonic_legend_sans_division(self):
        o, R, c = self.run_({"action": "rlrank", "playlist": "1v1", "tier": 21, "div": 3, "date": "2026-11-01T12:00:00+01:00"})
        self.assertEqual(self.P(R, "1v1")["div"], 1); self.assertEqual(self.P(R, "1v1")["tier_name"], "Supersonic Legend")
    def test_refus_et_fichier_intact(self):
        snap = open(ri.F).read()
        for bad in ({"playlist": "9v9", "tier": 1}, {"playlist": "1v1", "tier": 22}, {"playlist": "1v1", "tier": True}, {"playlist": "1v1", "tier": 3, "div": 5},
                    {"playlist": "1v1", "tier": 3, "mmr": -4}, {"playlist": "1v1", "tier": 3, "mmr": "abc"}, {"playlist": "1v1", "tier": 3, "date": "2026-11-01T12:00:00"},
                    {"playlist": "1v1", "tier": 3, "date": "2099-01-01T12:00:00+01:00"}, {"playlist": "1v1", "tier": 3, "date": "nimporte quoi"}):
            o, R, c = self.run_({"action": "rlrank", "div": 1, "date": "2026-11-01T12:00:00+01:00", **bad}); self.assertEqual(o, "FAIL", bad)
        self.assertEqual(open(ri.F).read(), snap)
        o, R, c = self.run_({"action": "autre"}); self.assertEqual(o, "FAIL")
if __name__ == "__main__": unittest.main()
