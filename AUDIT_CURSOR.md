# Audit Cursor — 28 novembre 2026

Audit en lecture seule du dépôt public **gaming-tracker** (PWA statique) et des deux outils PC : l’uploader PowerShell `tools/rl-uploader` (v2.0.2) et l’analyseur Rust `tools/rl-analyzer` (crate `rl-analyzer` / binaire `rl-analyze` 0.1.2). Aucun correctif de code n’est inclus dans cette branche : seulement ce rapport.

Périmètre lu : `index.html`, `app.js`, `core.js`, `cod-ocr.js`, `app.css`, `sw.js`, données JSON publiées, `tools/*.py`, `.github/workflows`, `tests/`, `tools/rl-uploader/*.ps1` et `*.bat`, `tools/rl-analyzer/src`.

Contraintes respectées dans les propositions : ne jamais publier de nom réel, de pseudo d’un autre joueur, d’UID COD ni de fichier `.replay` ; l’envoi ballchasing coupé (`bc=false` dans la config de la machine) n’est pas un bug ; les créneaux restent Valorant/RL 18:00 et 01:00, Steam mercredi et dimanche 00:00 (Paris) ; pas de rang Rocket League automatique ; pas de chaîne de build ni de minification.

## Déjà en place (non re-signalé)

Vérifié, et laissé tel quel sauf résidu cité plus bas :

- Tableaux Valorant : 211 parties, aucun pseudo tiers (`name` / `tag` hors `me`). L’affichage retombe sur « Allié n » / « Adversaire n » (`valPName`).
- Localisation Steam : `check_data.py` sort 0, aucun champ `location` / `city` / `country`.
- CSP présente (`index.html:2`) : `connect-src` limité au site, `api.github.com` et au CDN. L’absence de `script-src` strict est le compromis Tesseract déjà acté ; le résidu (jeton + scripts CDN) est en A1, pas un « oubli de CSP ».
- Hors ligne : réseau d’abord, repli cache, toast offline/online, secours de navigation.
- RL : `summary.json` tabulaire (0,30 Mo) chargé tout de suite, `deep.json` après, conseils ballchasing (`ballchasing_analysis.json`) à la demande, cache `?h=`.
- `check_versions.py` et `check_data.py` sont verts. Actions en checkout v5. Pages a une seconde tentative de déploiement.
- 493 analyses locales, compteurs buts/tirs/passes alignés sur la validation déjà écrite (`VALIDATION.md`).

## Résultats des tests (cette session)

| Commande | Résultat |
|---|---|
| `node --test tests/*.test.js` | **45 / 45 OK** |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | **55 / 55 OK** (ResourceWarning : fichiers ouverts sans `with`, voir R8) |
| `python3 tools/check_data.py` | **OK** (sortie 0). Le contrôle ne voit pas les pseudos des duels COD : voir P1. |
| `python3 tools/check_versions.py HEAD~1` | **OK** |
| `cargo test` avec le rustc par défaut **1.83** | **impossible** : `edition = "2024"` exige une fonctionnalité non stabilisée dans Cargo 1.83. |
| `cargo +1.88.0 test` (toolchain installée pour l’audit ; `boxcars` 0.13 exige rustc ≥ 1.88) | **12 / 12 OK** dans `tests/cli.rs`, **0 test unitaire** dans `src/`. Les tests qui lisent un `.replay` (`invariants_sur_replays_locaux`, `deterministe_et_valeurs_dorees`, etc.) **retournent tout de suite** s’il n’y a pas `tools/rl-work/replays` : ce dossier n’est pas dans le dépôt (volontaire) et n’existe pas ici. Ils sont donc verts sans avoir mesuré une stat. Durée affichée : 0,00 s. |
| `cargo +1.88.0 clippy --all-targets -- -W clippy::all` | **code 0**, **48 avertissements** sur le binaire, **9** sur les tests. Le seul bug logique nommé par clippy est `overtime` (Z1). Pas de `#[deny]`. |
| PowerShell | **non exécuté** : pas de `pwsh` sur cette machine Linux. Relecture statique seulement. |

`tests.yml` lance Node 22, unittest, `check_data.py` et `check_versions.py`. Il ne lance pas Cargo. Un `rl-analyze` qui ne compile plus peut être poussé sans que la CI le voie (Z7).

## Synthèse

Aucun constat **critique** (pas de jeton dans les fichiers publiés, pas de chaîne d’attaque déjà armée dans le dépôt). Les points **hauts** sont : des workflows qui annoncent un succès alors que `git push` a échoué, une course entre robots qui n’est pas couverte par le groupe `data-commit`, un uploader qui peut ne plus redémarrer après un plantage et qui mémorise un échec d’analyse pour toujours, des pseudos d’autres joueurs encore dans `cod_mobile.json`, le jeton GitHub du navigateur lisible par n’importe quel script de la page, un `index.json` de 3,2 Mo réécrit en entier à chaque envoi, et la page Rocket League qui construit trop de graphiques d’un coup.

---

## 1. Application

### P1 — Pseudos d’autres joueurs encore publiés (duels COD) — haute

- **Où** : `cod_mobile.json` (champ `matches[].duels[].opponent`) ; affichage `app.js:1113` ; contrôle `tools/check_data.py:68-71`.
- **Constat** : 15 chaînes, sur 3 parties, longueur 4 à 13 caractères, aucune n’est un libellé générique. La page partie les écrit dans le HTML public (`vs ${esc(o.opponent)}`). `esc` empêche le HTML, pas la publication du pseudo. `check_data.py` ne regarde que les tableaux Valorant et la clé `"name"` dans `rl_local/index.json`. Il sort donc OK alors que la règle du dépôt (« aucun pseudo d’un autre joueur ») est encore violée. Les médailles (`medals[].name`) sont des noms de médailles, pas des joueurs : ne pas les traiter comme des pseudos.
- **Correctif** : à l’affichage, remplacer par « Adversaire 1 », « Adversaire 2 »… dans l’ordre du tableau (comme `valPName`). Dans les données, remplacer `opponent` par un rang stable (`i` uniquement) via un petit script lancé une fois, sans recopier les chaînes dans le commit, le journal ou ce rapport. Étendre `check_data.py` : échec si `duels[].opponent` est une chaîne non vide. Ajouter un test dans `tests/test_data_integrity.py`.

