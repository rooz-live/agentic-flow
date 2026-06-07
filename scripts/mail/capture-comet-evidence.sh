#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/comet_job_${RUN_ID}.json"
LATEST="$OUT_DIR/comet_vault_latest.json"
SCOPE="$REPO_ROOT/deploy/mail/comet-mail-vault-scope.yaml"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"
JOB_FILTER="${COMET_JOB_ID:-all}"
REMOTE_OUT="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$CPANEL_SSH_HOST" bash -s <<'REMOTE' || true
DB="/var/cpanel/comet/backup_jobs.db"
du -sh /home/bhopti/mail 2>/dev/null | awk '{print $1}'
sqlite3 "$DB" "SELECT name||'|'||status||'|'||coalesce(last_run_timestamp,'')||'|'||coalesce(uuid,'') FROM backup_jobs;" 2>/dev/null
sqlite3 "$DB" "SELECT COUNT(*) FROM destinations;" 2>/dev/null
REMOTE
)"
MAILDIR_SIZE="$(printf '%s
' "$REMOTE_OUT" | sed -n '1p')"
DEST_COUNT="$(printf '%s
' "$REMOTE_OUT" | sed -n '$p')"
JOB_LINES="$(printf '%s
' "$REMOTE_OUT" | sed -n '2,$p' | sed '$d')"
export OUT LATEST RUN_ID HEAD_SHA SCOPE MAILDIR_SIZE JOB_FILTER JOB_LINES DEST_COUNT
python3 <<'PY'
import json, os, sys, time, yaml
from pathlib import Path
out = Path(os.environ["OUT"]); latest = Path(os.environ["LATEST"])
scope = yaml.safe_load(Path(os.environ["SCOPE"]).read_text())
expected = {j["id"]: j for j in scope.get("jobs", [])}
remote = {}
for line in os.environ.get("JOB_LINES", "").strip().splitlines():
    parts = line.split("|")
    if len(parts) >= 2:
        ts = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None
        uuid = parts[3] if len(parts) > 3 else ""
        remote[parts[0]] = {"status": parts[1], "last_run_timestamp": ts, "uuid": uuid}
jobs = []; primary_ok = False
for jid, meta in expected.items():
    if os.environ.get("JOB_FILTER", "all") not in ("all", jid): continue
    st = remote.get(jid, {}).get("status") or "missing"
    dest_n = int(os.environ.get("DEST_COUNT") or "0")
    uuid = remote.get(jid, {}).get("uuid", "")
    uuid_ok = bool(uuid) and "1111-2222" not in uuid
    if st == "success" and dest_n > 0 and uuid_ok:
        probe = "vault_proven"
    elif st == "success":
        probe = "stub_db"
    elif st == "missing":
        probe = "job_missing"
    else:
        probe = f"job_{st}"
    if jid == "comet-mail-bhopti-primary" and probe == "vault_proven":
        primary_ok = True
    jobs.append({"job_id": jid, "schedule": meta.get("schedule"), "paths": meta.get("paths"),
        "job_status": st, "comet_probe": probe, "last_run_timestamp": remote.get(jid, {}).get("last_run_timestamp")})
doc = {"schema": "mail.wave_c.comet.v2", "run_id": os.environ["RUN_ID"], "head_sha": os.environ["HEAD_SHA"],
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "maildir_size": os.environ.get("MAILDIR_SIZE") or None,
    "jobs": jobs, "primary_verified": primary_ok,
    "secondary_configured": any(j["job_id"] == "comet-mail-all-accounts" and j["job_status"] != "missing" for j in jobs),
    "destinations_count": int(os.environ.get("DEST_COUNT") or "0"),
    "comet_probe": "vault_proven" if primary_ok else ("stub_db" if any(j.get("comet_probe")=="stub_db" for j in jobs) else "pending"),
    "fa_action": "WHM Comet Backup: vault destination + first real snapshot",
    "roam_touch": "R-MAIL-01", "exit_code": 0 if primary_ok else 2}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"wrote {out} primary_verified={primary_ok}")
for j in jobs: print(f"  {j['job_id']}: {j['comet_probe']}")
sys.exit(0 if primary_ok else 2)
PY
