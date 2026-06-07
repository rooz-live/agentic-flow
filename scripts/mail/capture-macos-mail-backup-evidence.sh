#!/usr/bin/env bash
# Wave D evidence — wraps macos incremental backup without duplicating DoD gates.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/macos_backup_${RUN_ID}.json"
SCRIPT="$REPO_ROOT/scripts/mail/macos-incremental-mail-backup.sh"
SKIP="${MAIL_MACOS_BACKUP_SKIP:-1}"

if [[ "$SKIP" == "1" ]]; then
  ec=0
  note="MAIL_MACOS_BACKUP_SKIP=1 — dry evidence only"
  last_sync=""
else
  note="live rsync"
  bash "$SCRIPT" && ec=0 || ec=$?
  last_sync="$(find "${MAIL_BACKUP_DEST:-/Volumes/External/mail-backup}" -name '.last-sync' -print -quit 2>/dev/null || true)"
fi

python3 - "$OUT" "$RUN_ID" "$ec" "$note" "$last_sync" <<'PY'
import json, sys, time
from pathlib import Path
out, run_id, ec, note, last_sync = sys.argv[1:6]
doc = {
    "schema": "mail.wave_d.macos_backup.v1",
    "run_id": run_id,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "backup_script_exit": int(ec),
    "last_sync_path": last_sync or None,
    "note": note,
    "roam_touch": "R-MAIL-04",
    "exit_code": int(ec),
}
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
(Path(out).parent / "macos_backup_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"macos_backup_evidence ec={ec}")
sys.exit(int(ec))
PY
