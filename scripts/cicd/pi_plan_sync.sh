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
    ldoc = yaml.safe_load(lnnnl.read_text()) or {}
    payload["lnnnl_schedule"] = ldoc.get("schedule", {})
    payload["lnnnl_lanes"] = ldoc.get("lanes", {})

for name in ("inbox_zero_latest.json", "agentic_time_latest.json", "timescape_correlation_latest.json", "ruflo_doctor_latest.json", "intel_pipeline_latest.json", "wsjf_ruflo_latest.json"):
    p = root / ".goalie/evidence" / name
    if p.is_file():
        payload[name.replace(".json", "")] = json.loads(p.read_text(encoding="utf-8"))

fqdn = root / "config/fqdn_registry.yaml"
if fqdn.is_file():
    import yaml
    doc = yaml.safe_load(fqdn.read_text(encoding="utf-8")) or {}
    payload["pi_plan"] = doc.get("pi_plan", {})

exit_path = root / ".goalie/evidence/ruflo_upgrade_exit_latest.json"
inbox = payload.get("inbox_zero_latest") or {}
payload["inbox_zero_pct"] = inbox.get("fa_free_closure_composite_pct") or inbox.get("composite_pct")
payload["inbox_zero_open"] = inbox.get("open_count")
doctor = payload.get("ruflo_doctor_latest") or {}
payload["ruflo_blockers"] = len(doctor.get("blockers") or [])
payload["inbox_zero_gate"] = doctor.get("inbox_zero_gate", payload.get("inbox_zero_pct", 0) == 100)
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
exit_path.write_text(json.dumps({
    "schema": "ruflo_upgrade_exit.v1",
    "timestamp": payload["timestamp"],
    "inbox_zero_gate": payload.get("inbox_zero_gate"),
    "inbox_zero_pct": payload.get("inbox_zero_pct"),
    "ruflo_blockers": payload.get("ruflo_blockers"),
    "head_wsjf": (payload.get("wsjf_ruflo_latest") or {}).get("head_item", {}).get("id"),
}, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out} and {exit_path}")
PY
