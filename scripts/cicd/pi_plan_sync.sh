#!/usr/bin/env bash
# PI plan evidence snapshot (WSJF runs in tick_post_hooks before upstream unless skipped).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

if [[ "${SKIP_WSJF:-0}" != "1" ]]; then
  set +e
  python3 "$ROOT/scripts/cicd/update_lnnnl.py"
  _LNNNL_RC=$?
  set -e
  if [[ "$_LNNNL_RC" -eq 2 ]] && [[ "${AF_LNNNL_STALE_ENFORCE:-1}" == "1" ]]; then
    echo "BLOCK: LNNNL stale (update_lnnnl exit 2)" >&2
    exit 2
  fi
fi

python3 - <<'PY'
import json
import os
import subprocess as _sp
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(".")
out = root / ".goalie/evidence/pi_plan_sync_latest.json"
exit_path = root / ".goalie/evidence/ruflo_upgrade_exit_latest.json"
out.parent.mkdir(parents=True, exist_ok=True)

payload = {
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "schema": "pi_plan_sync.v1",
    "loop_item": os.environ.get("LOOP_ITEM", ""),
    "tick_exit": int(os.environ.get("TICK_EXIT", "0")),
}

lnnnl = root / ".goalie/LNNNL.yaml"
if lnnnl.is_file():
    import yaml
    ldoc = yaml.safe_load(lnnnl.read_text()) or {}
    payload["lnnnl_schedule"] = ldoc.get("schedule", {})
    payload["lnnnl_lanes"] = ldoc.get("lanes", {})

for name in (
    "inbox_zero_latest.json", "agentic_time_latest.json", "timescape_correlation_latest.json",
    "ruflo_doctor_latest.json", "intel_pipeline_latest.json", "wsjf_ruflo_latest.json",
):
    p = root / ".goalie/evidence" / name
    if p.is_file():
        payload[name.replace(".json", "")] = json.loads(p.read_text(encoding="utf-8"))

fqdn = root / "config/fqdn_registry.yaml"
if fqdn.is_file():
    import yaml
    doc = yaml.safe_load(fqdn.read_text()) or {}
    payload["pi_plan"] = doc.get("pi_plan", {})

inbox = payload.get("inbox_zero_latest") or {}
payload["inbox_zero_pct"] = inbox.get("fa_free_closure_composite_pct") or inbox.get("composite_pct")
payload["inbox_zero_open"] = inbox.get("open_count")
doctor = payload.get("ruflo_doctor_latest") or {}
payload["ruflo_blockers"] = len(doctor.get("blockers") or [])
payload["inbox_zero_gate"] = doctor.get("inbox_zero_gate", payload.get("inbox_zero_pct", 0) == 100)

_staged = _sp.run(["git", "diff", "--cached", "--quiet"], cwd=str(root), check=False).returncode != 0
_lanes = payload.get("lnnnl_lanes") or {}
_now = _lanes.get("now") or []
_current = _now[0] if isinstance(_now, list) and _now else {}
payload["lnnnl_committable_hint"] = bool(_staged and _current)
payload["lnnnl_head_unit"] = _current.get("id") if isinstance(_current, dict) else None

out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
exit_path.write_text(json.dumps({
    "schema": "ruflo_upgrade_exit.v1",
    "timestamp": payload["timestamp"],
    "inbox_zero_gate": payload.get("inbox_zero_gate"),
    "inbox_zero_pct": payload.get("inbox_zero_pct"),
    "ruflo_blockers": payload.get("ruflo_blockers"),
    "head_wsjf": (payload.get("wsjf_ruflo_latest") or {}).get("head_item", {}).get("id"),
    "lnnnl_committable_hint": payload.get("lnnnl_committable_hint"),
    "lnnnl_head_unit": payload.get("lnnnl_head_unit"),
}, indent=2) + "\n", encoding="utf-8")

require_committable = os.environ.get("AF_PI_SYNC_REQUIRE_COMMITTABLE", "0") == "1"
if require_committable and not payload.get("lnnnl_committable_hint"):
    print("BLOCK: LNNNL head not committable (no staged unit)", file=sys.stderr)
    raise SystemExit(1)

enforce = os.environ.get("AF_PI_SYNC_ENFORCE", "0") == "1"
if enforce:
    exit_art = root / ".goalie/evidence/exit_artifact_inbox_latest.json"
    if exit_art.is_file():
        ex = json.loads(exit_art.read_text(encoding="utf-8"))
        if ex.get("open_count", 0) > 0:
            print(f"BLOCK: exit artifacts open={ex.get('open_count')}", file=sys.stderr)
            raise SystemExit(1)
    if payload.get("ruflo_blockers", 0) > 0:
        print(f"BLOCK: ruflo_blockers={payload.get('ruflo_blockers')}", file=sys.stderr)
        raise SystemExit(1)
print(f"wrote {out} and {exit_path}")
PY
