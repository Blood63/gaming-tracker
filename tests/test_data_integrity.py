#!/usr/bin/env python3
"""t127 : intégrité + confidentialité des données publiées, et anonymisation du tableau des scores Valorant."""
import importlib.util, os, json, tempfile, unittest
ROOT=os.path.join(os.path.dirname(__file__),"..")
def load(name, rel):
    spec=importlib.util.spec_from_file_location(name, os.path.join(ROOT,rel))
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
class DonneesReelles(unittest.TestCase):
    def test_depot_sans_probleme(self):
        cd=load("check_data","tools/check_data.py")
        self.assertEqual(cd.check(os.path.abspath(ROOT)),[])
class Detection(unittest.TestCase):
    def setUp(self):
        self.cd=load("check_data","tools/check_data.py"); self.t=tempfile.mkdtemp(); os.makedirs(self.t+"/history")
    def w(self,p,o): json.dump(o,open(os.path.join(self.t,p),"w"))
    def test_pseudo_autre_joueur_detecte(self):
        self.w("valorant.json",{"matches":[{"id":"a","scoreboard":[{"me":True,"name":"Moi"},{"me":False,"name":"Autre","tag":"EUW"}]}]})
        self.assertTrue(any("vie privée" in p for p in self.cd.check(self.t)))
    def test_jeton_detecte(self):
        self.w("goals.json",{"goals":[],"note":"github_pat_"+"A"*40})
        self.assertTrue(any("jeton" in p for p in self.cd.check(self.t)))
    def test_doublons_et_tri(self):
        self.w("ballchasing_latest.json",{"replays":[{"id":"x","result":"win"},{"id":"x","result":"win"}]})
        open(self.t+"/history/steam.jsonl","w").write('{"fetched_at":"2026-11-02"}\n{"fetched_at":"2026-11-01"}\n')
        P=self.cd.check(self.t)
        self.assertTrue(any("double" in p for p in P)); self.assertTrue(any("non triés" in p for p in P))
    def test_donnees_propres(self):
        self.w("valorant.json",{"matches":[{"id":"a","kills":3,"scoreboard":[{"me":True,"name":"Moi"},{"me":False,"agent":"Sage"}]}]})
        self.assertEqual(self.cd.check(self.t),[])
class AnonValorant(unittest.TestCase):
    def test_seul_le_joueur_suivi_garde_son_pseudo(self):
        fv=load("fetch_valorant","tools/fetch_valorant.py")
        x={"scoreboard":[{"me":True,"name":"Blood","tag":"7629","k":5},{"me":False,"name":"Autre","tag":"EUW","k":3,"agent":"Jett"}]}
        fv.anon_scoreboard(x)
        self.assertEqual(x["scoreboard"][0]["name"],"Blood")
        self.assertNotIn("name",x["scoreboard"][1]); self.assertNotIn("tag",x["scoreboard"][1])
        self.assertEqual(x["scoreboard"][1]["k"],3); self.assertEqual(x["scoreboard"][1]["agent"],"Jett")
    def test_sans_tableau(self):
        fv=load("fetch_valorant","tools/fetch_valorant.py"); self.assertEqual(fv.anon_scoreboard({"id":1}),{"id":1})
if __name__=="__main__": unittest.main()
