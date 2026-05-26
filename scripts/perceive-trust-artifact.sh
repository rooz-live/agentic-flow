#!/usr/bin/env bash
# Read-only trust perception: verify artifact chain without re-running trust-path.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${1:---check}"
ARTIFACT="${TRUST_ARTIFACT_PATH:-$ROOT/.goalie/evidence/last_gate_one_pass.json}"
SNAPSHOT="$ROOT/.goalie/evidence/perception_snapshot.json"

resolve_artifact() {
  local p="$1"
  if [[ -L "$p" ]]; then
    local target
    target="$(readlink "$p")"
    if [[ "$target" != /* ]]; then p="$ROOT/.goalie/evidence/$target"; else p="$target"; fi
  fi
  echo "$p"
}

HEAD="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ART_PATH="$(resolve_artifact "$ARTIFACT")"
EXIT_CODE=1
REASON="missing_artifact"
ART_HASH=""
ART_EXIT=""
ART_TS=""
CACHE_HIT=0

if [[ -f "$ART_PATH" ]]; then
  read -r ART_HASH ART_EXIT ART_TS < <(python3 - "$ART_PATH" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    d = json.load(f)
print(d.get("hash", ""), d.get("exit_code", ""), d.get("timestamp", ""))
PY
)
  if [[ "$ART_EXIT" == "0" && -n "$ART_HASH" && "$ART_HASH" == "$HEAD" ]]; then
    EXIT_CODE=0
    REASON="artifact_matches_head"
  elif [[ "$ART_EXIT" == "0" && -n "$ART_HASH" ]]; then
    REASON="artifact_stale_head_mismatch"
  elif [[ "$ART_EXIT" != "0" ]]; then
    REASON="artifact_exit_nonzero"
  fi
fi

CACHE="$ROOT/.goalie/trust_cache.json"
if [[ -f "$CACHE" && "$EXIT_CODE" -ne 0 ]]; then
  read -r CSHA CEXIT < <(python3 - "$CACHE" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    d = json.load(f)
print(d.get("head_sha", ""), d.get("exit_code", ""))
PY
)
  if [[ "$CEXIT" == "0" && "$CSHA" == "$HEAD" ]]; then
    CACHE_HIT=1
    EXIT_CODE=0
    REASON="trust_cache_matches_head"
  fi
fi

mkdir -p "$ROOT/.goalie/evidence"
export NOW HEAD ART_PATH ART_HASH ART_EXIT ART_TS CACHE_HIT EXIT_CODE REASON SNAPSHOT
python3 - <<'PY'
import json, os
payload = {
  "timestamp_utc": os.environ["NOW"],
  "head_sha": os.environ["HEAD"],
  "artifact_path": os.environ.get("ART_PATH", ""),
  "artifact_hash": os.environ.get("ART_HASH", ""),
  "artifact_exit_code": os.environ.get("ART_EXIT", ""),
  "artifact_timestamp": os.environ.get("ART_TS", ""),
  "cache_hit": os.environ.get("CACHE_HIT") == "1",
  "perception_exit_code": int(os.environ.get("EXIT_CODE", "1")),
  "reason": os.environ.get("REASON", ""),
  "force_rerun_hint": "TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path",
}
with open(os.environ["SNAPSHOT"], "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
PY

case "$MODE" in
  --json) cat "$SNAPSHOT" ;;
  --check)
    if [[ "$EXIT_CODE" -eq 0 ]]; then
      echo "perceive-trust: PASS ($REASON) head=${HEAD:0:12}"
    else
      echo "perceive-trust: FAIL ($REASON) head=${HEAD:0:12}" >&2
      echo "  Run: TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path" >&2
    fi ;;
  *) echo "Usage: $0 [--check|--json]" >&2; exit 2 ;;
esac
exit "$EXIT_CODE"
