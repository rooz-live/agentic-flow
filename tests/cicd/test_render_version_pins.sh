#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

TMP="$(mktemp)"
python3 scripts/cicd/render_version_pins.py --dry-run --sync-help --json > "$TMP"
python3 - "$TMP" "$ROOT" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
root = Path(sys.argv[2])
help_text = (root / "scripts/one-sh.d/help.sh").read_text()
assert doc.get("targets", {}).get("ruflo") == "3.15.0", doc.get("targets")
assert "Ruflo v3.15.0" in help_text, "help.sh must show Ruflo v3.15.0"
print("PASS render sync-help targets and help.sh aligned")
PY
rm -f "$TMP"

set +e
python3 scripts/cicd/render_version_pins.py --sync-help 2>/dev/null
RC=$?
set -e
[[ "$RC" -ne 0 ]] || { echo "FAIL expected exit non-zero without VERSION_PIN_APPLY"; exit 1; }
echo "PASS render blocks apply without VERSION_PIN_APPLY"

echo "PASS test_render_version_pins.sh"
