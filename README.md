# Gaming Tracker
Suivi de mes stats Steam, Valorant, Rocket League + COD Mobile (saisie dans l'app). Dashboard : GitHub Pages.

## Relevés automatiques (heure de Paris)
- **Valorant** (HenrikDev) et **Rocket League** (replays ballchasing) : tous les jours à **18:00** et **01:00**.
- **Steam** (temps de jeu, succès, boutique) : **mercredi** et **dimanche** à **00:00**.
- tracker.gg n'est plus interrogé (clé refusée) ; les anciens fichiers `history/valorant.jsonl` et `history/rocket_league.jsonl` sont conservés tels quels.

## Chargement
- `home.json` : résumé compact généré par les robots (`tools/build_home.py`) pour afficher l'accueil vite ; les fichiers détaillés sont chargés à la demande, page par page.
- `build.json` : empreinte des données, utilisée comme clé de cache (`?v=`).

## Synchronisation depuis l'app
- Avec un jeton GitHub à grain fin (dépôt `Blood63/gaming-tracker` seulement, *Contents : Read and write*), saisi dans **Profil › Synchronisation GitHub** et stocké uniquement sur l'appareil : un seul bouton « Synchroniser » (workflow `app-sync.yml`, mêmes scripts d'intégration que les issues).
- Sans jeton : demandes GitHub pré-remplies (workflows `objectif`, `cod-partie`, `cod-rank`, `cod-profil`).

## Tests
- `node --test tests/*.test.js` : fonctions de calcul de `core.js` (sans navigateur).
- `python3 -m unittest discover -s tests -p "test_*.py"` : scripts des robots (relevés, intégrations, fusion des replays, créneaux).
- `python3 tools/check_data.py` : contrôle des données publiées (JSON lisibles, doublons, historiques triés, vie privée, aucun jeton).
- `cd tools/rl-analyzer && cargo test` : analyseur de replays (Rust).
- GitHub Actions (`tests.yml`) lance les trois premiers à chaque modification du code, et chaque lundi pour vérifier les données.

## Vie privée
- Le dépôt et le site sont publics : aucun nom réel, aucun identifiant COD (UID), aucun jeton.
- Les pseudos des autres joueurs ne sont jamais publiés : retirés du tableau des scores Valorant par `tools/fetch_valorant.py`
  (l'appli affiche « Allié 1 », « Adversaire 2 »…) et masqués (mosaïque) sur les anciennes captures COD.
- Les fichiers de replay ne sont jamais publiés : seules les analyses (chiffres, sans noms) arrivent dans `rl_local/`.

## Sécurité
- Jeton GitHub : uniquement dans le navigateur de l'appareil (localStorage), jamais exporté ni affiché ; envoyé seulement à `api.github.com`.
- `index.html` déclare une politique de sécurité (CSP) : l'appli ne peut contacter que le site lui-même, `api.github.com` et le CDN
  (Chart.js, moteur OCR) : protection supplémentaire qui empêche les requêtes de l'appli vers tout autre serveur.
