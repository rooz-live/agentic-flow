#!/usr/bin/env bash
# Contract: receipt_chain ENFORCE=1 propagates intel_pipeline fail-closed after PASS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"

grep -q 'AF_INTEL_PIPELINE_ENFORCE="$_intel_enforce"' "$CHAIN" || {
  echo "FAIL: receipt_chain must set AF_INTEL_PIPELINE_ENFORCE for intel_pipeline_tick"
  exit 1
}
grep -q 'if \[\[ "$ENFORCE" == "1" \]\]; then' "$CHAIN" || {
  echo "FAIL: receipt_chain must bump intel enforce when ENFORCE=1"
  exit 1
}
echo "PASS T1 receipt_chain_intel_enforce_wiring"

FAKE_ROOT="$(mktemp -d)"
trap 'rm -rf "$FAKE_ROOT"' EXIT
mkdir -p "$FAKE_ROOT/.goalie/evidence/receipts"
# No tick receipt -> intel post_task must exit 1 when enforce=1 (non-dry).
set +e
REPO_ROOT="$FAKE_ROOT" AF_INTEL_PIPELINE_ENFORCE=1 \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T2_EC=$?
set -e
[[ "$T2_EC" -eq 1 ]] || { echo "FAIL: intel enforce without PASS receipt expected 1, got $T2_EC"; exit 1; }
echo "PASS T2 intel_pipeline_enforce_no_receipt"
echo "PASS receipt_chain_intel_enforce"
