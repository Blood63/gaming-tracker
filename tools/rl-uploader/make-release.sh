#!/bin/bash
# Genere latest.json (versions + SHA-256) et le zip a partir des fichiers de ce dossier.
set -e
cd "$(dirname "$0")"
VER=$(grep -m1 "UploaderVersion = " rl-replay-uploader.ps1 | sed "s/.*'\(.*\)'.*/\1/")
P=$(sha256sum rl-replay-uploader.ps1 | cut -d' ' -f1); E=$(sha256sum rl-analyzer.exe | cut -d' ' -f1)
printf '{\n  "version": "%s",\n  "files": {\n    "rl-replay-uploader.ps1": "%s",\n    "rl-analyzer.exe": "%s"\n  }\n}\n' "$VER" "$P" "$E" > latest.json
rm -f rl-replay-uploader.zip
python3 - <<'PY'
import zipfile,glob
fs=sorted(glob.glob('*.bat'))+['rl-replay-uploader.ps1','rl-analyzer.exe','LISEZ-MOI.txt','README.md']
with zipfile.ZipFile('rl-replay-uploader.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in fs: z.write(f)
print(len(fs),'fichiers')
PY
cat latest.json
