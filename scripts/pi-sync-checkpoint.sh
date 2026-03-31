#!/usr/bin/env bash
# pi-sync-checkpoint.sh - Generate PI-sync checkpoint from AISP/ROAM/WSJF outputs
# T3: Wire PI-sync artifacts into repeatable script-generated checkpoints
# Usage: ./scripts/pi-sync-checkpoint.sh [--output PATH]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="${1:-}"
[[ "$OUTPUT" == "--output" ]] && OUTPUT="$2" || OUTPUT=""
OUTPUT="${OUTPUT:-$PROJECT_ROOT/reports/pi-sync-checkpoint.json}"

REPORTS="$PROJECT_ROOT/reports"
ROAM="$PROJECT_ROOT/ROAM_TRACKER.yaml"

mkdir -p "$(dirname "$OUTPUT")"

# Gather AISP statuses and ceremony metrics
AISP_GOV="${AISP_STATUS_PATH:-$REPORTS/aisp-status.json}"
AISP_ADV="$REPORTS/aisp-advocate-status.json"
AISP_TUN="$REPORTS/aisp-tunnel-status.json"
CEREMONY_METRICS="$REPORTS/ceremony-metrics.json"

# Build checkpoint JSON (contract: scripts emit; pi-sync aggregates; dashboards consume)
python3 - "$OUTPUT" "$AISP_GOV" "$AISP_ADV" "$AISP_TUN" "$ROAM" "$CEREMONY_METRICS" <<'PY'
import json
import sys
from pathlib import Path

out_path = Path(sys.argv[1])
aisp_gov = Path(sys.argv[2])
aisp_adv = Path(sys.argv[3])
aisp_tun = Path(sys.argv[4])
roam = Path(sys.argv[5])
ceremony = Path(sys.argv[6])

def load_json(p):
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            return None
    return None

def roam_summary(p):
    if not p.exists():
        return {"present": False, "last_updated": None}
    text = p.read_text(encoding="utf-8", errors="ignore")
    last = None
    for line in text.splitlines():
        if line.strip().startswith("last_updated:"):
            last = line.split(":", 1)[1].strip().strip('"\'')
            break
    return {"present": True, "last_updated": last}

gov = load_json(aisp_gov)
adv = load_json(aisp_adv)
tun = load_json(aisp_tun)
roam_info = roam_summary(roam)
ceremony_data = load_json(ceremony)

checkpoint = {
    "version": "1.0",
    "generated_by": "scripts/pi-sync-checkpoint.sh",
    "sources": {
        "governance": gov.get("aisp_header", {}) if gov else {},
        "advocate": adv.get("aisp_header", {}) if adv else {},
        "tunnel": tun.get("aisp_header", {}) if tun else {},
        "roam": roam_info,
        "ceremony_metrics": ceremony_data if ceremony_data else {}
    },
    "summary": {
        "governance_ready": bool(gov and gov.get("body", {}).get("circles") and gov["body"]["circles"][0].get("status") == "ready") if gov else False,
        "tunnel_ready": bool(tun and tun.get("intro", {}).get("learn", "").find("healthy") >= 0) if tun else False,
        "roam_fresh": roam_info.get("present", False),
        "ceremony_%/#": ceremony_data.get("summary", {}).get("%/#", {}) if ceremony_data else {},
        "ceremony_%.#": ceremony_data.get("summary", {}).get("%.#", {}) if ceremony_data else {},
        "ceremony_exit_10_12_21_160": ceremony_data.get("rolling_failure_counter", {}) if ceremony_data else {}
    }
}

out_path.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")
print(f"PI-sync checkpoint written to {out_path}")
PY

echo "✅ PI-sync checkpoint: $OUTPUT"
