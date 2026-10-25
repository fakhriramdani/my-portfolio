#!/usr/bin/env bash
# Publish the code-only tree to the public mirror (remote `public`).
# Docs, design, qa and .team never leave this private repo.
# Usage: scripts/publish-public.sh ["commit message"]
set -euo pipefail
cd "$(dirname "$0")/.."

PUBLIC_URL=$(git config --get remote.public.url)
[ -n "$PUBLIC_URL" ] || { echo "no remote 'public' configured"; exit 1; }

EXCLUDE='^(docs|qa|design|\.team)/'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/tree"

git ls-files | grep -Ev "$EXCLUDE" > "$TMP/list"
echo "publishing $(wc -l < "$TMP/list") files"
rsync -a --files-from="$TMP/list" . "$TMP/tree/"

cd "$TMP/tree"
git init -q -b main
git add -A
git -c user.name="Fakhri Ramdani" -c user.email="fakhriramdani1@gmail.com" \
  commit -q -m "${1:-chore: sync public mirror from my-portfolio-dev}"
git remote add origin "$PUBLIC_URL"
git push -q --force origin main
echo "published to $PUBLIC_URL ($(git rev-parse --short HEAD))"
