#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/comet_job_${RUN_ID}.json"
SCOPE="$REPO_ROOT/deploy/mail/comet-mail-vault-scope.yaml"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"
JOB_ID="comet-mail-bhopti-primary"

REMOTE_OUT="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$CPANEL_SSH_HOST" bash -s <<'REMOTE' || true
DB="/var/cpanel/comet/backup_jobs.db"
du -sh /home/bhopti/mail 2>/dev/null | awk '{print $1}'
sqlite3 "$DB" "SELECT status||'|'||coalesce(last_run_timestamp,'') FROM backup_jobs WHERE name='comet-mail-bhopti-primary' LIMIT 1;" 2>/dev/null
REMOTE
)"
MAILDIR_SIZE="$(echo "$REMOTE_OUT" | sed -n '1p')"
JOB_STATUS="$(echo "$REMOTE_OUT" | sed -n '2p' | cut -d'|' -f1)"
LAST_RUN="$(echo "$REMOTE_OUT" | sed -n '2p' | cut -d'|' -f2)"

if [[ "$JOB_STATUS" == "success" ]]; then
  COMET_STATUS="job_success"; COMET_DETAIL="status=success maildir=${MAILDIR_SIZE}"
elif [[ -n "$MAILDIR_SIZE" ]]; then
  COMET_STATUS="ssh_ok_job_pending"; COMET_DETAIL="maildir=${MAILDIR_SIZE} status=${JOB_STATUS:-missing}"
else
  COMET_STATUS="ssh_blocked"; COMET_DETAIL="cpanel SSH failed"
fi

python3 - "$OUT" "$RUN_ID" "$HEAD_SHA" "$JOB_ID" "$COMET_STATUS" "$COMET_DETAIL" "$SCOPE" "$JOB_STATUS" "$LAST_RUN" "$MAILDIR_SIZE" <<'PY'
import json, sys, time
from pathlib import Path
out, run_id, head, job_id, status, detail, scope, job_status, last_run, maildir = sys.argv[1:11]
verified = status == "job_success"
doc = {"schema": "mail.wave_c.comet.v1", "run_id": run_id, "head_sha": head,
       "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
       "job_id": job_id, "comet_probe": status, "job_status": job_status or None,
       "last_run_timestamp": int(last_run) if last_run and last_run.isdigit() else None,
       "maildir_size": maildir or None, "detail": detail, "roam_touch": "R-MAIL-01",
       "exit_code": 0 if verified else 2}
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
print(f"wrote {out} comet_probe={status}")
sys.exit(0 if verified else 2)
PY
