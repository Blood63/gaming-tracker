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
                self.assertEqual(sp.main(), 0); a = [open(d + "/rl_local/" + f, "rb").read() for f in ("light.json", "deep.json")]
                m = [os.path.getmtime(d + "/rl_local/" + f) for f in ("light.json", "deep.json")]
                self.assertEqual(sp.main(), 0); b = [open(d + "/rl_local/" + f, "rb").read() for f in ("light.json", "deep.json")]
                self.assertEqual(a, b); self.assertEqual(m, [os.path.getmtime(d + "/rl_local/" + f) for f in ("light.json", "deep.json")])   # rien réécrit
                self.assertTrue(a[0].endswith(b"\n")); self.assertEqual(json.loads(a[0])["replays"][0]["id"], "A1")
            finally: sys.argv = old
    def test_index_absent_ou_illisible(self):
        with tempfile.TemporaryDirectory() as d:
            sp.D = d; os.makedirs(d + "/rl_local"); self.assertEqual(sp.main(), 0)                      # pas d'index : rien à faire
            open(d + "/rl_local/index.json", "w").write("{pas du json"); self.assertEqual(sp.main(), 1)  # illisible : échec propre, pas de fichier cassé
            self.assertFalse(os.path.exists(d + "/rl_local/light.json"))
if __name__ == "__main__": unittest.main()
