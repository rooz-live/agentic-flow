#!/usr/bin/env bash
# PI plan evidence snapshot (WSJF runs in tick_post_hooks before upstream unless skipped).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

if [[ "${SKIP_WSJF:-0}" != "1" ]]; then
  python3 "$ROOT/scripts/cicd/update_lnnnl.py" 2>/dev/null || true
fi

python3 - <<'PY'
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(".")
out = root / ".goalie/evidence/pi_plan_sync_latest.json"
out.parent.mkdir(parents=True, exist_ok=True)

payload = {
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "schema": "pi_plan_sync.v1",
    "loop_item": __import__("os").environ.get("LOOP_ITEM", ""),
    "tick_exit": int(__import__("os").environ.get("TICK_EXIT", "0")),
}

lnnnl = root / ".goalie/LNNNL.yaml"
if lnnnl.is_file():
    import yaml
    payload["lnnnl_schedule"] = (yaml.safe_load(lnnnl.read_text()) or {}).get("schedule", {})

for name in ("inbox_zero_latest.json", "agentic_time_latest.json", "timescape_correlation_latest.json"):
    p = root / ".goalie/evidence" / name
    if p.is_file():
        payload[name.replace(".json", "")] = json.loads(p.read_text(encoding="utf-8"))

fqdn = root / "config/fqdn_registry.yaml"
if fqdn.is_file():
    import yaml
    doc = yaml.safe_load(fqdn.read_text(encoding="utf-8")) or {}
    payload["pi_plan"] = doc.get("pi_plan", {})

out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out}")
PY
