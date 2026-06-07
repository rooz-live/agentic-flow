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
sudo docker inspect mailstore-server --format '{{.Config.Image}}' 2>/dev/null
sudo docker logs mailstore-server 2>&1 | grep -E 'noop|Ingestion complete|Connection test' | tail -1
sudo docker exec mailstore-server cat /data/ingest_state.json 2>/dev/null || true
REMOTE
)"
PORT_OK=0; MOCK=0; PROD=0; HANDSHAKE=0; INGEST_OK=0; STATE_JSON=""
echo "$REMOTE" | grep -q port_ok && PORT_OK=1
echo "$REMOTE" | grep -q mock_server && MOCK=1
echo "$REMOTE" | grep -qiE 'mailstore' && ! echo "$REMOTE" | grep -q mock_server && PROD=1
echo "$REMOTE" | grep -qE 'Connection test and PROXY handshake successful|Ingestion complete' && HANDSHAKE=1
echo "$REMOTE" | grep -q 'Ingestion complete' && INGEST_OK=1
STATE_JSON="$(echo "$REMOTE" | awk '/^\{/{flag=1} flag{print}' | tail -1)"

python3 - "$OUT" "$RUN_ID" "$HEAD_SHA" "$PORT_OK" "$MOCK" "$PROD" "$HANDSHAKE" "$INGEST_OK" "$STATE_JSON" <<'PY'
import json, sys, time
out, run_id, head, port, mock, prod, handshake, ingest_ok, state_raw = sys.argv[1:10]
port, mock, prod = int(port), int(mock), int(prod)
handshake, ingest_ok = int(handshake), int(ingest_ok)
state = {}
if state_raw.strip().startswith("{"):
    try:
        state = json.loads(state_raw)
    except json.JSONDecodeError:
        state = {}
verified = bool(ingest_ok) or bool(state.get("verified"))
if verified:
    detail = state.get("detail") or "real_mailstore_ingest"
elif mock and handshake:
    detail = "CVT: mock noop only — MDOD-A3 unmet"
elif mock:
    detail = "mock_server :8081 without handshake"
elif prod and port:
    detail = "prod image up; ingest profile pending FA"
else:
    detail = "port_or_ingest_missing"
doc = {
    "schema": "mail.wave_a.mailstore.v1",
    "run_id": run_id,
    "head_sha": head,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "port_8081": bool(port),
    "is_mock_server": bool(mock),
    "is_prod_image": bool(prod),
    "imap_handshake_ok": bool(handshake),
    "imap_ingest_verified": verified,
    "ingest_state": state or None,
    "detail": detail,
    "exclude_domains": ["rooz.live"],
    "roam_touch": "R13",
    "exit_code": 0 if port else 1,
}
open(out, "w").write(json.dumps(doc, indent=2) + "\n")
print(f"wrote {out} port_8081={bool(port)} imap_ingest_verified={verified}")
sys.exit(0 if port else 1)
PY
