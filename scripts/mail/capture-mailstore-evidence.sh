#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/mailstore_${RUN_ID}.json"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"

REMOTE="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$STX_SSH_HOST" bash -s <<'REMOTE' || true
curl -sf --connect-timeout 5 http://127.0.0.1:8081/ >/dev/null && echo port_ok
sudo docker inspect mailstore-server --format '{{.Config.Cmd}}' 2>/dev/null
sudo docker logs mailstore-server 2>&1 | grep -E 'noop|Ingestion|Connection test' | tail -1
REMOTE
)"
PORT_OK=0; MOCK=0; IMAP_HANDSHAKE=0
echo "$REMOTE" | grep -q port_ok && PORT_OK=1
echo "$REMOTE" | grep -q mock_server && MOCK=1
echo "$REMOTE" | grep -q 'Connection test and PROXY handshake successful' && IMAP_HANDSHAKE=1

python3 - "$OUT" "$RUN_ID" "$HEAD_SHA" "$PORT_OK" "$MOCK" "$IMAP_HANDSHAKE" <<'PY'
import json, sys, time
out, run_id, head, port, mock, handshake = sys.argv[1:7]
port, mock, handshake = int(port), int(mock), int(handshake)
# MDOD-A3: real MailStore ingest job — mock only does noop handshake
ingest = False
detail = "mock_server noop-only" if mock else "unknown_image"
if not mock and port and handshake:
    ingest = True
    detail = "real_mailstore_ingest"
elif mock and handshake:
    detail = "CVT: mock HTML claims ingest; only IMAP noop verified — MDOD-A3 unmet"
doc = {
    "schema": "mail.wave_a.mailstore.v1",
    "run_id": run_id,
    "head_sha": head,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "port_8081": bool(port),
    "is_mock_server": bool(mock),
    "imap_handshake_ok": bool(handshake),
    "imap_ingest_verified": ingest,
    "detail": detail,
    "exclude_domains": ["rooz.live"],
    "roam_touch": "R13",
    "exit_code": 0 if port else 1,
}
open(out, "w").write(json.dumps(doc, indent=2) + "\n")
print(f"wrote {out} port_8081={bool(port)} imap_ingest_verified={ingest}")
sys.exit(0 if port else 1)
PY
