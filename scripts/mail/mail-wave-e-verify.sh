#!/usr/bin/env bash
# Wave E DoD: mailadmin HTTPS 2xx + evidence (poll after DNSSEC).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/wave_e_${RUN_ID}.json"
URL="${MAILADMIN_URL:-https://mailadmin.bhopti.com/admin/}"
TRIES="${MAIL_WAVE_E_TRIES:-12}"
SLEEP="${MAIL_WAVE_E_SLEEP:-30}"

bash "$REPO_ROOT/scripts/mail/deploy-edge-mailadmin.sh" || true

ok=0
last=""
for i in $(seq 1 "$TRIES"); do
  last=$(curl -skI --connect-timeout 12 "$URL" 2>&1 | head -1 || true)
  if echo "$last" | grep -qE 'HTTP/[0-9.]+ [23]'; then ok=1; break; fi
  echo "wave_e_try=$i status=$last"
  [[ "$i" -lt "$TRIES" ]] && sleep "$SLEEP"
done

python3 - "$OUT" "$URL" "$ok" "$last" "$TRIES" <<'PY'
import json, sys, time
from pathlib import Path
out, url, ok, last, tries = sys.argv[1:6]
doc = {
    "schema": "mail.wave_e.verify.v1",
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "url": url,
    "https_ok": bool(int(ok)),
    "last_status_line": last.strip(),
    "tries": int(tries),
    "roam_touch": "R-MAIL-02",
    "exit_code": 0 if int(ok) else 2,
}
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
(Path(out).parent / "wave_e_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"wave_e_https_ok={bool(int(ok))}")
sys.exit(0 if int(ok) else 2)
PY
