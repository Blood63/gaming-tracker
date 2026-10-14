# RL Replay Uploader (Windows)

Envoie automatiquement tes replays Rocket League sur **ballchasing.com** (sans BakkesMod, donc compatible avec l'anti-triche d'Epic). Ensuite, l'app GameTrack les récupère deux fois par jour et affiche tes stats détaillées.

Rien à installer : il utilise PowerShell et `curl.exe`, déjà présents dans Windows 10/11.

## Installation (une seule fois)

1. Télécharge le dossier en zip, puis fais un clic droit sur le zip › **Propriétés** › coche **Débloquer** si la case existe › OK.
2. Fais un clic droit › **Extraire tout…** (par exemple dans `Documents\rl-uploader`).
3. Double-clique sur **`1-Installer.bat`**.
4. Colle ta **clé API ballchasing** quand elle est demandée. Pour la trouver : https://ballchasing.com/upload › connecte-toi › *API key*.
   - La clé est vérifiée, puis enregistrée **chiffrée** dans `%APPDATA%\rl-replay-uploader` : seul ton compte Windows peut la lire, et elle n'est jamais dans ce dépôt.
5. C'est fini. L'uploader tourne en arrière-plan, sans fenêtre, et redémarre avec Windows (raccourci dans `shell:startup`).
   - Au premier lancement, il envoie aussi tous les replays déjà présents.

À chaque replay envoyé, une notification Windows apparaît.

## Dans Rocket League : sauvegarder les replays

Rocket League n'a **pas d'option « sauvegarde automatique des replays »**. Il faut donc enregistrer chaque match :

- À la fin du match, sur l'écran des scores, choisis **« Sauvegarder le replay »** (Save Replay).
- Le fichier arrive dans `Documents\My Games\Rocket League\TAGame\Demos` (version Epic comme Steam). L'uploader l'envoie dans les secondes qui suivent.

Il surveille aussi la variante OneDrive (`OneDrive\Documents\My Games\…`) si tes Documents sont synchronisés.

## Autres fichiers

| Fichier | Rôle |
|---|---|
| `2-Lancer-maintenant.bat` | Lance l'uploader dans une fenêtre visible, pour voir ce qu'il fait |
| `3-Changer-la-cle.bat` | Saisir une nouvelle clé API, puis la vérifier |
| `4-Desinstaller.bat` | Retire le lancement au démarrage et arrête l'uploader |

## Bon à savoir

- **Doublons** : un replay déjà envoyé n'est jamais renvoyé. La liste est dans `%APPDATA%\rl-replay-uploader\uploaded.log`, et ballchasing répond « déjà présent » (409), ce qui compte aussi comme un succès.
- **Quota** : le compte ballchasing gratuit permet environ 10 envois par 24 h et 70 par semaine. Au-delà, l'uploader réessaie plus tard tout seul.
- **Visibilité** : les replays sont envoyés en *public* sur ballchasing.com. C'est nécessaire pour que l'app les retrouve.
- **Journal** : `%APPDATA%\rl-replay-uploader\activity.log`.
