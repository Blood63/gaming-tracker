# Gaming Tracker
Suivi de mes stats Steam, Valorant, Rocket League + COD Mobile (saisie dans l'app). Dashboard : GitHub Pages.

## Relevés automatiques (heure de Paris)
- **Valorant** (HenrikDev) et **Rocket League** (replays ballchasing) : tous les jours à **18:00** et **01:00**.
- **Steam** (temps de jeu, succès, boutique) : **mercredi** et **dimanche** à **00:00**.
- tracker.gg n'est plus interrogé (clé refusée) ; les anciens fichiers `history/valorant.jsonl` et `history/rocket_league.jsonl` sont conservés tels quels.

## Chargement
- `home.json` : résumé compact généré par les robots (`tools/build_home.py`) pour afficher l'accueil vite ; les fichiers détaillés sont chargés à la demande, page par page.
- `build.json` : empreinte globale des données (`v`) + empreinte de chaque fichier (`f`). L'appli demande `fichier?h=<empreinte>` :
  un fichier inchangé reste en cache (navigateur + service worker, servi sans attendre le réseau) quand un autre change.
- Démarrage rapide : un petit script en tête de `index.html` demande `build.json`, `home.json` et les gros fichiers de la page ouverte
  (Rocket League, Valorant) sans attendre `app.js` ; Chart.js est préchargé sur les pages à graphiques.
- Rocket League : l'appli lit des versions **dérivées** au format « tableau » (`tools/tabpack.py` : mêmes données, mêmes clés, ~2× plus petites) :
  `rl_local/summary.json` (index léger, depuis `rl_local/index.json`), `ballchasing_app.json` (depuis `ballchasing_latest.json`, sans les conseils
  par replay) et `ballchasing_analysis.json` (ces conseils, chargés seulement pour le détail d'un replay et le bilan). `rl_local/deep.json`
  (cartes de chaleur, tirs…) arrive après l'affichage. Les fichiers d'origine restent la source de vérité ; les dérivés sont régénérés par les
  robots (`split_rl_index.py`, `build_home.py`) et `check_data.py` échoue s'ils ne leur correspondent plus.

## Numéros de version (à respecter à chaque modification de l'appli)
- Tout changement de `app.js`, `core.js`, `app.css`, `cod-ocr.js` ou `sw.js` : **augmenter son `?v=` dans `index.html`** (balise *et* préchargement,
  même numéro), sinon les téléphones gardent l'ancienne version en cache.
- Toute donnée modifiée à la main : lancer `python3 tools/build_home.py` (régénère `home.json`, `build.json` et les fichiers dérivés).
  Les robots le font eux-mêmes.
- Vérifié automatiquement : `python3 tools/check_versions.py [commit de base]` (index.html cohérent ; fichier modifié depuis la base sans
  nouveau numéro = échec), lancé par `tests.yml` à chaque push du code ; `check_data.py` vérifie que `build.json` correspond aux fichiers.

## Synchronisation depuis l'app
- Avec un jeton GitHub à grain fin (dépôt `Blood63/gaming-tracker` seulement, *Contents : Read and write*), saisi dans **Profil › Synchronisation GitHub** et stocké uniquement sur l'appareil : un seul bouton « Synchroniser » (workflow `app-sync.yml`, mêmes scripts d'intégration que les issues).
- Sans jeton : demandes GitHub pré-remplies (workflows `objectif`, `cod-partie`, `cod-rank`, `cod-profil`).

## Tests
- `node --test tests/*.test.js` : fonctions de calcul de `core.js` (sans navigateur).
- `python3 -m unittest discover -s tests -p "test_*.py"` : scripts des robots (relevés, intégrations, fusion des replays, créneaux).
- `python3 tools/check_data.py` : contrôle des données publiées (JSON lisibles, doublons, historiques triés, vie privée : aucun pseudo tiers,
  aucune localisation, aucun jeton ; fichiers dérivés et `build.json` à jour).
- `python3 tools/check_versions.py HEAD~1` : contrat de versionnage (voir ci-dessus).
- `cd tools/rl-analyzer && cargo test` : analyseur de replays (Rust).
- GitHub Actions (`tests.yml`) lance les tests node/Python, `check_data.py` et `check_versions.py` à chaque modification du code, et chaque lundi pour vérifier les données.

## Vie privée
- Le dépôt et le site sont publics : aucun nom réel, aucun identifiant COD (UID), aucun jeton.
- Les pseudos des autres joueurs ne sont jamais publiés : retirés du tableau des scores Valorant par `tools/fetch_valorant.py`
  (l'appli affiche « Allié 1 », « Adversaire 2 »…) et masqués (mosaïque) sur les anciennes captures COD.
- La localisation du profil Steam (ville, région, pays) n'est pas relevée (`fetch_stats.py`) ; elle a été retirée des anciens relevés
  et `check_data.py` échoue si un champ `location` / `city` / `country`… réapparaît dans un fichier publié.
- Les fichiers de replay ne sont jamais publiés : seules les analyses (chiffres, sans noms) arrivent dans `rl_local/`.

## Sécurité
- Jeton GitHub : uniquement dans le navigateur de l'appareil (localStorage), jamais exporté ni affiché ; envoyé seulement à `api.github.com`.
- `index.html` déclare une politique de sécurité (CSP) : l'appli ne peut contacter que le site lui-même, `api.github.com` et le CDN
  (Chart.js, moteur OCR) : protection supplémentaire qui empêche les requêtes de l'appli vers tout autre serveur.