### A1 — Jeton GitHub dans `localStorage`, scripts CDN sans intégrité — haute

- **Où** : `app.js:243-244` (`TOKK='gt-gh-token'`), `app.js:312-314` (enregistrement), `app.js:48` (Chart.js), `cod-ocr.js:4` (Tesseract), `index.html:2` (CSP), `index.html:14` et `31-33` (scripts sans `integrity`).
- **Constat** : le jeton à grain fin reste dans `localStorage` pour la synchro en un geste. C’est le modèle choisi, et l’export le retire (`app.js:1356`). Il reste lisible par tout script de l’origine. La CSP ne fixe pas `script-src` (Tesseract charge un script et un worker blob). Chart.js et Tesseract viennent de `cdn.jsdelivr.net` **sans hash SRI**. Un paquet npm compromis, ou une XSS, envoie le jeton à `api.github.com` (`connect-src` l’autorise). En plus, le formulaire accepte un jeton classique `ghp_` (`app.js:312`), qui n’est pas limité à ce dépôt : un collage par erreur élargit le rayon en cas de vol.
- **Correctif** (sans chaîne de build) :
  1. N’accepter que `github_pat_` dans `bindSyncSettings`.
  2. Épingler les deux URL CDN avec `integrity` (SRI) et `crossorigin="anonymous"`, et les mêmes URL dans le préchargement de `index.html:14`.
  3. Quand le worker Tesseract le permet, ajouter `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` et `worker-src 'self' blob:` sans ouvrir le reste. Tant que le blob worker casse cette CSP, le documenter en une ligne dans le README plutôt que d’élargir `connect-src`.
  4. Afficher dans Profil la date d’expiration si GitHub la renvoie (`github-authentication-token-expiration`), comme le fait déjà l’uploader. Ne pas mettre le jeton ailleurs (pas de `sessionStorage` « plus sûr » : une XSS le lit aussi).

### A2 — Quelques puits HTML encore ouverts — moyenne

- **Où** : `app.js:1218` (`${o.info}` dans `goalHTML`) ; `core.js:65-84` (`rankGoal` mélange du HTML voulu et `vTier()`, qui ne passe pas par `esc`) ; `app.js:555` (`RLL_OL[p.o]||p.o` dans `rllBindDots`) ; `app.js:72` (`style="background:${col}"`).
- **Constat** : la plupart des textes de données passent par `esc`. `o.info` est injecté brut parce que l’estimation de rang y met des `<br>` et des `<i>`. Un palier renvoyé par l’API avec un `<` (ou un `o` de tir corrompu dans un JSON RL) devient du HTML, sur une page qui détient le jeton. Les couleurs de graphiques viennent aujourd’hui de constantes : risque faible, même schéma.
- **Correctif** : construire `info` comme texte échappé plus des balises écrites dans le code (`<br>`, `<i>`), jamais en interpolant une chaîne API. Dans `rllBindDots`, `esc(RLL_OL[p.o]||p.o)`. Pour le style, n’accepter qu’une couleur `^#[0-9a-fA-F]{3,8}$` ou un nom de la palette.

### A3 — Page Rocket League trop lourde sur téléphone — haute

- **Où** : `app.js:522-562` (`rllHTML` / `rllBind`), `app.js:518-521` (`rllDeepKick` rappelle `rlManual()`), `rl_local/deep.json` (2,23 Mo, 493 replays), `app.js:96` (`CHART_R`).
- **Constat** : le filtre « Toutes » (défaut) alimente environ dix graphiques Chart.js (MMR, donut, coups d’envoi, types de buts, six familles de métriques) avec jusqu’à 493 points chacun, plus un cercle SVG par tir (`rllBindDots`). À l’arrivée de `deep.json`, toute la page est détruite et reconstruite (scroll restauré, mais le fil principal parse 2 Mo puis réinstancie Chart.js). COD et la bibliothèque Steam ont aussi des graphiques et ne sont pas dans le préchargement `CHART_R` (`index.html:14` ne précharge Chart.js que pour `rl`, `valorant`, `profil`).
- **Correctif** : garder le défaut sur « 50 derniers » pour les courbes ; échantillonner au-delà (un point sur n, moyenne glissante déjà là). Créer chaque graphique quand son `<canvas>` entre dans l’écran (`IntersectionObserver`), pas dans `rllBind` d’un bloc. À l’arrivée du détail, remplir les squelettes (`#rllheat`, conseils, tableaux) sans rappeler `rlManual()`. Ajouter `cod` et `steam` à `CHART_R` et au petit script de `index.html:14` (les tests qui comparent cette liste à `app.js` devront suivre).

### A4 — Le préchargement ne réessaie pas si la première requête échoue — moyenne

- **Où** : `index.html:16` (`GT_PRE[u]=fetch(u)` puis `.catch(()=>{})`) ; `app.js:18` (`await (pre||fetch(u))` dans `get`).
- **Constat** : le `.catch` évite un rejet non géré, mais la promesse stockée reste rejetée. `get` la consomme, tombe dans son `catch`, et renvoie `null` sans second `fetch`. Un accroc réseau au tout premier chargement de `valorant.json` ou `summary.json` affiche une page vide ou l’ancien repli jusqu’au rechargement, alors que le réseau est revenu.
- **Correctif** : ne stocker dans `GT_PRE` que les promesses encore pendantes, et dans `get` : si `pre` rejette, `fetch(u)` une fois de plus avant de renoncer.

### A5 — Deux « semaines » différentes sur les mêmes écrans — moyenne

