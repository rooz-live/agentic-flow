#!/usr/bin/env bash
# MDOD-A3: honest ingest verification — mock noop does NOT pass.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
export MAIL_IMAP_SKIP_REMOTE="${MAIL_IMAP_SKIP_REMOTE:-0}"
bash "$REPO_ROOT/scripts/mail/mail-imap-source-probe.sh" || true
bash "$REPO_ROOT/scripts/mail/capture-mailstore-evidence.sh" || true
python3 - "$REPO_ROOT" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
ev = root / ".goalie/evidence/mail"
ms_files = sorted(ev.glob("mailstore_*.json"))
if not ms_files:
    print("MDOD-A3 FAIL: no mailstore evidence")
    sys.exit(1)
ms = json.loads(ms_files[-1].read_text())
ingest = ms.get("imap_ingest_verified") is True
port = ms.get("port_8081") is True
mock = ms.get("is_mock_server") is True
print(f"MDOD-A3 port_8081={port} mock={mock} imap_ingest_verified={ingest} detail={ms.get('detail')}")
if ingest:
    sys.exit(0)
if port and mock:
    print("MDOD-A3: mock_server — IMAP noop only; FA must configure real MailStore job")
    sys.exit(2)
sys.exit(1)
PY
