#!/usr/bin/env python3
"""t128 : contrat de versionnage (tools/check_versions.py) — index.html cohérent, et fichier modifié => ?v= augmenté."""
import importlib.util, os, shutil, subprocess, tempfile, unittest
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
def load():
    spec=importlib.util.spec_from_file_location("check_versions",os.path.join(ROOT,"tools","check_versions.py"))
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
class Statique(unittest.TestCase):
    def setUp(self):
        self.cv=load(); self.h=open(os.path.join(ROOT,"index.html"),encoding="utf-8").read(); self.a=open(os.path.join(ROOT,"app.js"),encoding="utf-8").read()
    def test_depot_actuel_coherent(self): self.assertEqual(self.cv.static_problems(self.h,self.a),[])
    def test_prechargement_et_balise_differents(self):
        h=self.h.replace('<script src="app.js?v=','<script src="app.js?v=9',1)
        self.assertTrue(any("plusieurs versions" in p for p in self.cv.static_problems(h,self.a)))
    def test_liste_de_demarrage_rapide_desynchronisee(self):
        a=self.a.replace("rl:['bc','rll']","rl:['bc','rll','sach']",1)
        self.assertTrue(any("#/rl" in p for p in self.cv.static_problems(self.h,a)))
    def test_pages_chart_desynchronisees(self):
        a=self.a.replace("const CHART_R=['rl',","const CHART_R=['steam','rl',",1)
        self.assertTrue(any("CHART_R" in p for p in self.cv.static_problems(self.h,a)))
    def test_sri_chart_desynchronisee(self):
        a=self.a.replace("CHART_SRI='sha384-N","CHART_SRI='sha384-M",1)
        self.assertTrue(any("SRI" in p for p in self.cv.static_problems(self.h,a)))
    def test_sri_chart_retiree(self):
        a=self.a.replace("sc.integrity=CHART_SRI;","",1)
        self.assertTrue(any("SRI" in p for p in self.cv.static_problems(self.h,a)))
class Numeros(unittest.TestCase):
    def test_fichier_modifie_sans_nouveau_numero(self):
        if not shutil.which("git"): self.skipTest("git absent")
        d=tempfile.mkdtemp(); g=lambda *a:subprocess.run(["git","-C",d,*a],capture_output=True,text=True,check=True)
        os.makedirs(d+"/tools"); shutil.copy(os.path.join(ROOT,"tools","check_versions.py"),d+"/tools/")
        for f in ("index.html","app.js","core.js","app.css","cod-ocr.js","sw.js"): shutil.copy(os.path.join(ROOT,f),d+"/"+f)
        g("init","-q"); g("-c","user.email=t@t","-c","user.name=t","add","."); g("-c","user.email=t@t","-c","user.name=t","commit","-qm","base")
        cv=load(); cv.D=d
        self.assertEqual(cv.bump_problems("HEAD")[0],[])                                   # rien modifié
        open(d+"/app.css","a").write("/* changement */")
        P,_=cv.bump_problems("HEAD"); self.assertTrue(any("app.css" in p for p in P),P)     # modifié sans nouveau numéro : échec
        h=open(d+"/index.html").read(); v=cv.versions(h)["app.css"].pop()
        open(d+"/index.html","w").write(h.replace(f"app.css?v={v}",f"app.css?v={int(v)+1}"))
        self.assertEqual(cv.bump_problems("HEAD")[0],[])                                   # numéro augmenté : OK
        self.assertEqual(cv.bump_problems("0"*40)[0],[])                                   # référence absente : contrôle sauté
if __name__=="__main__": unittest.main()
