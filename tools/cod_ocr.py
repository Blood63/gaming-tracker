#!/usr/bin/env python3
"""OCR d'un écran de fin de partie COD Mobile -> stats. N'invente rien : champ non trouvé = None."""
import re, subprocess, sys, json, os, tempfile, unicodedata
from PIL import Image, ImageOps, ImageFilter
PLAYER = os.environ.get("COD_PLAYER", "NVCBlood")
MODES = {"team deathmatch":"Team Deathmatch","match a mort par equipe":"Team Deathmatch","tdm":"Team Deathmatch","domination":"Domination",
 "hardpoint":"Hardpoint","point strategique":"Hardpoint","search and destroy":"Search & Destroy","recherche et destruction":"Search & Destroy",
 "free for all":"Free For All","melee generale":"Free For All","kill confirmed":"Kill Confirmed","elimination confirmee":"Kill Confirmed",
 "gun game":"Gun Game","battle royale":"Battle Royale","ranked":"Ranked","classe":"Ranked","frontline":"Frontline","control":"Control","controle":"Control"}
MAPS = ["Nuketown","Crash","Crossfire","Firing Range","Hijacked","Killhouse","Standoff","Summit","Raid","Rust","Scrapyard","Shipment",
 "Terminal","Tunisia","Meltdown","Takeoff","Hackney Yard","Highrise","Slums","Cage","Coastal","Vacant","Shoot House","Dome","Express",
 "Hacienda","Saloon","Oasis","Reclaim","Suldal Harbor","Monastery","Nuketown Russia","Isolated","Blackout","Alcatraz","Krai"]
RES = {"victory":"win","victoire":"win","defeat":"loss","defaite":"loss","draw":"draw","egalite":"draw","match nul":"draw"}
COLS = {"score":"score","pts":"score","points":"score","kills":"kills","elim":"kills","eliminations":"kills","kill":"kills","tues":"kills",
 "deaths":"deaths","morts":"deaths","death":"deaths","assists":"assists","assistances":"assists","assist":"assists","ast":"assists"}
def norm(s): return unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode().lower()
def variants(path):
    im = Image.open(path).convert("L"); w,h = im.size
    if w < 2000: im = im.resize((w*2, h*2), Image.LANCZOS)
    im = ImageOps.autocontrast(im).filter(ImageFilter.SHARPEN)
    yield im; yield ImageOps.invert(im)  # texte clair sur fond sombre
    yield im.point(lambda p: 255 if p > 140 else 0); yield ImageOps.invert(im).point(lambda p: 255 if p > 140 else 0)
def ocr(path):
    out = []
    for v in variants(path):
        with tempfile.NamedTemporaryFile(suffix=".png") as t:
            v.save(t.name)
            out.append(subprocess.run(["tesseract", t.name, "-", "-l", "eng+fra", "--psm", "6"], capture_output=True, text=True).stdout)
    return out
def parse_text(texts):
    r = {k: None for k in ["mode","map","result","score","kills","deaths","assists","kd"]}; notes = []
    for t in texts:
        n = norm(t)
        if not r["result"]:
            for k,v in RES.items():
                if re.search(r"\b"+k+r"\b", n): r["result"] = v; break
        if not r["mode"]:
            for k,v in MODES.items():
                if re.search(r"\b"+k+r"\b", n): r["mode"] = v; break
        if not r["map"]:
            for m in sorted(MAPS, key=len, reverse=True):
                if re.search(r"\b"+norm(m)+r"\b", n): r["map"] = m; break
        lines = n.splitlines(); hdr = None
        for ln in lines:
            toks = [COLS[w] for w in re.findall(r"[a-z]+", ln) if w in COLS]
            if len(set(toks)) >= 2: hdr = list(dict.fromkeys(toks))
            if norm(PLAYER) in ln and r["kills"] is None:
                nums = [int(x) for x in re.findall(r"(?<![\d.])\d{1,5}(?![\d.])", ln.split(norm(PLAYER),1)[1])]
                if hdr and len(nums) >= len(hdr):
                    for k,v in zip(hdr, nums[-len(hdr):]): r[k] = v
                elif nums: notes.append(f"ligne joueur trouvée ({nums}) mais en-têtes de colonnes illisibles")
        # libellés individuels "Kills: 12", "Éliminations 12"
        for k,f in COLS.items():
            if r[f] is None:
                m = re.search(r"\b"+k+r"\b\s*[:\-]?\s*(\d{1,5})\b", n)
                if m: r[f] = int(m.group(1))
    if r["kills"] is not None and r["deaths"] is not None:
        r["kd"] = round(r["kills"]/r["deaths"], 2) if r["deaths"] else float(r["kills"])
    return r, notes
def parse_image(path):
    texts = ocr(path); r, notes = parse_text(texts); return r, notes, texts[0]
if __name__ == "__main__":
    for p in sys.argv[1:]: r,n,_ = parse_image(p); print(json.dumps({"file":p,**r,"notes":n}, ensure_ascii=False))
