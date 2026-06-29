#!/usr/bin/env bash
# Exec WSJF for Ruflo PI backlog → evidence (does not mutate LNNNL without update_lnnnl).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
python3 - "$ROOT" <<'PY'
import json
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    raise SystemExit("pyyaml required")

root = Path(__import__("sys").argv[1])
backlog = root / "config/cicd/ruflo_pi_backlog.yaml"
out = root / ".goalie/evidence/wsjf_ruflo_latest.json"
out.parent.mkdir(parents=True, exist_ok=True)
doc = yaml.safe_load(backlog.read_text(encoding="utf-8")) if backlog.is_file() else {}
items = sorted(doc.get("items") or [], key=lambda x: -float(x.get("wsjf", 0)))
head = items[0] if items else {}
payload = {
    "schema": "wsjf_ruflo.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "pi_iteration": doc.get("pi_iteration"),
    "head_item": head,
    "ranked": items,
    "ceremony_tie_in": doc.get("ceremony_tie_in"),
}
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out} head={head.get('id', 'none')}")
PY
