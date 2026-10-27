# RL Replay Uploader v2 (Windows)

Analyse **sur ton PC** chaque replay Rocket League que tu sauvegardes, calcule tes stats (carte de chaleur, coups d'envoi, tirs, buts,
aériens, boost, vitesse, rotations, démolitions, possession, évolution dans le match…) et les envoie à ton app GameTrack
(dépôt GitHub `Blood63/gaming-tracker`). **Le replay lui‑même n'est jamais envoyé** par la nouvelle voie, et les noms des autres joueurs
ne sont jamais écrits dans les stats.

Pendant la période de validation, l'envoi des replays vers ballchasing.com continue **en parallèle** comme avant (tu peux le couper avec
`-BallchasingOff` quand tu veux).

Rien à installer à part ce dossier : PowerShell + `curl.exe` (déjà dans Windows 10/11) et `rl-analyzer.exe` (fourni, compilé depuis `tools/rl-analyzer`).

## Installation (une seule fois, ~3 minutes)

1. Télécharge le zip `rl-replay-uploader.zip` (dans ce dossier du dépôt), clic droit › **Propriétés** › coche **Débloquer** si elle existe › OK, puis **Extraire tout…**
2. **Crée ton jeton GitHub** (voir plus bas, 1 minute) et garde‑le sous la main.
3. Double‑clique sur **`1-Installer.bat`**. Il demande :
   - la **clé API ballchasing** (https://ballchasing.com/upload › *API key*) — seulement si l'envoi ballchasing est actif ;
   - le **jeton GitHub** : colle‑le (la saisie est masquée). Il est testé puis enregistré **chiffré** (Windows DPAPI) dans `%APPDATA%\rl-replay-uploader\config.json` : seul ton compte Windows peut le lire. Il n'est jamais dans le dépôt.
4. L'uploader se copie dans `%LOCALAPPDATA%\rl-replay-uploader`, s'ajoute au démarrage de Windows (fenêtre cachée) et se lance.

Pour **tester sans rien envoyer** : double‑clique `5-Tester-un-replay.bat`, glisse un `.replay` dans la fenêtre, Entrée. Tu dois voir « Analyse réussie » avec un résumé du match.
Ou en PowerShell : `.\rl-replay-uploader.ps1 -TestFile "C:\chemin\match.replay"` ; `-DryRun` analyse tout sans rien envoyer ; `-Ping` vérifie l'analyseur, la clé ballchasing et le jeton GitHub.

## Créer le jeton GitHub (limité à ce seul dépôt)

1. https://github.com/settings/personal-access-tokens/new (connecté en tant que Blood63).
2. *Token name* : `rl-uploader`. *Expiration* : 1 an (tu pourras le renouveler avec `4-Changer-le-jeton-GitHub.bat`).
3. *Repository access* › **Only select repositories** › `gaming-tracker`.
4. *Permissions* › *Repository permissions* › **Contents : Read and write** (le reste en *No access*).
5. **Generate token**, copie la valeur (elle ne s'affiche qu'une fois).

Ce jeton ne donne accès qu'à ce dépôt. S'il fuite, révoque‑le sur la même page.

## Dans Rocket League : sauvegarder les replays

Rocket League n'a pas de sauvegarde automatique : à la fin du match, sur l'écran des scores, choisis **« Sauvegarder le replay »**.
Le fichier arrive dans `Documents\My Games\Rocket League\TAGame\DemosEpic` (Epic) ou `…\Demos` (Steam). L'uploader surveille les deux (et la variante OneDrive)
et analyse le replay dans les secondes qui suivent. Seuls les replays à partir du 1er octobre 2026 sont pris en compte.

## Fichiers

| Fichier | Rôle |
|---|---|
| `1-Installer.bat` | Installe, demande les clés, lance en arrière‑plan |
| `2-Lancer-maintenant.bat` | Traite les replays en attente dans une fenêtre visible, puis s'arrête |
| `3-Changer-la-cle-ballchasing.bat` | Nouvelle clé ballchasing |
| `4-Changer-le-jeton-GitHub.bat` | Nouveau jeton GitHub |
| `5-Tester-un-replay.bat` | Analyse un replay sans rien envoyer |
| `6-Voir-letat.bat` | File d'attente, derniers envois |
| `7-Mettre-a-jour.bat` | Télécharge la dernière version (SHA‑256 vérifié) — **manuel**, jamais automatique |
| `8-Desinstaller.bat` | Retire le démarrage automatique et arrête l'uploader |

## Fiabilité

- **Pas de doublon** : un replay déjà analysé/envoyé n'est jamais renvoyé (journaux `analyzed.log`, `pushed.log`, `uploaded.log`), l'index distant est fusionné sans jamais écraser une entrée existante.
- **Hors ligne** : si Internet ou GitHub est indisponible, les analyses restent en file d'attente (`queue\`) et partent à la reconnexion, avec attente progressive (jusqu'à 15 min).
- **Conflit d'écriture** (le robot de l'app écrit en même temps) : relecture et nouvel essai automatiques.
- **Jeton refusé / expiré** : l'analyse continue, l'envoi est suspendu, un message te dit de lancer `4-Changer-le-jeton-GitHub.bat`.
- **Index distant illisible** : par sécurité, rien n'est écrasé.
- **Une seule instance** à la fois.
- Journal : `%APPDATA%\rl-replay-uploader\activity.log`.

## Confidentialité

- Les stats publiées ne contiennent que **tes** valeurs, les rôles (« coéquipier », « adversaire ») et des identifiants de match. Aucun nom d'autre joueur.
- Les fichiers `.replay` restent sur ton PC (la voie ballchasing, inchangée, les envoie toujours à ballchasing tant qu'elle est active).
