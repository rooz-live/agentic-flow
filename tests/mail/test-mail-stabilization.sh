#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export MAIL_STAB_SKIP_REMOTE=1
bash "$ROOT/scripts/mail/mail-stabilization-score.sh" >/dev/null
python3 - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
d = json.loads((Path(sys.argv[1]) / ".goalie/evidence/mail/stabilization_latest.json").read_text())
assert d["schema"] == "mail.stabilization.v1"
print("PASS mail_stabilization")
PY
