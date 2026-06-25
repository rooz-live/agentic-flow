#!/usr/bin/env bash
# Run OpenSpec validate when CLI is available; skip with exit 0 otherwise.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
RECEIPT="$REPO_ROOT/.goalie/evidence/openspec_check_receipt.json"
mkdir -p "$(dirname "$RECEIPT")"

if ! command -v npx >/dev/null 2>&1; then
  python3 - "$RECEIPT" <<'PY'
import json, sys
from datetime import datetime, timezone
path = sys.argv[1]
doc = {
    "schema": "cicd.openspec_check.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "skipped": True,
    "reason": "npx unavailable",
    "exit_code": 0,
}
open(path, "w", encoding="utf-8").write(json.dumps(doc, indent=2) + "\n")
print("openspec_check: skip (npx unavailable)")
PY
  exit 0
fi

set +e
OUT="$(cd "$REPO_ROOT" && npx --yes @fission-ai/openspec validate 2>&1)"
EC=$?
set -e

python3 - "$RECEIPT" "$EC" "$OUT" <<'PY'
import json, sys
from datetime import datetime, timezone
path, ec_s, out = sys.argv[1], sys.argv[2], sys.argv[3]
ec = int(ec_s)
doc = {
    "schema": "cicd.openspec_check.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "skipped": False,
    "exit_code": ec,
    "output_preview": out[:500],
}
open(path, "w", encoding="utf-8").write(json.dumps(doc, indent=2) + "\n")
print(f"openspec_check: exit {ec}")
PY

# Fail-open when openspec CLI not installed in environment.
if [[ $EC -eq 127 || "$OUT" == *"could not determine executable"* ]]; then
  exit 0
fi
exit "$EC"
