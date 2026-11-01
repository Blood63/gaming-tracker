# rl-analyzer

Analyse locale d'un replay Rocket League (.replay) : statistiques du joueur 443Blood (cartes de chaleur, coups d'envoi, tirs,
buts, aériens, touches, boost, vitesse, rotations, démolitions, possession, évolution dans le match…), au format JSON compact.
Les noms des autres joueurs ne sont **jamais** écrits dans la sortie.

```
rl-analyzer <fichier.replay> [--me-name N]... [--me-epic ID]... [--tz-offset-min N] [--out DIR] [--pretty] [--version]
rl-analyzer index-merge <index.json> <entree.idx.json>... --out <nouveau.json>
```

* `--out DIR` écrit `<id>.json` (détail complet) et `<id>.idx.json` (entrée d'index, plus légère).
* Codes de sortie : 2 usage, 3 lecture, 4 replay illisible, 5 erreur d'analyse (joueur introuvable), 6 index corrompu.
* Compilation Windows depuis Linux : `./build-windows.sh` (voir le script). Résultat copié dans `../rl-uploader/`.
* Replay « partiel » : si le fichier ne contient pas tous les buts (enregistrement commencé après certains buts, ou sans propriété d'en-tête `Goals`), la sortie contient `goals_unseen` = nombre de buts dont le détail n'existe pas. Sans en-tête, les buts vus pendant l'enregistrement sont reconstruits depuis les compteurs `MatchGoals`.
* Validation contre ballchasing : voir `VALIDATION.md`.