- **Où** : `core.js:301-314` (`valWeekly`, lundi–dimanche, Paris, semaine **terminée**) ; `core.js:156-158` (`weekRecap`, même calendrier) ; `app.js:719-721` et `748` (bilan : **7 jours glissants**).
- **Constat** : la carte « Bilan de la semaine » et la section Valorant « semaine dernière » parlent du lundi–dimanche passé. Les tableaux COD / Valorant / RL du bilan comparent les 7 derniers jours aux 7 d’avant, y compris la semaine en cours. Les chiffres se contredisent sans que le titre le dise.
- **Correctif** : faire calculer les trois tableaux du bilan par `periodStats` sur la même paire de semaines que `weekRecap` (déjà testée). Garder une ligne « semaine en cours » à part, comme `valWeekly` le fait déjà.

### A6 — Record MMR 3v3 figé à 654 — moyenne

- **Où** : `app.js:648` (`lineDS('Record S38 (654)', H.map(()=>654), …)`).
- **Constat** : la droite de référence ne lit pas `best_mmr` du playlist 3v3. Dès que le record change, le graphique ment.
- **Correctif** : `const rec = P.find(p=>p.id=='3v3')?.best_mmr` et une légende « Record (n MMR) ». Masquer la série si `best_mmr` est absent.

### A7 — Accessibilité : lignes cliquables et focus — moyenne

- **Où** : `app.js:402` (`tr[data-v]`), `646` (`tr[data-bc]`), `868` (`tr[data-g]`), `1035` (`tr[data-m]`) ; `app.js:1377-1389` (`render` ne déplace pas le focus) ; `index.html:30` et `app.js:1369-1373` (dialogue `#lb`) ; `app.css:424` (`#lb:focus{outline:none}`).
- **Constat** : le passage précédent a rendu les tableaux focusables et a nommé les en-têtes vides (`a11yFix`, `app.js:1413-1418`). Les lignes qui ouvrent une partie, un replay ou un jeu ne réagissent qu’au clic : pas de lien, pas de `tabindex`, pas de Entrée. Après un changement de hash, le focus reste sur un nœud souvent déjà retiré. Le dialogue d’image se ferme avec Échap et rend le focus, mais Tab en sort, et le contour de focus est annulé.
- **Correctif** : pour chaque ligne, un lien réel (`<a href="#/valorant/…">`) dans la première cellule, ou `tabindex="0"` + Entrée/Espace qui appelle le même `go`. En fin de `render`, si le focus n’est plus dans `document`, `document.getElementById('ttl').focus()` après lui avoir donné `tabindex="-1"`. Dans `#lb`, boucler Tab entre le dialogue et son image, et remplacer `outline:none` par `:focus-visible`.

### A8 — `app.js` : 1 419 lignes, un seul fichier — moyenne

- **Où** : `app.js` (tout), scripts de `index.html:31-33`.
- **Constat** : `core.js` a déjà extrait le calcul pur (testé). Le reste mélange routeur, Steam, Valorant, RL, COD, objectifs, synchro et graphiques. Une modification de thème RL risque la page COD. Pas de bundler voulu : le découpage doit rester des `<script>` classiques, avec le `?v=` déjà contrôlé par `check_versions.py`.
- **Correctif** : sortir, dans cet ordre, `charts.js` (Chart.js, `chart`, `bindCursor`), `sync.js` (jeton, `runSync`), `rl.js`, `cod.js`, `val.js`. Chaque fichier garde `"use strict"` et les globales déjà utilisées (`D`, `esc`, `go`). Monter le `?v=` de chaque nouveau fichier dans `index.html` (balise et préchargement) et ajouter le nom à la liste de `check_versions.py`. Ne pas fusionner ni minifier.

### A9 — Petits résidus applicatifs — basse

- **COD / Steam hors préchargement Chart.js** : voir A3, `app.js:96`.
- **URLs d’aperçu OCR** : `app.js:681` (`URL.createObjectURL`) n’est pas révoqué en quittant `#/cod/ajouter`. Révoquer dans `render` quand on quitte la route, et à chaque remplacement de slot.
- **Cache du service worker** : `sw.js:4` s’appelle `gt-cache-v4` alors que le script est en `?v=9` (`index.html:34`). Une nouvelle stratégie de cache sans changer `C` laisse d’anciennes réponses. Incrémenter `C` dans le même geste que `sw.js?v=`.
- **Hauteur du graphique succès** : `app.js:848` (`jeux × 26` px). Avec une grosse bibliothèque le canvas devient très haut. Plafonner (top 15) ou paginer.
- **Tests** : `tests/core.test.js` couvre bien le calcul. Rien sur `app.js` (DOM), `sw.js`, `cod-ocr.js`. Un test Node du service worker n’est pas réaliste sans navigateur ; un test qui charge `sw.js` dans `node --check` et qui vérifie que le nom de cache et les origines autorisées sont celles du commentaire suffirait. `cod-ocr.js` : tester `splitModeMap`, `fuzzy`, `lev` sur des chaînes fixes (pas besoin d’image).

### Idées utiles (dans les contraintes)

Pas de rang automatique, pas de réactivation ballchasing, pas de nouveau créneau, pas de build.

- Alerte d’expiration du jeton **dans l’app** (A1), pas seulement dans l’uploader.
- Filtre carte sur les replays locaux (les données `map` sont déjà dans `summary.json`).
- Une seule définition de semaine (A5) rend le coaching COD/RL du bilan comparable au bloc Valorant t141.
- Indicateur hors ligne persistant (le toast de `app.js:1408` disparaît en 2 s).
- Les conseils RL `overfill` : voir Z5 avant d’en ajouter d’autres.

---

## 2. Robots et workflows

Tous les workflows qui écrivent `home.json` / `build.json` peuvent se marcher dessus. Seuls une partie d’entre eux partagent le groupe `data-commit`.

### R1 — Issue fermée alors que le push n’a pas abouti — haute

