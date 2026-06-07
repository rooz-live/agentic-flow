#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export MAIL_IMAP_SKIP_REMOTE=1
bash "$ROOT/scripts/mail/mail-imap-source-probe.sh" >/dev/null
python3 - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
d = json.loads((Path(sys.argv[1]) / ".goalie/evidence/mail/imap_source_latest.json").read_text())
assert d["schema"] == "mail.imap_source_probe.v1"
print("PASS mail_imap_source_probe")
PY
