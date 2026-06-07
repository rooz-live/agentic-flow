#!/usr/bin/env bash
# Capture Wave A MailStore evidence on STX (or via SSH).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/mailstore_${RUN_ID}.json"
STX="${STX_HOST:-ubuntu@stx-aio-0.corp.interface.tag.ooo}"
STX_KEY="${STX_KEY:-$HOME/.ssh/starlingx_key}"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"

probe_local() {
  curl -sf --connect-timeout 5 http://127.0.0.1:8081/ >/dev/null 2>&1
}

probe_remote() {
  ssh -p 2222 -o BatchMode=yes -o ConnectTimeout=15 -i "$STX_KEY" "$STX" \
    'curl -sf --connect-timeout 5 http://127.0.0.1:8081/ >/dev/null && sudo docker inspect mailstore-server --format "{{.State.Health.Status}}" 2>/dev/null'
}

if probe_local 2>/dev/null; then
  HEALTH="$(sudo docker inspect mailstore-server --format '{{.State.Health.Status}}' 2>/dev/null || echo running)"
  HOST="local"
elif HEALTH="$(probe_remote 2>/dev/null)"; then
  HOST="stx"
else
  HEALTH="unreachable"
  HOST="none"
fi

python3 - "$OUT" "$RUN_ID" "$HEAD_SHA" "$HOST" "$HEALTH" <<'PY'
import json, sys, time
out, run_id, head, host, health = sys.argv[1:6]
local_ok = health in ("healthy", "running")
doc = {
    "schema": "mail.wave_a.mailstore.v1",
    "run_id": run_id,
    "head_sha": head,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "host": host,
    "port_8081": local_ok,
    "container_health": health,
    "imap_source": "192.168.122.237:993",
    "exclude_domains": ["rooz.live"],
    "imap_ingest_verified": False,
    "roam_touch": "R13",
    "exit_code": 0 if local_ok else 1,
}
open(out, "w").write(json.dumps(doc, indent=2) + "\n")
print(f"wrote {out} port_8081={local_ok}")
sys.exit(0 if local_ok else 1)
PY
