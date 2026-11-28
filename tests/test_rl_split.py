"""Tests du découpage de l'index RL (tools/split_rl_index.py) — python3 -m unittest discover -s tests -p "test_*.py" """
import json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import split_rl_index as sp

def ent(i, deep=True):
    e = {"id": i, "date": "2026-10-1%sT10:00:00Z" % i[-1], "result": "win", "s": {"goals": 1, "avg_boost": 50.5}, "bc": "b" + i}
    if deep: e.update({"d_heat": [0] * 320, "d_kick": [["centre", "prend", "moi", "gagne", 0.3, True]], "d_shots": [[1.0, 2.0, 0.0, 1, 0, "but"]], "d_goals": [], "d_periods": [{"n": 1}], "d_after_goal": []})
    return e

class T(unittest.TestCase):
    def test_split_puis_fusion_redonne_l_index(self):
        idx = {"v": 1, "replays": [ent("A1"), ent("A2", deep=False), ent("A3")]}
        light, deep = sp.split(idx)
        self.assertEqual([r["id"] for r in light["replays"]], ["A1", "A2", "A3"])          # ordre conservé
        self.assertFalse(any(k.startswith("d_") for r in light["replays"] for k in r))     # rien de lourd dans le léger
        self.assertEqual(sorted(deep["deep"]), ["A1", "A3"])                               # pas de bloc vide pour A2
        back = [dict(r, **deep["deep"].get(r["id"], {})) for r in light["replays"]]
        self.assertEqual(back, idx["replays"])                                             # aucune donnée perdue
    def test_entrees_invalides_ignorees_et_index_non_modifie(self):
        idx = {"replays": [ent("A1"), None, {"x": 1}]}; snap = json.dumps(idx, sort_keys=True)
        light, deep = sp.split(idx)
        self.assertEqual(len(light["replays"]), 1); self.assertEqual(json.dumps(idx, sort_keys=True), snap)
    def test_fichiers_deterministes_et_idempotents(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(d + "/rl_local"); json.dump({"v": 1, "replays": [ent("A1"), ent("A2")]}, open(d + "/rl_local/index.json", "w"), ensure_ascii=False)
            old = sys.argv; sys.argv = ["x", d]; sp.D = d
            try:
                self.assertEqual(sp.main(), 0); a = [open(d + "/rl_local/" + f, "rb").read() for f in ("summary.json", "deep.json")]
                m = [os.path.getmtime(d + "/rl_local/" + f) for f in ("summary.json", "deep.json")]
                self.assertEqual(sp.main(), 0); b = [open(d + "/rl_local/" + f, "rb").read() for f in ("summary.json", "deep.json")]
                self.assertEqual(a, b); self.assertEqual(m, [os.path.getmtime(d + "/rl_local/" + f) for f in ("summary.json", "deep.json")])   # rien réécrit
                self.assertTrue(a[0].endswith(b"\n")); self.assertEqual(sp.untab(json.loads(a[0])["replays"])[0]["id"], "A1")
            finally: sys.argv = old
    def test_index_absent_ou_illisible(self):
        with tempfile.TemporaryDirectory() as d:
            sp.D = d; os.makedirs(d + "/rl_local"); self.assertEqual(sp.main(), 0)                      # pas d'index : rien à faire
            open(d + "/rl_local/index.json", "w").write("{pas du json"); self.assertEqual(sp.main(), 1)  # illisible : échec propre, pas de fichier cassé
            self.assertFalse(os.path.exists(d + "/rl_local/summary.json"))
    def test_summary_redonne_exactement_le_leger(self):
        # format « tableau » : décodage(encodage) identique à l'octet près (ordre des clés, null, clés absentes, nombres)
        idx = {"v": 1, "replays": [ent("A1"), dict(ent("A2", deep=False), off=None), {**ent("A3"), "goals_unseen": 1}]}
        idx["replays"][1].pop("bc")
        light, _ = sp.split(idx); s = json.loads(sp.dump(sp.summary(light)))
        self.assertIn("$tab", s["replays"]); self.assertEqual(s["v"], 1)
        self.assertEqual(json.dumps(sp.untab(s["replays"])), json.dumps(light["replays"]))
    def test_ancien_light_json_supprime(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(d + "/rl_local"); json.dump({"v": 1, "replays": [ent("A1")]}, open(d + "/rl_local/index.json", "w"))
            open(d + "/rl_local/light.json", "w").write("{}"); sp.D = d
            self.assertEqual(sp.main(), 0); self.assertFalse(os.path.exists(d + "/rl_local/light.json")); self.assertTrue(os.path.exists(d + "/rl_local/summary.json"))
if __name__ == "__main__": unittest.main()

class Top15U3(unittest.TestCase):
    """Top 15 n°7 : l'index ne porte plus les cartes de chaleur ; deep.json est reconstruit depuis les fiches rl_local/<id>.json."""
    def fiche(self):
        return {"heat": [1] * 4, "heat_ball": [2] * 4, "kick_stats": {"n": 1}, "periods": [{"n": 1}], "team_stats": {"a": 1},
                "shots": [{"x": 1.5, "y": 2, "sp": 3, "on": True, "air": False, "o": "but", "extra": 9}],
                "goals": [{"for": True, "by": "me", "type": "tir", "speed": 90, "air": False, "t": 12.5}],
                "kickoffs": [{"spawn": "centre", "role": "prend", "first": "moi", "out": "gagne", "react": 0.3, "flip": True}],
                "after_goal": [{"t": 1}], "tl": {"t": [0, 1]}}
    def test_deep_depuis_la_fiche_identique_a_l_ancien_index(self):
        f = self.fiche(); d = sp.deep_of(f)
        self.assertEqual(d["d_shots"], [[1.5, 2, 3, True, False, "but"]]); self.assertEqual(d["d_kick"], [["centre", "prend", "moi", "gagne", 0.3, True]])
        self.assertEqual(d["d_goals"], [[True, "me", "tir", 90, False, 12.5]]); self.assertEqual(d["d_heat"], [1] * 4)
        self.assertNotIn("d_tl", d); self.assertEqual(list(d), sorted(d))
        light, deep = sp.split({"v": 1, "replays": [ent("B1", deep=False)]}, detail=lambda i: f)
        self.assertEqual(deep["deep"]["B1"], d)
    def test_entree_ancienne_avec_blocs_utilisee_telle_quelle(self):
        e = ent("B2"); light, deep = sp.split({"replays": [e]}, detail=lambda i: self.fail("fiche lue alors que l'index a ses blocs"))
        self.assertEqual(deep["deep"]["B2"]["d_heat"], [0] * 320)
    def test_fiche_absente_pas_de_bloc(self):
        light, deep = sp.split({"replays": [ent("B3", deep=False)]}, detail=lambda i: None)
        self.assertEqual(deep["deep"], {}); self.assertEqual(len(light["replays"]), 1)
    def test_vrai_depot_index_leger_et_deep_complet(self):
        root = os.path.join(os.path.dirname(__file__), "..")
        idx = json.load(open(os.path.join(root, "rl_local", "index.json"), encoding="utf-8"))["replays"]
        self.assertFalse(any(k in ("d_heat", "d_heat_ball") for r in idx for k in r))
        deep = json.load(open(os.path.join(root, "rl_local", "deep.json"), encoding="utf-8"))["deep"]
        self.assertEqual(set(deep), {r["id"] for r in idx})
        self.assertLess(os.path.getsize(os.path.join(root, "rl_local", "index.json")), 1_500_000)
    def test_check_data_detecte_deep_perime(self):
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools")); import check_data as cd
        with tempfile.TemporaryDirectory() as t:
            os.makedirs(t + "/rl_local"); os.makedirs(t + "/history")
            json.dump({"v": 1, "replays": [ent("C1", deep=False)]}, open(t + "/rl_local/index.json", "w"))
            json.dump({"id": "C1", "d": self.fiche()}, open(t + "/rl_local/C1.json", "w"))
            sp.D = t; sp.main(); self.assertEqual(cd.check(t), [])
            f = self.fiche(); f["heat"] = [9] * 4; json.dump({"id": "C1", "d": f}, open(t + "/rl_local/C1.json", "w"))
            self.assertTrue(any("deep.json périmé" in p for p in cd.check(t)))
