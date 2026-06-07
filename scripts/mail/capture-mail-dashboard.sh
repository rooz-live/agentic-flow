#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/dashboard_${RUN_ID}.json"
LATEST="$OUT_DIR/dashboard_latest.json"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"
python3 - "$REPO_ROOT" "$OUT" "$LATEST" "$RUN_ID" "$HEAD_SHA" <<'PY'
import json, sys, time
from pathlib import Path
root, out, latest, run_id, head = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5]
ev = root / ".goalie/evidence/mail"
def ln(n):
    p = ev / n
    return json.loads(p.read_text()) if p.is_file() else None
def lg(pat):
    fs = sorted(ev.glob(pat), key=lambda p: p.stat().st_mtime)
    return json.loads(fs[-1].read_text()) if fs else None
comet = ln("comet_vault_latest.json") or lg("comet_job_*.json")
ms = lg("mailstore_*.json"); we = ln("wave_e_latest.json") or lg("wave_e_*.json")
stab = ln("stabilization_latest.json") or lg("stabilization_*.json")
mac = ln("macos_backup_latest.json") or lg("macos_backup_*.json")
pok = comet and (comet.get("primary_verified") or comet.get("comet_probe") == "job_success")
doc = {"schema": "mail.dashboard.v1", "run_id": run_id, "head_sha": head,
  "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "comet_primary_ok": bool(pok), "comet_secondary_configured": comet.get("secondary_configured") if comet else False,
  "comet_jobs": comet.get("jobs") if comet else None, "mailstore_8081": ms.get("port_8081") if ms else None,
  "imap_ingest_verified": ms.get("imap_ingest_verified") if ms else None, "is_mock_server": ms.get("is_mock_server") if ms else None,
  "wave_e_https_ok": we.get("https_ok") if we else None, "stabilization": stab.get("current_estimate") if stab else None,
  "macos_backup_ok": mac.get("backup_ok") if mac else None, "next_fa_spike": []}
if doc.get("is_mock_server"): doc["next_fa_spike"].append("MailStore prod + IMAP profile MDOD-A3")
if not doc.get("comet_secondary_configured"): doc["next_fa_spike"].append("Comet comet-mail-all-accounts weekly")
if not doc.get("macos_backup_ok"): doc["next_fa_spike"].append("Wave D MAIL_BACKUP_DEST")
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
Path(latest).write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"mail_dashboard={out} next_fa={len(doc['next_fa_spike'])}")
PY
