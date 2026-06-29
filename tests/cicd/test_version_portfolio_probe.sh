#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
[[ -f config/versions/portfolio.yaml ]] || { echo "FAIL missing portfolio.yaml"; exit 1; }
AF_SKIP_NETWORK=1 python3 scripts/cicd/version_portfolio_probe.py --dry-run --json > /tmp/vp_probe.json
python3 - <<'PY'
import json
from pathlib import Path
doc = json.loads(Path("/tmp/vp_probe.json").read_text())
assert doc.get("schema") == "version_portfolio.v1"
assert len(doc.get("packages", [])) >= 3
for p in doc["packages"]:
    assert p.get("id") and p.get("pinned"), p
assert "blockers_active" in doc
print("PASS version_portfolio_probe contract")
PY
