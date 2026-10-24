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
`node --test tests/` (fonctions de calcul de `core.js`, sans navigateur) ; lancés par GitHub Actions à chaque push.
