"""Tests de la fusion des replays analysés localement (tools/fetch_ballchasing.py : merge_local) — python3 -m unittest discover tests"""
import json, os, sys, unittest, copy
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import fetch_ballchasing as fb

def bc(id_, date, tg, og, **k):
    r = {"id": id_, "date": date, "playlist": "2v2", "map": "Mannfield", "duration": 300, "team_goals": tg, "opp_goals": og, "result": "win" if tg > og else "loss",
         "goals": 1, "m": {"avg_boost": 50.0}, "bots": False}; r.update(k); return r
def loc(id_, date, tg, og, **k):
    L = {"id": id_, "date": date, "result": "win" if tg > og else "loss", "team_goals": tg, "opp_goals": og, "duration": 300.4, "map": "EuroStadium_P", "playlist_id": 11, "team_size": 2,
         "bots": False, "overtime": False, "s": {"goals": 1, "assists": 0, "saves": 1, "shots": 2, "score": 300, "avg_boost": 48.5, "bpm": 360.4, "shooting_pct": 50}}; L.update(k); return L

class T(unittest.TestCase):
    def setUp(self):
        self.tmp = os.path.join(os.path.dirname(__file__), "_tmp_idx.json"); self._old = fb.LOCAL_IDX; fb.LOCAL_IDX = self.tmp
    def tearDown(self):
        fb.LOCAL_IDX = self._old
        if os.path.exists(self.tmp): os.remove(self.tmp)
    def put(self, L): json.dump({"replays": L}, open(self.tmp, "w"))

    def test_lien_par_id_bc(self):
        R = {"a": bc("a", "2026-10-14T17:20:18Z", 3, 1)}; snap = copy.deepcopy(R)
        self.put([loc("X1", "2026-10-14T17:20:18Z", 3, 1, bc="a")]); n = fb.merge_local(R)
        self.assertEqual(n, 0); self.assertEqual(R["a"]["lid"], "X1"); del R["a"]["lid"]; self.assertEqual(R, snap)   # stats bc intactes
    def test_lien_flou_date_et_score(self):
        R = {"a": bc("a", "2026-10-14T17:20:20Z", 3, 1)}
        self.put([loc("X1", "2026-10-14T17:20:18Z", 3, 1)]); self.assertEqual(fb.merge_local(R), 0); self.assertEqual(R["a"]["lid"], "X1")
    def test_pas_de_faux_lien(self):
        R = {"a": bc("a", "2026-10-14T17:20:18Z", 3, 1)}
        self.put([loc("X2", "2026-10-14T17:20:18Z", 2, 1)])   # même heure, autre score → partie différente
        self.assertEqual(fb.merge_local(R), 1); self.assertNotIn("lid", R["a"])
        self.put([loc("X3", "2026-10-14T18:20:18Z", 3, 1)]); R2 = {"a": bc("a", "2026-10-14T17:20:18Z", 3, 1)}
        self.assertEqual(fb.merge_local(R2), 1)
    def test_replay_local_seul(self):
        R = {}; self.put([loc("X9", "2026-10-26T20:00:00Z", 2, 3)]); self.assertEqual(fb.merge_local(R), 1)
        e = R["X9"]; self.assertEqual(e["src"], "local"); self.assertEqual(e["playlist"], "2v2"); self.assertEqual(e["map"], "Mannfield"); self.assertEqual(e["result"], "loss")
        self.assertEqual(e["m"]["avg_boost"], 48.5); self.assertEqual(e["bpm"], 360)
    def test_idempotent_et_pas_de_doublon_si_bc_recoit_le_replay(self):
        R = {}; self.put([loc("X9", "2026-10-26T20:00:00Z", 2, 3)]); fb.merge_local(R); fb.merge_local(R); self.assertEqual(len(R), 1)
        R["uuid-bc"] = bc("uuid-bc", "2026-10-26T20:00:01Z", 2, 3, rl_id="X9")   # ballchasing reçoit le même replay plus tard
        fb.merge_local(R); self.assertEqual(list(R), ["uuid-bc"]); self.assertEqual(R["uuid-bc"]["lid"], "X9")
    def test_avant_date_min_et_exclus_ignores(self):
        R = {}; self.put([loc("X0", "2026-09-30T20:00:00Z", 2, 3), loc("X1", "2026-10-20T20:00:00Z", 2, 3, bc=next(iter(fb.EXCLUDE)))]); self.assertEqual(fb.merge_local(R), 0); self.assertEqual(R, {})
    def test_bots_et_playlist(self):
        R = {}; self.put([loc("B1", "2026-10-26T20:00:00Z", 2, 1, bots=True, playlist_id=3)]); fb.merge_local(R)
        self.assertEqual(R["B1"]["playlist"], "Contre des bots (Occasionnel 3v3)")
    def test_fichier_absent_ou_casse(self):
        R = {"a": bc("a", "2026-10-14T17:20:18Z", 3, 1)}; self.assertEqual(fb.merge_local(R), 0)
        open(self.tmp, "w").write("{pas du json"); self.assertEqual(fb.merge_local(R), 0); self.assertEqual(list(R), ["a"])
    def test_nom_de_carte_inconnue(self):
        self.assertEqual(fb.map_name("Paname_Dusk_P"), "Paname Dusk"); self.assertEqual(fb.map_name("cs_p"), "Champions Field"); self.assertIsNone(fb.map_name(None))
if __name__ == "__main__": unittest.main()
