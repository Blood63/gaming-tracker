#!/usr/bin/env python3
"""Top 15 n°1-2 : tools/push_data.sh publie sur la dernière version de main sans perdre le travail d'un autre robot,
garde le relevé déjà téléchargé (KEEP=1), sort 1 (et status=failed) si le push est refusé ou si check_data.py refuse."""
import os, json, shutil, subprocess, tempfile, unittest
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
def sh(cmd,cwd,env=None,check=True):
    e={**os.environ,"GIT_AUTHOR_NAME":"t","GIT_AUTHOR_EMAIL":"t@t","GIT_COMMITTER_NAME":"t","GIT_COMMITTER_EMAIL":"t@t",**(env or {})}
    return subprocess.run(cmd,cwd=cwd,shell=True,env=e,capture_output=True,text=True,check=check)
class PushData(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.mkdtemp(); t=self.t
        os.makedirs(f"{t}/seed/tools"); os.makedirs(f"{t}/seed/history")
        for f in ("push_data.sh","check_data.py","build_home.py","tabpack.py","merge_rl_local.py","split_rl_index.py","fetch_ballchasing.py"):
            shutil.copy(f"{ROOT}/tools/{f}",f"{t}/seed/tools/{f}")
        json.dump({"goals":[]},open(f"{t}/seed/goals.json","w")); json.dump({"matches":[]},open(f"{t}/seed/valorant.json","w"))
        sh("git init -q -b main && python3 tools/build_home.py >/dev/null && git add -A && git commit -qm init",f"{t}/seed")
        sh(f"git clone -q --bare seed remote.git && git clone -q remote.git a && git clone -q remote.git b",t)
    def tearDown(self): shutil.rmtree(self.t,ignore_errors=True)
    def run_pd(self,cwd,**env):
        out=f"{self.t}/out"; open(out,"w").close()
        p=sh("bash tools/push_data.sh",cwd,{"GITHUB_OUTPUT":out,"PUSH_SLEEP":"0",**env},check=False)
        return p.returncode,open(out).read().strip(),p.stdout+p.stderr
    def test_course_entre_robots_rien_perdu(self):
        a,b=f"{self.t}/a",f"{self.t}/b"
        json.dump({"matches":[{"id":"m1"}]},open(f"{a}/valorant.json","w"))     # relevé déjà téléchargé par A
        json.dump({"goals":[{"id":1}]},open(f"{b}/goals.json","w"))             # B publie entre-temps
        sh("python3 tools/build_home.py >/dev/null && git commit -qam rival && git push -q origin HEAD:main",b)
        rc,st,log=self.run_pd(a,MSG="Valorant",ADD="valorant.json",KEEP="1")
        self.assertEqual((rc,st),(0,"status=pushed"),log)
        sh("git fetch -q && git reset -q --hard origin/main",b)
        self.assertEqual(json.load(open(f"{b}/valorant.json"))["matches"][0]["id"],"m1")
        self.assertEqual(json.load(open(f"{b}/goals.json"))["goals"],[{"id":1}])
        self.assertEqual(subprocess.run("python3 tools/check_data.py",cwd=b,shell=True).returncode,0)
    def test_push_refuse_echec_visible(self):
        hook=f"{self.t}/remote.git/hooks/pre-receive"; open(hook,"w").write("#!/bin/sh\nexit 1\n"); os.chmod(hook,0o755)
        rc,st,log=self.run_pd(f"{self.t}/a",MSG="Objectifs",ADD="goals.json",TRIES="2",REGEN="echo '{\"goals\":[{\"id\":2}]}' > goals.json; echo OK > res.txt")
        self.assertEqual((rc,st),(1,"status=failed"),log)
    def test_rien_a_publier(self):
        rc,st,log=self.run_pd(f"{self.t}/a",MSG="x",ADD="goals.json")
        self.assertEqual((rc,st),(0,"status=nochange"),log)
    def test_check_data_bloque_un_pseudo(self):
        rc,st,log=self.run_pd(f"{self.t}/a",MSG="COD",ADD="cod_mobile.json",
            REGEN="""echo '{"matches":[{"id":"a","date":"2026-01-01","duels":[{"opponent":"Zed","kills":1,"deaths":0}]}]}' > cod_mobile.json""")
        self.assertEqual((rc,st),(1,"status=failed"),log)
        self.assertEqual(sh("git ls-tree --name-only origin/main",f"{self.t}/a").stdout.count("cod_mobile.json"),0)
class Workflows(unittest.TestCase):
    """Chaque workflow qui écrit sur main : file data-commit (queue: max) et publication par push_data.sh."""
    def test_tous_les_robots(self):
        import glob,re
        for f in glob.glob(f"{ROOT}/.github/workflows/*.yml"):
            s=open(f,encoding="utf-8").read(); n=os.path.basename(f)
            if "contents: write" not in s or n=="pages.yml": continue
            self.assertIn("group: data-commit",s,n); self.assertIn("queue: max",s,n)
            self.assertIn("tools/push_data.sh",s,n); self.assertNotIn("git push",s,n)
            if "gh issue close" in s: self.assertIn('steps.run.outputs.status }}" = "pushed"',s,n)
if __name__=="__main__": unittest.main()
