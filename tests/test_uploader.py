"""Uploader PC (tools/rl-uploader) : manifeste de mise a jour coherent, script lisible par Windows PowerShell 5.1."""
import hashlib, json, os, re, shutil, subprocess, unittest

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "rl-uploader")
PS1 = os.path.join(D, "rl-replay-uploader.ps1")


def rb(p):
    with open(p, "rb") as f:
        return f.read()


def sha(p):
    return hashlib.sha256(rb(p)).hexdigest()


class Manifest(unittest.TestCase):
    def setUp(self):
        self.ps = rb(PS1).decode("ascii")  # échoue si un caractère non ASCII s'est glissé
        self.m = json.loads(rb(os.path.join(D, "latest.json")))

    def test_version_identique(self):
        v = re.search(r"\$UploaderVersion = '([^']+)'", self.ps).group(1)
        self.assertEqual(self.m["version"], v)

    def test_fichiers_et_empreintes(self):
        allowed = re.findall(r"'([^']+)'", re.search(r"\$AllowedUpdateFiles = @\(([^)]*)\)", self.ps).group(1))
        self.assertEqual(sorted(self.m["files"]), sorted(allowed), "latest.json = liste blanche du script")
        for f, h in self.m["files"].items():
            self.assertRegex(h, r"^[0-9a-f]{64}$")
            self.assertEqual(sha(os.path.join(D, f)), h, f"empreinte périmée pour {f} : lancer make-release.sh")

    def test_bat_crlf_ascii(self):
        for f in os.listdir(D):
            if f.endswith(".bat"):
                b = rb(os.path.join(D, f))
                b.decode("ascii")
                self.assertIn(b"\r\n", b, f)
                self.assertNotIn(b"\n", b.replace(b"\r\n", b""), f"{f} : fin de ligne LF seule")

    def test_garde_fous_presents(self):
        self.assertIn("[System.Threading.AbandonedMutexException]", self.ps)
        self.assertIn("bc = $false", self.ps)
        self.assertIn("ZeroFreeBSTR", self.ps)
        self.assertIn("'Read', 'Read')", self.ps)  # ouverture en lecture partagée
        self.assertIn("OneDriveCommercial", self.ps)

    @unittest.skipUnless(shutil.which("pwsh"), "pwsh absent")
    def test_syntaxe_powershell(self):
        cmd = ("$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('%s',[ref]$t,[ref]$e);"
               "$e | %% { $_.Extent.StartLineNumber.ToString() + ': ' + $_.Message }; exit $e.Count") % PS1.replace("'", "''")
        r = subprocess.run(["pwsh", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
