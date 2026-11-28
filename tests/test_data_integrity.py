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
class T128(unittest.TestCase):
    """t128 : localisation Steam jamais publiée, fichiers dérivés et build.json à jour."""
    def setUp(self):
        self.cd=load("check_data","tools/check_data.py"); self.t=tempfile.mkdtemp(); os.makedirs(self.t+"/history"); os.makedirs(self.t+"/rl_local")
    def w(self,p,o): json.dump(o,open(os.path.join(self.t,p),"w"))
    def test_localisation_detectee_partout(self):
        self.w("steam_latest.json",{"steamID":"Blood","location":"Ville, Pays"})
        open(self.t+"/history/steam.jsonl","w").write('{"fetched_at":"2026-11-01","x":{"City":"V"}}\n')
        P=self.cd.check(self.t)
        self.assertTrue(any("steam_latest.json : localisation" in p for p in P),P); self.assertTrue(any("steam.jsonl : localisation" in p for p in P),P)
    def test_mot_location_dans_une_valeur_non_signale(self):
        self.w("store.json",{"apps":{"1":{"name":"Location Simulator","genres":["location"]}}})
        self.assertEqual(self.cd.check(self.t),[])
    def test_le_robot_steam_ne_releve_plus_la_ville(self):
        src=open(os.path.join(ROOT,"fetch_stats.py"),encoding="utf-8").read()
        line=next(l for l in src.splitlines() if '"steamID","privacyState"' in l)
        self.assertNotIn('"location"',line.split("]")[0])
    def test_derives_a_jour_puis_perimes(self):
        tp=load("tabpack","tools/tabpack.py")
        b={"fetched_at":"x","replays":[{"id":"a","result":"win","m":{"bpm":1},"analysis":{"weaknesses":[]},"lid":"L"},{"id":"b","result":"loss"}]}
        self.w("ballchasing_latest.json",b); tp.pack_ballchasing(self.t)
        self.assertEqual(self.cd.check(self.t),[])
        b["replays"][1]["result"]="win"; self.w("ballchasing_latest.json",b)
        self.assertTrue(any("périmés" in p for p in self.cd.check(self.t)))
    def test_summary_perime(self):
        sp=load("split_rl_index","tools/split_rl_index.py"); sp.D=self.t
        self.w("rl_local/index.json",{"v":1,"replays":[{"id":"A","s":{"goals":1},"d_heat":[0]}]}); sp.main()
        self.assertEqual(self.cd.check(self.t),[])
        self.w("rl_local/index.json",{"v":1,"replays":[{"id":"A","s":{"goals":2},"d_heat":[0]}]})
        self.assertTrue(any("summary.json périmé" in p for p in self.cd.check(self.t)))
    def test_build_json_perime(self):
        self.w("goals.json",{"goals":[]}); import hashlib
        h=hashlib.sha1(open(self.t+"/goals.json","rb").read()).hexdigest()[:10]
        self.w("build.json",{"v":"x","f":{"goals.json":h}}); self.assertEqual(self.cd.check(self.t),[])
        self.w("goals.json",{"goals":[{"id":1}]}); self.assertTrue(any("build.json périmé" in p for p in self.cd.check(self.t)))
    def test_tabpack_aller_retour_exact(self):
        tp=load("tabpack","tools/tabpack.py")
        rows=[{"a":1,"b":None,"s":{"x":1.5,"y":[1,2]}},{"b":2,"a":0.0},{"a":-0.0,"s":{"y":None}},{"z":{"k":"é"}},{}]
        enc=json.loads(json.dumps(tp.tab(rows)))
        self.assertEqual(json.dumps(tp.untab(enc)),json.dumps(rows))
        self.assertEqual(tp.untab([1,2]),[1,2]); self.assertEqual(tp.untab(tp.tab([])),[])
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
class CodPseudos(unittest.TestCase):
    """Top 15 n°5 : aucun pseudo d'adversaire COD (duels) ni UID, dans les données comme dans home.json, et le robot n'en stocke jamais."""
    def setUp(self):
        self.cd=load("check_data","tools/check_data.py"); self.t=tempfile.mkdtemp(); os.makedirs(self.t+"/history")
    def w(self,p,o): json.dump(o,open(os.path.join(self.t,p),"w"))
    def test_pseudo_duel_detecte(self):
        self.w("cod_mobile.json",{"player":"Moi","matches":[{"id":"a","date":"2026-01-01","duels":[{"opponent":"Xyz","kills":1,"deaths":0}]}]})
        self.assertTrue(any("duels[].opponent" in p for p in self.cd.check(self.t)))
    def test_pseudo_dans_home_detecte(self):
        self.w("home.json",{"cod":{"matches":[{"id":"a","teammates":["Abc"]}]}})
        self.assertTrue(any("home.json (cod)" in p for p in self.cd.check(self.t)))
    def test_uid_detecte(self):
        self.w("cod_profile.json",{"player":"Moi","player_card":{"player":"Moi","uid":"123456789"}})
        self.assertTrue(any("player_card.uid" in p for p in self.cd.check(self.t)))
    def test_duels_anonymes_et_medailles_ok(self):
        self.w("cod_mobile.json",{"player":"Moi","matches":[{"id":"a","date":"2026-01-01","duels":[{"n":1,"kills":1,"deaths":0}],"medals":[{"name":"Premier sang","count":1}]}]})
        self.assertEqual(self.cd.check(self.t),[])
    def test_vraies_donnees_sans_pseudo_duel(self):
        c=json.load(open(os.path.join(ROOT,"cod_mobile.json"),encoding="utf-8"))
        for m in c["matches"]:
            for i,x in enumerate(m.get("duels") or []): self.assertEqual(set(x),{"n","kills","deaths"}); self.assertEqual(x["n"],i+1)
    def test_robot_ne_stocke_pas_les_pseudos(self):
        ci=load("cod_match_intake","tools/cod_match_intake.py")
        r=ci.clean({"date":"2026-11-28T20:00:00+01:00","result":"win","kills":5,"deaths":2,"opponent":"Zz","players":["Aa"],
                    "duels":[{"opponent":"Bb","kills":2,"deaths":1},{"name":"Cc","kills":0,"deaths":3}]})
        self.assertEqual(r["duels"],[{"n":1,"kills":2,"deaths":1},{"n":2,"kills":0,"deaths":3}])
        txt=json.dumps(r); 
        for n in ("Zz","Aa","Bb","Cc"): self.assertNotIn(n,txt)
        with self.assertRaises(ValueError): ci.clean({"date":"2026-11-28T20:00:00+01:00","result":"win","kills":1,"deaths":1,"duels":[{"kills":"x"}]})
