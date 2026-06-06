#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="${REPO_ROOT:-$(git -C "$ROOT/../.." rev-parse --show-toplevel)}"
SLICE="${AGENT_SLICE:-publication}"
fail(){ echo "DoR FAIL: $*"; exit 1; }
echo "=== Agent session DoR (slice=$SLICE) ==="
M="$REPO_ROOT/config/publication/gate_index_manifest.txt"
if [[ "$SLICE" == publication && -f "$M" ]]; then
  miss=""
  while read -r p; do [[ -z "$p" || "$p" == \#* ]] && continue
    git -C "$REPO_ROOT" ls-files --error-unmatch "$p" >/dev/null 2>&1 || miss+="$p"$'\n'
  done < "$M"
  [[ -z "$miss" ]] || { echo "DoR FAIL manifest not indexed:"; printf '%s' "$miss"; fail manifest; }
  echo "OK publication gate manifest indexed"
  o=$(git -C "$REPO_ROOT" ls-files --others --exclude-standard scripts/|wc -l|tr -d ' ')
  [[ "${o:-0}" -gt 0 ]] && echo "WARN $o untracked scripts/ (triage backlog)"
else fail "need publication manifest"
fi
T="$REPO_ROOT/.goalie/evidence/last_gate_one_pass.json"
bash "$REPO_ROOT/scripts/one.sh" verify-contract "$T" </dev/null >/dev/null 2>&1 && echo "OK trust artifact" || echo "INFO trust stale"
echo "=== Agent session DoR passed ==="
