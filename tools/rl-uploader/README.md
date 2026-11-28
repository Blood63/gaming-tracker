# RL Replay Uploader v2 (Windows)

Analyse **sur ton PC** chaque replay Rocket League que tu sauvegardes, calcule tes stats (carte de chaleur, coups d'envoi, tirs, buts,
aériens, boost, vitesse, rotations, démolitions, possession, évolution dans le match…) et les envoie à ton app GameTrack
(dépôt GitHub `Blood63/gaming-tracker`). **Le replay lui‑même n'est jamais envoyé** par la nouvelle voie, et les noms des autres joueurs
ne sont jamais écrits dans les stats.

L'envoi des replays bruts vers ballchasing.com est **coupé par défaut** (v2.0.3) : le fichier `.replay` contient les pseudos des autres
joueurs et ballchasing les republie. Pour le remettre : `-BallchasingOn` (la clé est demandée et vérifiée avant d'activer) ; `-BallchasingOff` le coupe.

Rien à installer à part ce dossier : PowerShell + `curl.exe` (déjà dans Windows 10/11) et `rl-analyzer.exe` (fourni, compilé depuis `tools/rl-analyzer`).

## Installation (une seule fois, ~3 minutes)

1. Télécharge le zip `rl-replay-uploader.zip` (dans ce dossier du dépôt), clic droit › **Propriétés** › coche **Débloquer** si elle existe › OK, puis **Extraire tout…**
2. **Crée ton jeton GitHub** (voir plus bas, 1 minute) et garde‑le sous la main.
3. Double‑clique sur **`1-Installer.bat`**. Il demande :
   - (rien pour ballchasing : l'envoi est coupé par défaut) ;
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
| `3-Reessayer-les-analyses.bat` | Efface les échecs d'analyse (pas `analyzed.log`) et remet dans la file les fiches écartées : nouvel essai au passage suivant (v2.0.3) |
| `4-Changer-le-jeton-GitHub.bat` | Nouveau jeton GitHub |
| `5-Tester-un-replay.bat` | Analyse un replay sans rien envoyer |
| `6-Voir-letat.bat` | Dossiers surveillés, file d'attente, fiches écartées, échecs d'analyse, derniers envois |
| `7-Mettre-a-jour.bat` | Télécharge la dernière version (SHA‑256 vérifié), sauvegarde l’ancienne, et relance l’uploader — **manuel**, jamais automatique |
| `8-Desinstaller.bat` | Retire le démarrage automatique et arrête l'uploader |

## Fiabilité

- **Pas de doublon** : un replay déjà analysé/envoyé n'est jamais renvoyé (journaux `analyzed.log`, `pushed.log`, `uploaded.log`), l'index distant est fusionné sans jamais écraser une entrée existante.
- **Hors ligne** : si Internet ou GitHub est indisponible, les analyses restent en file d'attente (`queue\`) et partent à la reconnexion, avec attente progressive (jusqu'à 15 min).
- **Conflit d'écriture** (le robot de l'app écrit en même temps) : relecture et nouvel essai automatiques.
- **Jeton refusé / expiré** : l'analyse continue, l'envoi est suspendu, un message te dit de lancer `4-Changer-le-jeton-GitHub.bat`.
- **Jeton bientôt expiré** (v2.0.2) : la date d'expiration renvoyée par GitHub est vérifiée au démarrage puis chaque jour ; 14 jours avant, une notification et une ligne du journal te préviennent (une fois par jour). `6-Voir-letat.bat` affiche la date.
- **Changement de jeton** (v2.0.2) : l'uploader déjà lancé en arrière‑plan est relancé tout seul avec le nouveau jeton.
- **Lancement caché sans jeton lisible** (v2.0.2) : au lieu d'attendre une saisie invisible, l'uploader s'arrête avec une notification qui indique le fichier `.bat` à lancer.
- **Index distant illisible** : par sécurité, rien n'est écrasé.
- **Une seule instance** à la fois. Après un arrêt brutal (veille, mise à jour Windows, processus tué), le verrou « abandonné » est repris
  et la surveillance continue, avec une ligne dans le journal (v2.0.3 ; avant, l'uploader s'arrêtait sans rien dire).
- **Échec d'analyse** (v2.0.3) : définitif seulement si le replay lui‑même est illisible ou trop court. Sinon (joueur introuvable,
  fichier encore pris, analyseur en cours de remplacement…) : 3 essais espacés (5 puis 20 min), puis abandon jusqu'à
  `3-Reessayer-les-analyses.bat` ou une nouvelle version de l'analyseur.
- **Fiche refusée par GitHub** (v2.0.3) : après 5 refus, elle est écartée dans `queue\failed` et la file continue derrière elle.
- **Fichier prêt** (v2.0.3) : taille stable sur deux lectures puis ouverture en lecture partagée (OneDrive n'empêche plus l'analyse) ;
  plus d'attente de 3 s par fichier pendant la surveillance.
- **Journaux** : au‑delà de 1 Mo, seules les 5 000 dernières lignes sont gardées ; les dossiers temporaires de plus de 7 jours sont supprimés.
- **Mise à jour** (`7-Mettre-a-jour.bat`) : seuls les fichiers de l'outil (liste fixe) peuvent être remplacés, dans ce dossier,
  et chacun doit avoir l'empreinte SHA‑256 de `latest.json`.
- Journal : `%APPDATA%\rl-replay-uploader\activity.log`.

## Réglages facultatifs (`%APPDATA%\rl-replay-uploader\config.json`)

- `"demos"` : un dossier de replays de plus (ou une liste), par ex. `"D:\\Replays"` si tu as changé le dossier dans le jeu.
  OneDrive personnel et professionnel (`OneDriveCommercial`) sont déjà surveillés.
- `"epic"` : un id Epic ou une liste (`["id1", "id2"]`) si un second compte Epic joue sur ce Windows (tous écrivent dans le même `DemosEpic`).

## Analyseur 0.2.0 (avec l'uploader 2.0.3)

- Prolongations détectées (`overtime`) ; carte de chaleur sur le jeu actif seulement (plus le compte à rebours des coups d'envoi) ;
  « bot » seulement pour un vrai bot (un joueur Steam sans compte Epic n'est plus pris pour un bot) ; refus (nouvel essai) si les
  compteurs du jeu sont illisibles après un patch.
- L'entrée d'index ne contient plus que l'en‑tête et les stats : `index.json` reste léger, les détails sont dans chaque fiche.
- Les replays déjà envoyés **ne sont pas réanalysés** : leurs stats chiffrées sont identiques avec 0.2.0 ; seules la carte de chaleur
  et le drapeau de prolongation changeraient, ce qui ne justifie pas de republier ~500 fiches.

## Confidentialité

- Les stats publiées ne contiennent que **tes** valeurs, les rôles (« coéquipier », « adversaire ») et des identifiants de match. Aucun nom d'autre joueur.
- Les fichiers `.replay` restent sur ton PC (sauf si tu réactives l'envoi ballchasing avec `-BallchasingOn`).