- **Où** : même motif dans `.github/workflows/cod-partie.yml:36-49`, `cod-profil.yml`, `cod-rank.yml`, `objectif.yml:36-49`, `rl-rank.yml`, `setup.yml`.
- **Constat** : la boucle réessaie cinq fois (`fetch` + `reset --hard` + script + `commit && push && break`). Si les cinq `git push` échouent, le script sort **0**. `res` vaut la sortie Python (`OK` si l’intégration locale a réussi). L’étape suivante commente et **ferme l’issue** dès que `res=OK`. La donnée n’est pas sur `main`. L’issue fermée ne se relance pas toute seule. Le corps de l’issue garde le JSON (récupérable à la main), mais l’utilisateur voit une demande traitée.
- **Correctif** : après la boucle, `git fetch` et vérifier que `HEAD` est bien `origin/main` **et** que le commit attendu est dessus. Sinon `exit 1`. Ne fermer l’issue que si cette vérification passe. Initialiser `pushed=0` avant la boucle, le passer à 1 uniquement sur le `push` réussi.

### R2 — Fusion RL et synchro app : échec de push invisible — haute

- **Où** : `.github/workflows/rl-local.yml:21-30` ; `.github/workflows/app-sync.yml:22-31`.
- **Constat** : même boucle, sans `exit 1` à la fin. Pour les replays, `index.json` est déjà sur `main` (poussé par le PC) mais `summary.json`, `deep.json`, `home.json` et `build.json` ne le sont pas. L’appli lit `summary.json` (`app.js:95`, `SRC.rll`) : le nouveau replay reste invisible, et le workflow est vert. La synchro app ne ferme pas d’issue ; si `sync_result.json` est « ok » en local, le job est vert alors que `main` n’a pas bougé. L’app peut encore montrer les éléments en attente (`runSync` regarde ce qui reste), donc le dégât est moindre que R1, mais la CI ment.
- **Correctif** : le même drapeau `pushed` que R1. Pour `rl-local`, échouer le job si le push n’a pas eu lieu **et** que `git diff --cached` n’était pas vide au dernier essai. Le prochain push d’`index.json` relancera le workflow ; en attendant, la page d’Actions doit être rouge.

### R3 — Courses entre workflows, et avec le PC — haute

- **Où** : groupe `data-commit` (`cancel-in-progress: false`) dans `valorant.yml:19-21`, `fetch.yml:23-25`, `rl-local.yml:12`, `build-home.yml`. **Absents** de ce groupe : `app-sync.yml`, `cod-partie.yml`, `cod-profil.yml`, `cod-rank.yml`, `objectif.yml`, `rl-rank.yml`, `setup.yml`. Poussées directes du PC : `rl-replay-uploader.ps1:359-418` (API Contents, en dehors d’Actions).
- **Constat** : deux jobs hors groupe peuvent chacun faire `reset --hard`, modifier `home.json` / `build.json`, et pousser. Le perdant réessaie (R1) **s’il** a une boucle. `valorant.yml:57` et `fetch.yml:68` font un seul `git pull --rebase && git push`. Un conflit sur `home.json` (les deux le régénèrent) fait échouer le job : le relevé Valorant ou Steam de ce créneau n’est pas publié. Le secours horaire rattrape souvent, pas si la course se reproduit. Le PC, lui, ne pousse que `rl_local/` : pas de conflit de fichier avec Valorant, mais il déclenche `rl-local.yml`, qui réécrit `ballchasing_latest.json` et `home.json` en même temps qu’un relevé.
- **Correctif** : mettre **tous** les workflows qui poussent sur `main` dans `concurrency.group: data-commit` avec `cancel-in-progress: false` (ne pas annuler : la file est le but). Ajouter à `valorant.yml` et `fetch.yml` la même boucle à 5 essais que `rl-local.yml`, avec échec explicite. Ne pas élargir le groupe au déploiement Pages (il a déjà `pages-deploy`).

### R4 — Pages se déclenche à chaque fichier de replay — moyenne

- **Où** : `.github/workflows/pages.yml:8-9` (`on.push` sans filtre de chemins), commits « RL replay <id> » (un commit API par fiche, `rl-replay-uploader.ps1:391`).
- **Constat** : une session de jeu produit N commits de fiches + 1 commit d’index + 1 commit de fusion. Chacun lance le déploiement. `cancel-in-progress: true` (`pages.yml:55-57`) et l’attente de 180 s regroupent la rafale, ce qui est voulu. Le coût est une file d’exécutions, et un déploiement annulé au milieu de `deploy-pages` (la seconde tentative ne couvre que l’échec, pas l’annulation).
- **Correctif** : `paths-ignore` sur `rl_local/*.json` **sauf** `rl_local/index.json`, `summary.json`, `deep.json`, `home.json`, `build.json`. Le checkout de Pages prend `main` entier : la fiche est en ligne dès que l’index (ou la fusion) déclenche le déploiement. Ne pas changer l’heure des relevés.

### R5 — Contrôles de données après coup — moyenne

- **Où** : `tools/check_data.py` n’est appelé que par `tests.yml` (push de code, et le lundi 07:37 UTC). Aucun workflow de relevé ne le lance avant `git push`. Angle mort P1 (`check_data.py:68-71`).
- **Constat** : un pseudo ou un champ `location` réintroduit par un robot reste public jusqu’au contrôle du lundi, ou jusqu’à un push de code.
- **Correctif** : `python3 tools/check_data.py` juste avant `git commit` dans `valorant.yml`, `fetch.yml`, `rl-local.yml`, `app-sync.yml`. Si ça échoue, ne pas pousser. Compléter le script (P1).

### R6 — Robustesse moindre des écritures — basse

- **Où** : `tools/merge_rl_local.py:17` (`json.dump` directement sur `ballchasing_latest.json`) ; `tools/tabpack.py:36` et `tools/check_versions.py:48` (`open()` sans fermeture — les ResourceWarning des 55 tests viennent de là et des tests).
- **Constat** : un job tué au milieu du `dump` laisse un JSON tronqué, que le commit suivant peut embarquer. `split_rl_index.py` écrit déjà via `write_if_changed` (plus propre).
- **Correctif** : écrire `fichier.tmp` puis `os.replace`. Fermer les fichiers avec `with`. Pas prioritaire devant R1–R3.

---

## 3. Uploader PowerShell (v2.0.2)

