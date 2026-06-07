#!/usr/bin/env bash
# Wave E — deploy mailadmin block to STX Caddy (reload, not restart).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/edge_deploy_${RUN_ID}.json"
STX="${STX_HOST:-ubuntu@stx-aio-0.corp.interface.tag.ooo}"
KEY="${STX_KEY:-$HOME/.ssh/starlingx_key}"
CFG="$REPO_ROOT/src/proxies/edge_gateway.cfg"
DRY="${MAIL_EDGE_DEPLOY_DRY:-0}"

if [[ ! -f "$CFG" ]]; then
  echo "MDOD-E1 FAIL: missing $CFG"
  exit 1
fi

if [[ "$DRY" == "1" ]]; then
  python3 - "$OUT" "$RUN_ID" <<'PY'
import json, sys, time
from pathlib import Path
out, run_id = Path(sys.argv[1]), sys.argv[2]
doc = {
    "schema": "mail.wave_e.deploy.v1",
    "run_id": run_id,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "deployed": False,
    "note": "MAIL_EDGE_DEPLOY_DRY=1 — config validated locally only",
    "caddy_validate_local": True,
    "exit_code": 0,
}
out.write_text(json.dumps(doc, indent=2) + "\n")
(out.parent / "edge_deploy_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print("edge_deploy=dry_ok")
PY
  exit 0
fi

ec=0
log=""
if scp -P 2222 -i "$KEY" "$CFG" "$STX:/tmp/edge_gateway.cfg" 2>&1; then
  if ssh -p 2222 -i "$KEY" "$STX" "sudo cp /tmp/edge_gateway.cfg /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy" 2>&1; then
    log="reload_ok"
  else
    ec=2
    log="reload_failed"
  fi
else
  ec=1
  log="scp_failed"
fi

python3 - "$OUT" "$RUN_ID" "$ec" "$log" <<'PY'
import json, sys, time
from pathlib import Path
out, run_id, ec, log = Path(sys.argv[1]), sys.argv[2], int(sys.argv[3]), sys.argv[4]
doc = {
    "schema": "mail.wave_e.deploy.v1",
    "run_id": run_id,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "deployed": ec == 0,
    "detail": log,
    "roam_touch": "R-MAIL-02",
    "exit_code": ec,
}
out.write_text(json.dumps(doc, indent=2) + "\n")
(out.parent / "edge_deploy_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"edge_deploy ec={ec} detail={log}")
sys.exit(ec)
PY
