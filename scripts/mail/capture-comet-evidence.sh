#!/usr/bin/env bash
# Capture Wave C Comet job evidence (FA: run on WHM or via SSH when keys available).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/comet_job_${RUN_ID}.json"
SCOPE="$REPO_ROOT/deploy/mail/comet-mail-vault-scope.yaml"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"
JOB_ID="comet-mail-bhopti-primary"

COMET_STATUS="unknown"
COMET_DETAIL=""
if ssh -o BatchMode=yes -o ConnectTimeout=15 cpanel-whm \
  "test -d /home/bhopti/mail && du -sh /home/bhopti/mail" 2>/dev/null; then
  COMET_STATUS="ssh_ok_source_present"
  COMET_DETAIL="cPanel maildir reachable; verify Comet job history in WHM UI"
else
  COMET_STATUS="ssh_blocked"
  COMET_DETAIL="root@cpanel-whm permission denied — FA must confirm Comet job in WHM UI"
fi

python3 - "$OUT" "$RUN_ID" "$HEAD_SHA" "$JOB_ID" "$COMET_STATUS" "$COMET_DETAIL" "$SCOPE" <<'PY'
import json, sys, time
from pathlib import Path
out, run_id, head, job_id, status, detail, scope = sys.argv[1:8]
scope_ok = Path(scope).is_file()
verified = status == "ssh_ok_source_present"
doc = {
    "schema": "mail.wave_c.comet.v1",
    "run_id": run_id,
    "head_sha": head,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "job_id": job_id,
    "scope_yaml": scope,
    "scope_committed": scope_ok,
    "comet_probe": status,
    "detail": detail,
    "schedule": "0 3 * * *",
    "paths": ["/home/bhopti/mail"],
    "no_folder_prune": True,
    "roam_touch": "R-MAIL-01",
    "exit_code": 0 if verified else 2,
}
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
print(f"wrote {out} comet_probe={status}")
sys.exit(0 if verified else 2)
PY