Fichier unique : `tools/rl-uploader/rl-replay-uploader.ps1` (590 lignes), lancé au démarrage de Windows par le raccourci créé dans `Install-Startup` (`:461-481`), aides `1-Installer.bat`, `2-Lancer-maintenant.bat`, `4` à `8` (pas de `3` : le README n’en liste pas ; ce n’est pas un fichier manquant). Jeton et clé ballchasing : DPAPI via `ConvertFrom-SecureString`, hors du dépôt. L’envoi des replays **bruts** vers ballchasing est un réglage (`bc`) : le laisser à `false` sur la machine n’est pas un défaut.

### U1 — Mutex abandonné : l’uploader ne revient pas après un plantage — haute

- **Où** : `rl-replay-uploader.ps1:25` (`$ErrorActionPreference = 'Stop'`) et `:577-580`.
- **Constat** : `Mutex.WaitOne` lève `AbandonedMutexException` si le processus précédent a été tué (veille, mise à jour Windows, `Stop-Process`) sans `ReleaseMutex`. Avec `Stop`, l’exception sort du script **avant** le `try`. La fenêtre est cachée (`-Quiet`, `-WindowStyle Hidden`) : pas de toast. Au login suivant, le même échec. Les replays s’accumulent sur le disque et ne partent plus.
- **Correctif** :

```powershell
$owned = $false
try { $owned = $mtx.WaitOne(0) }
catch [System.Threading.AbandonedMutexException] { $owned = $true }
if (-not $owned) { Write-Line 'Deja en cours.' 'Yellow'; return }
```

Le mutex abandonné est déjà acquis par l’appelant : il faut continuer, pas abandonner.

### U2 — Un échec d’analyse est définitif — haute

- **Où** : `rl-replay-uploader.ps1:311-326`. La clé est `nom:taille|version de l’exe`.
- **Constat** : fichier encore pris par le jeu malgré le test des 3 s, exe remplacé pendant la mise à jour, « joueur introuvable » parce que l’id Epic n’était pas encore dans la config : la ligne est ajoutée à `analysis-failed.log` et **jamais retentée** tant que la version de `rl-analyze` ne change pas. Corriger la config ne répare pas les replays déjà vus.
- **Correctif** : ne journaliser comme définitif que les codes « replay illisible » (4) et « trop court ». Pour « joueur introuvable » (5) et une erreur de lecture (3), ne pas écrire le journal, ou l’écrire avec un compteur (3 essais) puis stopper. Ajouter `-RetryFailed` au `.bat` d’état, qui efface `analysis-failed.log` sans toucher `analyzed.log`.

### U3 — `index.json` de 3,2 Mo réécrit à chaque envoi — haute

- **Où** : `tools/rl-analyzer/src/main.rs:67-79` (l’`.idx.json` embarque `d_heat`, `d_heat_ball`, tirs, buts, coups d’envoi) ; fusion `rl-replay-uploader.ps1:381-405` ; mesure : **493 replays, `rl_local/index.json` = 3,22 Mo**, `summary.json` = 0,30 Mo. Les mêmes cartes sont déjà dans chaque `rl_local/<id>.json` (~23 Ko, max 37 Ko).
- **Constat** : chaque flush télécharge l’index, le fusionne, le ré-encode en base64 et le `PUT`. L’API Contents encaisse 3 Mo aujourd’hui ; à ce rythme (~6,5 Ko de plus par replay dans l’index) le fichier devient le point de panne (timeout 90 s, `:146`, conflits 409 rejoués 4 fois). `split_rl_index.py` ne fait que **copier** les blocs `d_*` de l’index vers `deep.json` : l’index n’a pas besoin de les transporter.
- **Correctif** : dans `main.rs`, ne mettre dans l’`.idx.json` que l’en-tête et `s` (ce que `summary.json` garde). Construire `deep.json` en lisant les `rl_local/<id>.json` déjà poussés (`split_rl_index.py`), pas les `d_*` de l’index. Un flush n’uploade alors qu’un index proche de 0,3 Mo. Les fiches détaillées restent un `PUT` par nouveau replay (déjà le cas, et 422 = déjà présente, `:394`). Ne pas republier les 493 fiches.

### U4 — Verrou exclusif et chemins de replays — moyenne

- **Où** : `Test-FileReady` `:240-244` (`FileShare.None` + 3 s de pause **par fichier**, dans la boucle) ; `Get-DemoDirs` `:219-233`.
- **Constat** : attendre que Rocket League ait fini d’écrire est le bon réflexe. OneDrive ouvre souvent le fichier en partage lecture pour la synchro : l’ouvert exclusif échoue, le replay n’est jamais « prêt », et chaque passage perd 3 s. Les dossiers cherchés sont Documents (y compris la redirection connue), `OneDrive`, `OneDriveConsumer`, sous-dossiers `Demos` et `DemosEpic`. Il manque `OneDriveCommercial`, un chemin choisi dans le jeu, et un second compte Epic : l’id est unique dans la config par défaut (`:88`, `epic = '8d1cf32b…'`). Tous les comptes Epic du même Windows écrivent dans le même `DemosEpic` ; un replay où cet id n’est pas joueur tombe dans U2.
- **Correctif** : taille stable sur deux lectures, puis ouverture en `FileShare.Read` (le jeu, lui, garde un verrou exclusif tant qu’il écrit). Ajouter `OneDriveCommercial`. Dans `6-Voir-letat.bat`, afficher les dossiers surveillés et accepter un chemin supplémentaire dans `config.json` (`demos`), pas seulement le paramètre `-DemosDir` (le raccourci de démarrage ne le passe pas). Documenter : un second compte = une seconde ligne `epic` (le tableau `me_epics` existe déjà côté Rust, `:40` de `calc.rs`, et le script passe déjà `--me-epic`).

### U5 — Mise à jour : le hash ne signe pas l’origine, et le nom de fichier n’est pas borné — moyenne

