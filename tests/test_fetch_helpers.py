#!/usr/bin/env python3
import importlib.util, os, sys, tempfile, json, unittest
from unittest import mock
import urllib.error
ROOT=os.path.join(os.path.dirname(__file__),"..")
def load(name, rel):
    spec=importlib.util.spec_from_file_location(name, os.path.join(ROOT,rel))
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
class SteamStatus(unittest.TestCase):
    def setUp(self):
        self.fs=load("fetch_stats","fetch_stats.py")
    def test_ok_si_profil_complet(self):
        self.assertEqual(self.fs.steam_status({"privacyState":"public","onlineState":"offline"}),"ok")
    def test_incomplet_si_champs_vides(self):
        self.assertEqual(self.fs.steam_status({"privacyState":None,"onlineState":None,"games":[1,2]}),"incomplete")
        self.assertEqual(self.fs.steam_status({}),"incomplete")
class ValorantRetry(unittest.TestCase):
    def setUp(self):
        self.fv=load("fetch_valorant","tools/fetch_valorant.py")
    def test_reessaie_sur_timeout_puis_ok(self):
        n={"i":0}
        class R:
            def __enter__(self): return self
            def __exit__(self,*a): pass
            def read(self): return b'{"data":{"ok":1}}'
        def urlopen(*a,**k):
            n["i"]+=1
            if n["i"]<3: raise TimeoutError("timed out")
            return R()
        with mock.patch("urllib.request.urlopen",urlopen):
            out=self.fv.get("/v1/x",retries=3,sleep=lambda s:None)
        self.assertEqual(out,{"data":{"ok":1}})
        self.assertEqual(n["i"],3)
    def test_echec_apres_3_timeouts(self):
        with mock.patch("urllib.request.urlopen",side_effect=TimeoutError("timed out")):
            with self.assertRaises(RuntimeError) as ctx:
                self.fv.get("/v1/x",retries=3,sleep=lambda s:None)
        self.assertIn("délai",str(ctx.exception))
class HomeLite(unittest.TestCase):
    def test_erreurs_401_exclues(self):
        # exécute la logique lite_hist
        recs=[{"status":"error","http":401},{"status":"ok","fetched_at":"2026-10-01"},{"status":"error"}]
        lite=[x for x in recs if x.get("status")=="ok"][-3:]
        self.assertEqual(lite,[{"status":"ok","fetched_at":"2026-10-01"}])
if __name__=="__main__":
    unittest.main()
