#!/usr/bin/env bash
# Publication sûre des données par les robots (top 15 n°1-2, audit 28 nov. 2026).
# Variables :
#   MSG    message du commit (obligatoire)
#   ADD    chemins à ajouter (git add -A), séparés par des espaces (obligatoire)
#   REGEN  commande relancée à CHAQUE essai, sur la dernière version de main (intégration d'issue…). Ensuite, toujours :
#          merge_rl_local.py + split_rl_index.py + build_home.py (idempotents), et ces fichiers dérivés sont ajoutés.
#   KEEP   1 = conserver les fichiers déjà modifiés par ce job avant le premier essai (relevés Valorant/Steam : on ne
#          rappelle pas les API) ; ils sont recopiés sur la dernière version de main avant REGEN. Défaut 0.
# À chaque essai : fetch + reset sur origin/main, (fichiers conservés), REGEN, check_data.py (refus = pas de push),
# commit, push. Après un push, on vérifie que le commit est bien sur origin/main.
# Sortie : status=pushed|nochange|failed dans $GITHUB_OUTPUT ; code 1 si rien n'a pu être publié (la page Actions passe au rouge).
set -uo pipefail
: "${MSG:?MSG manquant}" "${ADD:?ADD manquant}"
REGEN="${REGEN:-}"; KEEP="${KEEP:-0}"; TRIES="${TRIES:-5}"
OUT="${GITHUB_OUTPUT:-/dev/null}"
DERIVED="home.json build.json ballchasing_app.json ballchasing_analysis.json rl_local/summary.json rl_local/deep.json"
TMP="$(mktemp -d)"
git config user.name >/dev/null || git config user.name "gaming-tracker-bot"
git config user.email >/dev/null || git config user.email "actions@users.noreply.github.com"
if [ "$KEEP" = 1 ]; then
  # fichiers modifiés ou nouveaux dans ADD, hors fichiers dérivés (régénérés par REGEN)
  for p in $ADD; do [ -e "$p" ] && git add -A -- "$p"; done
  git diff --cached --name-only --diff-filter=ACMR -- $ADD > "$TMP/keep.lst"
  git reset -q
  for d in $DERIVED; do sed -i "\#^${d}\$#d" "$TMP/keep.lst"; done
  while IFS= read -r f; do mkdir -p "$TMP/keep/$(dirname "$f")"; cp -p "$f" "$TMP/keep/$f"; done < "$TMP/keep.lst"
  echo "fichiers conservés : $(wc -l < "$TMP/keep.lst")"
fi
status=failed
for i in $(seq 1 "$TRIES"); do
  git fetch -q origin main && git reset -q --hard origin/main || { sleep 5; continue; }
  if [ "$KEEP" = 1 ]; then (cd "$TMP/keep" && find . -type f -print0 | xargs -0 -r cp -p --parents -t "$OLDPWD"); fi
  if [ -n "$REGEN" ]; then bash -c "$REGEN" || { echo "::error::REGEN a échoué (essai $i)"; status=failed; break; }; fi
  # dérivés toujours recalculés sur la version publiée (un envoi du PC a pu arriver entre-temps) : idempotent
  python3 tools/merge_rl_local.py >/dev/null && python3 tools/split_rl_index.py >/dev/null && python3 tools/build_home.py >/dev/null \
    || { echo "::error::régénération des fichiers dérivés impossible"; status=failed; break; }
  if ! python3 tools/check_data.py; then echo "::error::check_data.py refuse les données : rien n'est publié"; status=failed; break; fi
  paths=(); for p in $ADD ballchasing_latest.json $DERIVED; do
    if [ -e "$p" ] || git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then paths+=("$p"); fi; done
  git add -A -- "${paths[@]}" || { echo "::error::git add a échoué"; status=failed; break; }
  if git diff --cached --quiet; then status=nochange; break; fi
  git commit -qm "$MSG"
  if git push -q origin HEAD:main; then
    sha=$(git rev-parse HEAD)
    if git fetch -q origin main && git merge-base --is-ancestor "$sha" origin/main; then status=pushed; break; fi
    echo "::warning::push annoncé mais commit absent de origin/main (essai $i)"
  fi
  echo "push refusé (essai $i/$TRIES), nouvel essai sur la dernière version de main"
  sleep "${PUSH_SLEEP:-$((RANDOM % 8 + 3 + 2*i))}"
done
rm -rf "$TMP"
echo "status=$status" >> "$OUT"
echo "publication : $status"
[ "$status" = failed ] && { echo "::error::Données NON publiées sur main"; exit 1; }
exit 0