- **Où** : `Invoke-SelfUpdate` `:490-527` ; manifeste `tools/rl-uploader/latest.json` (v2.0.2, ps1 + exe).
- **Constat** : HTTPS + SHA-256 empêchent un fichier tronqué ou un miroir qui ne contrôle pas le dépôt. Le manifeste et les binaires viennent du **même** `raw.githubusercontent.com/.../main`. Quiconque peut pousser sur `main` publie un exe dont le hash correspond. C’est le modèle actuel (mise à jour manuelle, `7-Mettre-a-jour.bat`) : acceptable, à condition de refuser un nom de fichier qui sort du dossier. `Join-Path $ScriptDir $p.Name` suivi de `Copy-Item` suit un `..\`.
- **Correctif** : n’accepter que `rl-replay-uploader.ps1` et `rl-analyzer.exe` (liste blanche). Refuser si le chemin résolu n’est pas enfant de `$ScriptDir`. Le hash reste nécessaire en plus. Ne pas activer la mise à jour automatique.

### U6 — Défaut `bc = $true` et visibilité publique — moyenne (pied, pas l’état actuel)

- **Où** : `rl-replay-uploader.ps1:39` (`visibility=public`) et `:88` (`bc = $true` **avant** lecture du fichier). Le README (`tools/rl-uploader/README.md:8-9`) décrit encore l’envoi ballchasing comme le comportement de la période de validation.
- **Constat** : une config déjà enregistrée avec `bc=false` reste à false : ce n’est pas un bug. Une config recréée (fichier illisible, `:94`, ou première installation) **réactive** l’upload public. Le fichier `.replay` contient les pseudos des autres joueurs ; ballchasing les republie. Le projet a choisi de ne plus faire cet envoi.
- **Correctif** : défaut `bc = $false`. Ne passer à `true` que sur `-BallchasingOn` après une clé valide. Aligner le README et le texte de `1-Installer.bat` (il annonce encore l’envoi ballchasing). Ne pas changer l’URL ni réactiver l’envoi dans cet audit.

### U7 — Journaux, file, et fichier qui bloque la file — moyenne

- **Où** : rotation `activity.log` seulement, `:61` (renommage vers `.old`, qui écrase le précédent) ; `uploaded.log`, `analyzed.log`, `pushed.log`, `analysis-failed.log` sans limite ; relecture entière à chaque passage (`Read-KeySet`, `:235-238`) toutes les 15 s (`:589`). File : `Select-Object -First 25` (`:361`) ; un `PUT` qui n’est ni 200, 201, ni 422 fait `Set-Backoff` et `return` (`:396`) **sans écarter** ce fichier.
- **Constat** : au bout d’un an les journaux grossissent et sont relus en boucle. Une fiche JSON refusée par l’API (corps trop gros, JSON cassé) reste en tête des 25 : rien derrière elle ne part, avec un backoff jusqu’à 15 min, indéfiniment.
- **Correctif** : couper chaque journal au-delà de 1 Mo en gardant les 2000 dernières lignes (la clé est en début de ligne : recharger le résidu). Après 5 échecs sur le même id, déplacer la paire `.json` / `.idx.json` dans `queue/failed/` et continuer le lot. Le montrer dans `6-Voir-letat.bat`.

### U8 — Détails de durcissement — basse

- `Test-BcKey` (`:121`) : `curl -o (GetTempFileName)` crée un fichier jamais supprimé. Passer `-o NUL` (Windows) ou supprimer le chemin dans le `finally`.
- `Unprotect-Str` / `Read-Secret` (`:103-110`) : le `BSTR` n’est pas libéré (`ZeroFreeBSTR`). Fuite mémoire du secret, pas une fuite disque.
- `Show-Toast` (`:73`) bloque 5,5 s et charge WinForms au milieu de la surveillance. Afficher la bulle sans `Start-Sleep`, ou seulement hors du passage de scan.
- Le raccourci et les `.bat` utilisent `-ExecutionPolicy Bypass`. C’est ce qui permet à un script non signé de démarrer. Le dossier `%LOCALAPPDATA%\rl-replay-uploader` n’a pas l’ACL de `%APPDATA%\rl-replay-uploader` (`Protect-Dir`, `:77-79`, réservé à la config). Un processus du même utilisateur peut remplacer le `.ps1` lancé au login. Appliquer `Protect-Dir` aussi au dossier d’installation, après la copie.
- `-TestFile` (`:539-548`) laisse le dossier temporaire (voulu pour inspecter). Le dire dans le message, et supprimer les dossiers `rla-*` de plus de 7 jours au démarrage.
- Comparaison `minDate` sur l’heure locale du fichier (`:317`), pas sur la date du match. Un replay du 30 septembre au soir peut passer ou être exclu selon le fuseau. Comparer la date parsée par l’analyseur (champ `date`) plutôt que `LastWriteTime`.

---

## 4. Analyseur Rust (`rl-analyze` 0.1.2)

`boxcars` 0.13, édition 2024, rustc de build ≥ 1.88. Les compteurs du jeu (buts, passes, arrêts, tirs, score, dégagements, centres) sont exacts sur les 124 replays de `VALIDATION.md`. Ce qui suit est le reste.

### Z1 — `overtime` est toujours faux — moyenne

- **Où** : `src/calc.rs:436` (`f.st == 2 && false`) ; `src/ingest.rs:284` (`overtime_hint: false` en dur) ; champ jamais lu (`ingest.rs:99`). Clippy : `overly_complex_bool_expr`, « logic bug ». Sur les 493 replays publiés, `overtime` est faux partout.
- **Constat** : le champ est recopié dans `ballchasing_latest.json` par `fetch_ballchasing.py` (`overtime: bool(L.get("overtime"))`). Toute future stat « prolongations » sera fausse. L’expression `&& false` est un reste de chantier, masqué en partie par `#![allow(unused_variables, unused_assignments, unused_mut)]` en tête de `calc.rs:1` (ça ne cache pas ce clippy-là, mais ça cache le code mort autour).
- **Correctif** : lire l’état réseau dont le nom contient `Overtime` (`state_names` est déjà collecté) ou la propriété d’en-tête équivalente, et poser `overtime` si au moins une image de jeu est dans cet état. Supprimer `&& false`. Tester sur un replay de prolongations **local** (non publié) et figer le booléen dans `tests/golden.json`.

