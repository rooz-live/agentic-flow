#!/usr/bin/env bash
# index_slice_p1_scripts.sh — P1-INDEX-01: surgical index batch (max 40) under scripts/ + code/tooling/scripts/.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT"
export REPO_ROOT="$ROOT"
MAX="${INDEX_SLICE_MAX:-40}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

SPECS=(scripts/ code/tooling/scripts/)
TO_STAGE=()
for spec in "${SPECS[@]}"; do
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    [[ "$p" == *.md ]] && continue
    TO_STAGE+=("$p")
    [[ ${#TO_STAGE[@]} -ge $MAX ]] && break 2
  done < <(git ls-files --others --exclude-standard -- "$spec" 2>/dev/null || true)
done

MANIFEST="$ROOT/.goalie/evidence/learning/p1_index01_latest.json"
mkdir -p "$(dirname "$MANIFEST")"
python3 - "$MANIFEST" "${TO_STAGE[@]}" <<'PYIN'
import json, sys
from datetime import datetime, timezone
manifest, *paths = sys.argv[1:]
doc = {
    "schema": "learning.p1_index01.v1",
    "task": "P1-INDEX-01",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "paths_staged": paths,
    "count": len(paths),
}
open(manifest, "w").write(json.dumps(doc, indent=2) + "\n")
print(json.dumps(doc))
PYIN

if [[ ${#TO_STAGE[@]} -eq 0 ]]; then
  echo "P1-INDEX-01: no untracked files under scripts/ or code/tooling/scripts/ (slice complete)."
  exit 0
fi

echo "P1-INDEX-01: staging ${#TO_STAGE[@]} path(s):"
printf '  %s\n' "${TO_STAGE[@]}"
if [[ "$DRY" == "1" ]]; then
  echo "(dry-run — not staging)"
  exit 0
fi
git add "${TO_STAGE[@]}"
git diff --cached --stat | head -25
echo "Next: ./scripts/dod-gate.sh --perceive"
