# Validation de l'analyseur local contre ballchasing

Comparaison sur **124 replays ranked réels** de 443Blood (3v3/2v2/1v1, oct. 2026), chaque replay analysé
par `rl-analyzer` (Rust, boxcars 0.13, images réseau à 30 Hz) puis comparé aux statistiques que ballchasing
renvoie pour le même match. Les replays ne sont jamais publiés : seuls ces chiffres le sont.

Colonnes : n = replays comparés, moyennes ballchasing / locale, biais = locale − ballchasing, MAE = erreur absolue
moyenne par replay, corr = corrélation, « exact » = nombre de replays où la valeur est identique.

| métrique | n | moy. ballchasing | moy. locale | biais | MAE | MAE % | corr | exact |
|---|---|---|---|---|---|---|---|---|
| `goals` | 124 | 1.06 | 1.06 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `assists` | 124 | 0.48 | 0.48 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `saves` | 124 | 0.58 | 0.58 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `shots` | 124 | 2.15 | 2.15 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `score` | 124 | 296.94 | 296.94 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `clears` | 124 | 1.62 | 1.62 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `centers` | 124 | 4.11 | 4.11 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `aerial_hits` | 124 | 0.58 | 0.58 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `first_touches` | 124 | 1.91 | 1.91 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `shots_against` | 124 | 5.23 | 5.23 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `goals_against` | 124 | 2.70 | 2.70 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |
| `avg_boost` | 124 | 50.40 | 49.58 | -0.82 | 3.50 | 7.0 % | 0.692 | 0 |
| `pct_zero_boost_real` | 124 | 13.30 | 14.87 | 1.57 | 1.69 | 12.7 % | 0.933 | 0 |
| `pct_full_boost_real` | 124 | 12.16 | 9.50 | -2.66 | 2.70 | 22.2 % | 0.976 | 0 |
| `pct_zero_boost` | 124 | 13.30 | 14.71 | 1.41 | 1.56 | 11.7 % | 0.936 | 0 |
| `pct_full_boost` | 124 | 12.16 | 12.15 | -0.01 | 0.63 | 5.2 % | 0.988 | 0 |
| `bpm` | 124 | 366.36 | 361.68 | -4.69 | 13.57 | 3.7 % | 0.932 | 1 |
| `bcpm` | 124 | 368.42 | 366.60 | -1.82 | 3.17 | 0.9 % | 0.996 | 0 |
| `small_pads` | 124 | 50.62 | 49.79 | -0.83 | 0.86 | 1.7 % | 0.997 | 58 |
| `big_pads` | 124 | 15.68 | 16.11 | 0.44 | 0.56 | 3.6 % | 0.974 | 79 |
| `stolen_small` | 124 | 16.84 | 16.75 | -0.09 | 0.28 | 1.7 % | 0.995 | 94 |
| `stolen_big` | 124 | 3.34 | 3.43 | 0.09 | 0.14 | 4.1 % | 0.966 | 111 |
| `collected` | 124 | 1966.52 | 1961.01 | -5.52 | 9.42 | 0.5 % | 1.000 | 7 |
| `overfill` | 124 | 117.56 | 256.94 | 139.39 | 140.52 | 119.5 % | 0.683 | 0 |
| `used_supersonic` | 124 | 577.97 | 421.03 | -156.94 | 163.95 | 28.4 % | 0.858 | 0 |
| `avg_speed` | 124 | 1542.63 | 1543.80 | 1.17 | 2.83 | 0.2 % | 0.999 | 11 |
| `pct_supersonic` | 124 | 16.01 | 16.00 | -0.01 | 0.06 | 0.4 % | 1.000 | 0 |
| `pct_boost_speed` | 124 | 40.08 | 39.97 | -0.11 | 0.13 | 0.3 % | 0.999 | 0 |
| `pct_slow` | 124 | 43.91 | 44.03 | 0.12 | 0.13 | 0.3 % | 1.000 | 0 |
| `pct_ground` | 124 | 59.66 | 59.55 | -0.11 | 0.14 | 0.2 % | 0.999 | 0 |
| `pct_low_air` | 124 | 38.11 | 38.28 | 0.16 | 0.18 | 0.5 % | 0.999 | 0 |
| `pct_high_air` | 124 | 2.23 | 2.17 | -0.06 | 0.06 | 2.7 % | 0.999 | 1 |
| `powerslides` | 124 | 16.87 | 16.93 | 0.06 | 0.38 | 2.2 % | 0.994 | 81 |
| `powerslide_s` | 124 | 4.91 | 5.05 | 0.14 | 0.15 | 3.0 % | 0.999 | 8 |
| `distance` | 124 | 484232.09 | 484194.31 | -37.78 | 49.19 | 0.0 % | 1.000 | 4 |
| `pct_def_third` | 124 | 46.70 | 46.87 | 0.17 | 0.17 | 0.4 % | 1.000 | 0 |
| `pct_neu_third` | 124 | 28.98 | 28.82 | -0.17 | 0.17 | 0.6 % | 0.999 | 0 |
| `pct_off_third` | 124 | 24.32 | 24.32 | -0.00 | 0.05 | 0.2 % | 1.000 | 0 |
| `pct_def_half` | 124 | 61.99 | 62.08 | 0.09 | 0.09 | 0.1 % | 1.000 | 0 |
| `pct_behind_ball` | 124 | 71.71 | 71.74 | 0.04 | 0.09 | 0.1 % | 1.000 | 0 |
| `pct_most_back` | 124 | 42.15 | 42.10 | -0.05 | 1.57 | 3.7 % | 0.983 | 0 |
| `pct_most_forward` | 124 | 43.45 | 44.62 | 1.17 | 1.58 | 3.6 % | 0.991 | 0 |
| `pct_closest_ball` | 124 | 40.14 | 41.43 | 1.29 | 1.63 | 4.1 % | 0.992 | 0 |
| `pct_farthest_ball` | 124 | 45.28 | 45.05 | -0.23 | 1.64 | 3.6 % | 0.980 | 0 |
| `dist_ball` | 124 | 2793.54 | 2874.85 | 81.31 | 81.57 | 2.9 % | 0.994 | 0 |
| `dist_mates` | 123 | 3304.53 | 3236.02 | -68.51 | 77.15 | 2.3 % | 0.969 | 0 |
| `goals_against_last_def` | 78 | 1.90 | 1.85 | -0.05 | 0.13 | 6.8 % | 0.938 | 68 |
| `demos` | 124 | 1.06 | 1.08 | 0.02 | 0.02 | 1.5 % | 0.994 | 122 |
| `demos_taken` | 124 | 0.42 | 0.42 | 0.00 | 0.00 | 0.0 % | 1.000 | 124 |