### Z2 — La carte de chaleur inclut le compte à rebours, le texte dit le contraire — moyenne

- **Où** : `src/calc.rs:149` (`st == 1 || st == 2`) ; texte UI `app.js:552` (« hors coup d’envoi figé ») ; contournement d’affichage `app.js:482-485` (plafond au 97e centile « parce que les cases de coup d’envoi écrasent le reste »).
- **Constat** : `st == 1` est le compte à rebours (la transition 1 → 2 ouvre le coup d’envoi, `calc.rs:188`). La voiture est immobile sur son apparition plusieurs secondes, cinq fois par match. Les pourcentages de **tiers** (`pct_def_third`, etc.) viennent d’une autre boucle, validée contre ballchasing (écart ~0,2 point) : ne pas les mélanger avec la grille. La grille, elle, gonfle le camp de l’apparition, et `rllHeatZones` (`core.js:203-206`) s’en sert pour « dans ton camp / milieu / camp adverse ».
- **Correctif** : n’ajouter à `heat_me` / `heat_ball` que `st == 2`, et ignorer les images où la vitesse est ~0 dans la première seconde après le passage à `st == 2`. Vérifier sur un replay local que la case d’apparition baisse sans déplacer le mode de la grille. Mettre à jour la phrase de l’UI seulement après ça.

### Z3 — « Bot » = « pas d’id Epic » — moyenne

- **Où** : `src/ingest.rs:294` (`bot: p.epic.is_empty()`) ; `src/calc.rs:439` (`bots` si **un** joueur a ce drapeau) ; filtre appli `core.js:196` (`rllClean` enlève `r.bots`).
- **Constat** : 1 replay sur 493 est marqué `bots` et disparaît des stats. Un joueur Steam dans un salon Epic n’a souvent pas d’`EpicAccountId` : le match entier est traité comme une partie contre des bots. L’heuristique « epic vide » confond bot et compte Steam.
- **Correctif** : `bot` seulement si le nom ou le drapeau réseau dit bot (les propriétés `TAGame` déjà parsées : nom se terminant par `(Bot)` / `Bot_TA`, ou l’absence **à la fois** d’Epic et de `UniqueId` plateforme). Ne pas exclure le replay si le joueur local a bien été trouvé. Garder l’exclusion des vraies parties d’entraînement.

### Z4 — Un patch qui renomme un compteur publie des zéros — moyenne

- **Où** : `src/ingest.rs:16-62` (noms d’attributs en dur) ; `src/calc.rs:156` (`ctot` = max du compteur, sinon 0) ; `src/main.rs:57-59` (panic et parse → code 4, le reste → code 5). L’uploader traite le code ≠ 0 comme un échec (U2).
- **Constat** : si `boxcars` parse encore le fichier mais que `TAGame.PRI_TA:MatchGoals` a été renommé, l’analyse **réussit** avec des buts à 0, et l’uploader pousse ça. Le score d’en-tête (`Team0Score` / `Team1Score`) peut être non nul pendant que tous les compteurs sont à 0. `overtime_hint` et `DemoEv` montrent déjà des champs parsés puis ignorés : les démolitions publiées viennent des compteurs (`VALIDATION.md` : 122/124 exactes), pas de `m.demos`.
- **Correctif** : si `score[0]+score[1] > 0` et que la somme des compteurs `Goals` de tous les joueurs est 0, retourner `Err` (code 5) au lieu d’un JSON « réussi ». Ainsi U2 (une fois corrigé) réessaiera avec la version suivante de l’exe au lieu de figer un match vide. Épingler `rust-toolchain.toml` à `1.88.0` (ou stable du jour du build) à côté de `Cargo.toml`.

### Z5 — Chiffres affichés que la validation dit non comparables — moyenne

- **Où** : `src/calc.rs:408-409` (`bpm` = boost **consommé** / min, `bcpm` = boost **ramassé** / min, `overfill` = plafond physique) ; libellés `app.js:424` et `:463` (« Boost ramassé / min », « Boost gaspillé ») ; `VALIDATION.md:27-29` et `:77-78`.
- **Constat** : `bcpm` est à 0,9 % d’erreur moyenne de ballchasing, `bpm` à 3,7 %. L’UI appelle `bpm` « ramassé ». `overfill` local est ~257 contre ~118 côté ballchasing (MAE 119 %) : le document dit que l’app ne compare pas les deux définitions, mais `rllCards` affiche quand même `overfill_pct` comme « Boost gaspillé », et les repères ballchasing (`fetch_ballchasing.py`, clé `overfill_pct`) servent au coaching des replays issus de ballchasing. Mélanger les deux échelles sur une même étiquette fausse le conseil.
- **Correctif** : afficher `bcpm` sous « Boost ramassé / min » pour l’analyse locale, garder `bpm` sous « Boost consommé / min » ou le retirer de la carte. Ne pas montrer `overfill_pct` local à côté du repère ballchasing ; une phrase « définition locale, pas comparable » ou masquer la carte. `dist_ball` a un biais stable d’environ +81 uu (`VALIDATION.md`) : le noter dans l’UI ou le compenser seulement après une cause identifiée, pas à l’aveugle.

### Z6 — Couverture de tests et clippy — haute pour la CI, basse pour le style

