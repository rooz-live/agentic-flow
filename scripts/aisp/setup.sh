#!/usr/bin/env bash
set -euo pipefail
REPO_URL="https://github.com/bar181/aisp-open-core"
DEST="tools/aisp-open-core"
if [[ -d "$DEST/.git" ]]; then
  echo "AISP open core already present at $DEST";
  exit 0;
fi
mkdir -p tools
if command -v git >/dev/null 2>&1; then
  echo "Cloning AISP open core..."
  git clone --depth=1 "$REPO_URL" "$DEST"
  echo "✓ Cloned to $DEST"
else
  echo "git not available. Please install git to clone $REPO_URL" >&2
  exit 1
fi
