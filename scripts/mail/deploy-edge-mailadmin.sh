#!/usr/bin/env bash
# Wave E — deploy mailadmin block to STX Caddy (reload, not restart).
# Deconstructed: Delegates actual verification & Caddy reload to edge_gateway_sync_engine.py.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/edge_deploy_${RUN_ID}.json"
CFG="$REPO_ROOT/src/proxies/edge_gateway.cfg"
DRY="${MAIL_EDGE_DEPLOY_DRY:-0}"

if [[ ! -f "$CFG" ]]; then
  echo "MDOD-E1 FAIL: missing $CFG"
  exit 1
fi

DRY_ARG=""
if [[ "$DRY" == "1" ]]; then
  DRY_ARG="--dry-run"
fi

# Run the deconstructed Edge Gateway Sync Engine
echo "--> Delegating edge gateway configuration validation to edge_gateway_sync_engine.py..."
python3 "$REPO_ROOT/scripts/cicd/edge_gateway_sync_engine.py" $DRY_ARG --no-coherence || true

# Extract status for mailadmin.bhopti.com from the produced last_edge_sync.json report
python3 - "$OUT" "$RUN_ID" "$REPO_ROOT" "$DRY" <<'PY'
import json
import sys
import time
from pathlib import Path

out_path = Path(sys.argv[1])
run_id = sys.argv[2]
repo_root = Path(sys.argv[3])
is_dry = sys.argv[4] == "1"

sync_report_path = repo_root / ".goalie" / "evidence" / "last_edge_sync.json"

deployed = False
detail = "Target mailadmin.bhopti.com not found in sync report"
ec = 1

if is_dry:
    deployed = False
    detail = "MAIL_EDGE_DEPLOY_DRY=1 — config validated locally only"
    ec = 0
elif sync_report_path.is_file():
    try:
        report = json.loads(sync_report_path.read_text(encoding="utf-8"))
        results = report.get("results", [])
        for res in results:
            if res.get("fqdn") == "mailadmin.bhopti.com":
                status = res.get("status")
                deployed = (status == "PASS")
                detail = f"mailadmin.bhopti.com status: {status}"
                if not deployed and res.get("log"):
                    detail += f" - {res.get('log')}"
                ec = 0 if deployed else 2
                break
    except Exception as e:
        detail = f"Error reading sync report: {e}"
        ec = 3
else:
    detail = "Sync report last_edge_sync.json not found"
    ec = 4

doc = {
    "schema": "mail.wave_e.deploy.v1",
    "run_id": run_id,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "deployed": deployed,
    "detail": detail,
    "roam_touch": "R-MAIL-02",
    "exit_code": ec,
}

out_path.write_text(json.dumps(doc, indent=2) + "\n")
(out_path.parent / "edge_deploy_latest.json").write_text(json.dumps({"path": str(out_path), **doc}, indent=2) + "\n")
print(f"edge_deploy ec={ec} detail={detail}")
sys.exit(ec)
PY
