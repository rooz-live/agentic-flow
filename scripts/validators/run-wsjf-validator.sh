#!/usr/bin/env bash
set -u

NODE_BIN="/Users/shahroozbhopti/.nvm/versions/node/v20.19.5/bin/node"
ENTRYPOINT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validators/dist/wsjf-roam-escalator.js"
MAX_ATTEMPTS=5
SLEEP_SECONDS=2
EVENTS_LOG="${HOME}/Library/Logs/wsjf-events.jsonl"

# T3: Pre-flight checks — prevent EAGAIN cascades under disk pressure
MIN_FREE_GB=${MIN_FREE_GB:-5}

_emit_event() {
  local action="$1" status="$2" severity="$3" evidence="$4"
  local ts; ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
  printf '{"timestamp":"%s","component":"run-wsjf-validator","mode":"preflight","action":"%s","target":"wsjf-validator","status":"%s","severity":"%s","evidence_path":"%s"}\n' \
    "$ts" "$action" "$status" "$severity" "$evidence" >> "$EVENTS_LOG" 2>/dev/null || true
}

# Check node binary exists
if [[ ! -x "$NODE_BIN" ]]; then
  echo "[validator-launcher] ERROR: node binary not found at $NODE_BIN" >&2
  _emit_event "preflight" "FAIL" "ERROR" "node_missing=$NODE_BIN"
  exit 1
fi

# Check entrypoint exists
if [[ ! -f "$ENTRYPOINT" ]]; then
  echo "[validator-launcher] ERROR: entrypoint not found at $ENTRYPOINT" >&2
  _emit_event "preflight" "FAIL" "ERROR" "entrypoint_missing=$ENTRYPOINT"
  exit 1
fi

# Check available disk space (APFS df reports in 512-byte blocks)
free_kb=$(df -k / 2>/dev/null | awk 'NR==2 {print $4}')
free_gb=0
if [[ -n "$free_kb" ]]; then
  free_gb=$((free_kb / 1048576))
fi

if [[ "$free_gb" -lt "$MIN_FREE_GB" ]]; then
  echo "[validator-launcher] WARN: low disk space (${free_gb}G free < ${MIN_FREE_GB}G threshold)" >&2
  echo "[validator-launcher] EAGAIN risk elevated — proceeding with increased retry delay" >&2
  _emit_event "preflight-disk" "WARN" "WARN" "free_gb=$free_gb,threshold=$MIN_FREE_GB"
  SLEEP_SECONDS=5  # longer backoff under disk pressure
fi

# The escalator uses chokidar (persistent watcher, never exits).
# Wrap in timeout so it scans the initial file set then exits cleanly.
# This prevents StartInterval from accumulating zombie watchers.
SCAN_TIMEOUT=${SCAN_TIMEOUT:-300}

attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  err_file="$(mktemp)"
  timeout "$SCAN_TIMEOUT" "$NODE_BIN" "$ENTRYPOINT" 2>"$err_file"
  status=$?
  # 124 = timeout reached (expected for persistent watcher — initial scan completed)
  if [[ "$status" -eq 0 ]] || [[ "$status" -eq 124 ]]; then
    rm -f "$err_file"
    _emit_event "scan" "PASS" "INFO" "exit=$status,attempt=$attempt,timeout=$SCAN_TIMEOUT"
    echo "[validator-launcher] scan completed (exit=$status, attempt=$attempt)" >&2
    exit 0
  fi

  if grep -q "Unknown system error -11" "$err_file"; then
    cat "$err_file" >&2
    echo "[validator-launcher] transient read error detected; retry ${attempt}/${MAX_ATTEMPTS}" >&2
    rm -f "$err_file"
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
    continue
  fi

  cat "$err_file" >&2
  rm -f "$err_file"
  exit "$status"
done

echo "[validator-launcher] exhausted retries after transient read errors" >&2
exit 1
