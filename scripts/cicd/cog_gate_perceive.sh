#!/usr/bin/env bash
# COG perceive gate — edge + full substrate (no CVT-001 commit theater).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="${DEBUG_LOG:-/Users/shahroozbhopti/.cursor/debug-logs/debug-254b22.log}"
AF="${ROOT}/projects/investing/agentic-flow"
fail=0

_log() {
  printf '{"sessionId":"254b22","timestamp":%s,"location":"cog_gate_perceive.sh","message":"%s","data":%s,"runId":"cog-perceive","hypothesisId":"H-scope"}\n' \
    "$(python3 -c 'import time;print(int(time.time()*1000))')" "$1" "$2" >>"$LOG" 2>/dev/null || true
}

echo "=== COG perceive (edge + full, no commit scope) ==="
if [[ -x "${AF}/tooling/scripts/cog_edge_smoke.sh" ]]; then
  (cd "$AF" && bash tooling/scripts/cog_edge_smoke.sh) || fail=1
else
  echo "WARN cog_edge_smoke.sh missing"
  fail=1
fi

python3 "${ROOT}/scripts/governance/compliance_as_code.py" --cog || fail=1
python3 "${ROOT}/scripts/governance/compliance_as_code.py" --cog --scope=full || fail=1

_log "done" "{\"fail\":${fail}}"
[[ "$fail" -eq 0 ]] || exit 1
echo "=== COG perceive OK (use --scope=commit only before git commit) ==="
exit 0
