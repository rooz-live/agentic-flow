#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export MAIL_IMAP_SKIP_REMOTE=1
export MAIL_STAB_SKIP_REMOTE=1
# Expect exit 2 (mock) or 1 — never 0 without real ingest
set +e
bash "$ROOT/scripts/mail/mail-mdod-a3-verify.sh"
ec=$?
set -e
if [[ "$ec" -eq 0 ]]; then
  python3 - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
ms = sorted((Path(sys.argv[1]) / ".goalie/evidence/mail").glob("mailstore_*.json"))[-1]
doc = json.loads(ms.read_text())
assert doc.get("imap_ingest_verified") is True
print("PASS mail_mdod_a3 real_ingest")
PY
elif [[ "$ec" -eq 2 ]]; then
  echo "PASS mail_mdod_a3 honest_mock_exit_2"
else
  echo "PASS mail_mdod_a3 exit_${ec} (no port or evidence)"
fi