## Lecture

* **Identique à 100 %** : buts, passes décisives, arrêts, tirs, score, dégagements, centres, têtes (aerial hits),
  premières touches, tirs/buts contre. Ces compteurs viennent des compteurs de score du jeu lui‑même.
* **Quasi identique (écart moyen ≤ 0,2 point)** : tiers et moitiés de terrain, derrière la balle, % supersonique,
  % vitesse boost, % lent, % sol / air bas / air haut, distance parcourue, démolitions données (122/124 exactes) et subies (124/124).
* **Très proche** : boost ramassé (petits/gros/volés), `bcpm`, powerslides (nombre et durée), `bpm` (3,7 %).
* **Rôle d'équipe** (le plus en arrière, le plus avancé, le plus proche/loin de la balle) : ≈ 1,6 point d'écart, léger biais
  (+1,2), probablement lié aux égalités de position entre coéquipiers (non vérifié).

## Différences connues (et pourquoi)

| métrique | écart | explication |
|---|---|---|
| `avg_boost` | corrélation 0,69, MAE 3,5 | La valeur locale est le **boost physique** de la voiture (celui qu'on voit à l'écran). ballchasing semble moyenner une autre grandeur (corrélée mais pas identique, hypothèse). La valeur « boost tenu » est aussi fournie (`avg_boost_held`). |
| `pct_zero_boost` | +1,4 point | Même famille de causes (grandeur de boost différente, hypothèse). Corrélation 0,94. |
| `overfill` (boost gaspillé) | 257 local vs 118 bc | La formule de ballchasing n'a pas pu être reproduite à partir du replay. La valeur locale suit une définition physique (boost perdu à cause du plafond de 100) ; l'app ne compare donc pas ces deux valeurs. |
| `used_supersonic` | 421 local vs 578 bc | Local = boost réellement consommé quand la voiture est ≥ 2200 uu/s (définition physique) ; ballchasing arrive à une valeur plus grande, méthode non reproductible. |
| `dist_ball` | +81 uu | Distance moyenne à la balle : biais constant d'environ +81 uu (corrélation 0,99), origine exacte non identifiée. |
| `avg_speed` | 1543,8 vs 1542,6 (MAE 2,8) | Écart minime (0,2 %), non critique. |

## Seuils ajustés sur les données

Sol : z ≤ 20 uu ; air haut : z > 850 uu ; lent : < 1410 uu/s ; supersonique : ≥ 2200 uu/s ; powerslide : frein à main au sol
(z ≤ 25), un enchaînement continu compte pour un seul powerslide ; réaction au coup d'envoi : temps pour atteindre 500 uu/s.

## Reproductibilité

L'analyse est **déterministe** (testée : 124 replays × 5 exécutions, empreintes identiques ; un cas d'ordre de hachage a été
corrigé pendant la validation). `cargo test --release` couvre les codes d'erreur, les invariants (tiers ≈ 100 %, air ≈ 100 %,
tirs détaillés = compteur de tirs, aucune clé `name`), le déterminisme, des valeurs de référence (empreinte SHA‑256 du replay),
l'effet du décalage horaire, la fusion d'index.
