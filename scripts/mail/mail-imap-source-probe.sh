#!/usr/bin/env bash
# Probe live IMAP SoT on cPanel (192.168.122.237:993). Evidence-only; never mutates maildirs.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/mail/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/imap_source_${RUN_ID}.json"
LATEST="$OUT_DIR/imap_source_latest.json"
SKIP="${MAIL_IMAP_SKIP_REMOTE:-0}"
HOST="${IMAP_SOURCE_HOST:-192.168.122.237}"
PORT="${IMAP_SOURCE_PORT:-993}"

if [[ "$SKIP" == "1" ]]; then
  python3 - "$OUT" "$LATEST" "$HOST" "$PORT" <<'PY'
import json, sys, time
from pathlib import Path
out, latest, host, port = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], int(sys.argv[4])
doc = {
    "schema": "mail.imap_source_probe.v1",
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "host": host,
    "port": port,
    "reachable": None,
    "note": "MAIL_IMAP_SKIP_REMOTE=1",
    "exclude_domains": ["rooz.live"],
    "exit_code": 0,
}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print("imap_source_probe=skipped")
PY
  exit 0
fi

REMOTE="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "${STX_SSH_HOST:-stx}" bash -s "$HOST" "$PORT" <<'REMOTE' || true
H="$1"; P="$2"
if timeout 8 bash -c "echo | openssl s_client -connect ${H}:${P} -servername ${H} 2>/dev/null | grep -q 'BEGIN CERTIFICATE'"; then
  echo imap_ssl_ok
fi
REMOTE
)"

OK=0
echo "$REMOTE" | grep -q imap_ssl_ok && OK=1

python3 - "$OUT" "$LATEST" "$HOST" "$PORT" "$OK" <<'PY'
import json, sys, time
from pathlib import Path
out, latest, host, port, ok = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
doc = {
    "schema": "mail.imap_source_probe.v1",
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "host": host,
    "port": port,
    "reachable": bool(ok),
    "exclude_domains": ["rooz.live"],
    "source_of_truth": "cPanel Dovecot",
    "exit_code": 0 if ok else 2,
}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"imap_source_reachable={bool(ok)}")
sys.exit(0 if ok else 2)
PY