- **Où** : `.github/workflows/tests.yml` (pas de job Rust) ; `tools/rl-analyzer/build-windows.sh:7` (`cargo test` seulement au moment du build Windows) ; `src/calc.rs:1` ; clippy 1.88 : 48 avertissements binaire (dont `dead_code` sur `near_pad`, `boost_max`, `DemoEv`, `overtime_hint`, `Frm.hit`, et une dizaine de `else if` manquants / `map_or`).
- **Constat** : les 12 tests d’intégration qui **peuvent** tourner sans replay (fichier absent → code 3, fichier pourri → code 4, `--version`, fusion d’index) sont bons et passent. Ceux qui protègent les stats sont des no-op sans corpus local. Il n’y a aucun `#[test]` dans `src/`. `cargo clippy` ne casse pas le build. Le rustc 1.83 du système ne parse même pas le manifeste.
- **Correctif** : job CI `cargo +stable test` **sans** corpus (les codes de sortie et `index-merge`), avec `rust-toolchain.toml` à 1.88 minimum. Ne pas committer de `.replay`. Garder les golden tests derrière `RL_TEST_DIR` sur la machine de build (`build-windows.sh` le fait déjà). Ajouter deux ou trois tests purs dans `calc.rs` qui ne lisent pas un replay : `parse_date` (décalage, minuit, changement d’heure), `sim_on_target` sur un vecteur vers le but et un vecteur dans le mur, `find_me` epic avant nom. `cargo clippy -- -D warnings` seulement après avoir traité Z1 et le `dead_code` évident (`near_pad` doublon de `near_pad_xy`, `DemoEv` utilisé ou retiré) ; le reste (`map_or`, `format`) peut rester en warning.

### Z7 — Stats déjà bonnes, petits gains — basse

- Égalité de position entre coéquipiers : biais d’environ +1,2 point sur « le plus avancé / le plus proche » (`VALIDATION.md`). Trancher l’égalité par slot stable plutôt que par `abs() < 0.01` (`calc.rs:136-140`) pour que le total des rôles ne dépasse pas 100 % quand deux voitures sont à la même distance.
- `avg_boost` (boost physique) corrèle mal avec ballchasing (0,69). `avg_boost_held` est déjà calculé. L’UI peut proposer les deux, sans prétendre que c’est le chiffre ballchasing.
- Match nul : `result` vaut `loss` si le score n’est pas strictement supérieur (`calc.rs:394` et `:437`). Aucun nul dans les 493 replays (Rocket League joue la prolongation). Si Z1 est fait, un score égal hors forfait devrait être `draw`, pas une défaite.
- Attribut inconnu → `A::Other` silencieux (`ingest.rs:62`). Le garde-fou Z4 couvre le cas grave ; un compteur de champs `Other` en `--debug` suffit pour le prochain patch.

---

## Top 15 (par ordre)

Effort : **court** = un fichier ou un motif copié, pas de migration de données ; **moyen** = plusieurs fichiers, ou un essai sur le PC Windows ; **long** = changement de forme des données déjà publiées plus la page qui les lit. Pas de délai calendaire.

| # | Sujet | Sévérité | Effort | Premier fichier |
|---|---|---|---|---|
| 1 | Ne fermer l’issue / ne sortir 0 que si `git push` a réussi (R1, R2) | haute | court | `.github/workflows/cod-partie.yml` (puis les 5 autres, `rl-local.yml`, `app-sync.yml`) |
| 2 | Un seul groupe `data-commit` pour tout workflow qui pousse, et boucle de retry sur Valorant et Steam (R3) | haute | court | `.github/workflows/valorant.yml`, `fetch.yml`, les workflows d’issues |
| 3 | Mutex abandonné : continuer au lieu de mourir en silencieux (U1) | haute | court | `tools/rl-uploader/rl-replay-uploader.ps1:577` |
| 4 | Ne plus figer un échec d’analyse pour toujours ; `-RetryFailed` (U2) | haute | court | `rl-replay-uploader.ps1:311-326` |
| 5 | Retirer les pseudos des duels COD et faire échouer `check_data.py` s’ils reviennent (P1) | haute | court | `cod_mobile.json` (champ seulement), `app.js:1113`, `tools/check_data.py` |
| 6 | SRI sur Chart.js et Tesseract, refuser `ghp_`, échapper `o.info` et `p.o` (A1, A2) | haute | moyen | `index.html`, `app.js:312`, `app.js:1218` |
| 7 | Index RL sans cartes de chaleur ; `deep.json` lu depuis les fiches `<id>.json` (U3) | haute | moyen | `tools/rl-analyzer/src/main.rs:67`, `tools/split_rl_index.py` |
| 8 | Page RL : 50 derniers par défaut, graphiques à l’entrée dans l’écran, pas de reconstruction complète quand `deep.json` arrive (A3) | haute | moyen | `app.js:518-562` |
| 9 | `rust-toolchain.toml` 1.88 et `cargo test` dans `tests.yml` ; garde-fou « score > 0 mais compteurs à 0 » (Z4, Z6) | haute | court | `.github/workflows/tests.yml`, `src/calc.rs` |
| 10 | Second `fetch` si le préchargement `GT_PRE` a échoué (A4) | moyenne | court | `index.html:16`, `app.js:18` |
| 11 | Prolongations réelles, supprimer `&& false` (Z1) | moyenne | moyen | `src/calc.rs:436`, `src/ingest.rs:284` |
| 12 | Carte de chaleur : jeu en cours seulement, pas le compte à rebours (Z2) | moyenne | court | `src/calc.rs:149` |
| 13 | Ne pas marquer bot un joueur Steam ; ne pas jeter le match entier (Z3) | moyenne | court | `src/ingest.rs:294`, `src/calc.rs:439` |
| 14 | Replays : partage lecture après taille stable, `OneDriveCommercial`, chemin et second id Epic dans la config (U4) | moyenne | moyen | `rl-replay-uploader.ps1:219-244` (à vérifier sur le PC) |
| 15 | Lignes d’historique accessibles au clavier et focus ramené sur le titre (A7) | moyenne | moyen | `app.js:402`, `app.js:1377` |

Ensuite, sans les mettre devant : une seule définition de semaine (A5), record MMR lu dans les données (A6), découpage de `app.js` sans bundler (A8), défaut `bc=false` (U6), liste blanche de la mise à jour (U5), journaux et fichier poison dans la file (U7), filtre de chemins Pages (R4), `check_data.py` avant chaque commit de robot (R5), libellés `bcpm` / `overfill` (Z5).

Les créneaux 18:00, 01:00, mercredi et dimanche 00:00 (Paris) ne bougent pas. Le rang Rocket League reste saisi à la main. Aucun `.replay` ne doit être ajouté au dépôt pour faire passer les tests golden : ils restent sur la machine de build, derrière `RL_TEST_DIR`.
