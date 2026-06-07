#!/usr/bin/env bash
# Apply mail-roam-audit recommendations to ROAM_TRACKER_COG.yaml (evidence-driven).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
AUDIT="$REPO_ROOT/.goalie/evidence/mail/roam_audit_latest.json"
ROAM="$REPO_ROOT/.goalie/ROAM_TRACKER_COG.yaml"
[[ -f "$AUDIT" ]] || { echo "FAIL: run mail-roam-audit.sh first"; exit 1; }
python3 - "$ROAM" "$AUDIT" <<'PY'
import json, sys, time, yaml
from pathlib import Path
roam_path, audit_path = Path(sys.argv[1]), Path(sys.argv[2])
audit = json.loads(audit_path.read_text())
recs = audit.get("recommendations") or {}
if not recs:
    print("mail_roam_sync: no recommendations")
    sys.exit(0)
data = yaml.safe_load(roam_path.read_text())
ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
changed = []
for row in data.get("risks", []):
    rid = row.get("id")
    if rid not in recs:
        continue
    text = recs[rid]
    new_status, reason = text.split(" — ", 1) if " — " in text else (text, text)
    new_status = new_status.strip()
    if row.get("status") == new_status and reason in str(row.get("last_result", "")):
        continue
    row["status"] = new_status
    row["last_verified"] = ts
    row["last_result"] = f"mail-roam-sync: {reason}"
    changed.append(rid)
if not changed:
    print("mail_roam_sync: already synced")
    sys.exit(0)
roam_path.write_text(yaml.dump(data, sort_keys=False, default_flow_style=False, allow_unicode=True))
print(f"mail_roam_sync: updated {', '.join(changed)}")
PY
