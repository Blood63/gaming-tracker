#!/bin/bash
# Genere latest.json (version + SHA-256 de chaque fichier de l'outil) et le zip a partir des fichiers de ce dossier.
# La liste des fichiers doit rester egale a $AllowedUpdateFiles dans rl-replay-uploader.ps1 (verifie par tests/test_uploader.py).
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
import hashlib,json,re,zipfile,subprocess,os
ps=open('rl-replay-uploader.ps1',encoding='ascii').read()
ver=re.search(r"\$UploaderVersion = '([^']+)'",ps).group(1)
allowed=re.findall(r"'([^']+)'",re.search(r"\$AllowedUpdateFiles = @\(([^)]*)\)",ps).group(1))
missing=[f for f in allowed if not os.path.exists(f)]
if missing: raise SystemExit('fichiers manquants : %s'%missing)
an=''
try: an=subprocess.run(['../rl-analyzer/target/release/rl-analyzer','--version'],capture_output=True,text=True).stdout.strip()
except Exception: pass
sha=lambda f:hashlib.sha256(open(f,'rb').read()).hexdigest()
m={"version":ver,"analyzer":an.replace('rl-analyze ','') or None,"files":{f:sha(f) for f in allowed}}
open('latest.json','w').write(json.dumps(m,indent=2,ensure_ascii=True)+'\n')
fs=allowed+['README.md']
with zipfile.ZipFile('rl-replay-uploader.zip.tmp','w',zipfile.ZIP_DEFLATED) as z:
    for f in fs: z.write(f)
os.replace('rl-replay-uploader.zip.tmp','rl-replay-uploader.zip')
print(len(fs),'fichiers dans le zip')
PY
cat latest.json
