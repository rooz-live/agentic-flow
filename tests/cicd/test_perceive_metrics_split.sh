#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
TMP="scripts/cicd/_tdd_substrate_probe_$$.sh"
trap 'rm -f "$TMP"; git restore --staged "$TMP" 2>/dev/null; rm -f "$TMP"' EXIT
echo '# probe' > "$TMP"
OUT=$(REPO_ROOT="$ROOT" PERCEIVE_UNTRACKED_MODE=gate bash -c 'source scripts/cicd/lib/cls_common.sh; cls_repo_root; cls_untracked_counts')
read -r UC US <<< "$OUT"
[[ "$UC" == "0" ]] || { echo "FAIL: expected gate critical 0 got $UC"; exit 1; }
[[ "$US" -ge "1" ]] || { echo "FAIL: expected substrate >=1 got $US"; exit 1; }
echo "PASS perceive_metrics_split"
