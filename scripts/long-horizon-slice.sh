#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$ROOT_DIR/.goalie/evidence"
SLICE_DIR="$EVIDENCE_DIR/slices"
mkdir -p "$SLICE_DIR"

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
CHECKPOINT="$SLICE_DIR/checkpoint_${RUN_ID}.log"
STDERR_FILE="$SLICE_DIR/stderr_${RUN_ID}.log"
SUMMARY_JSON="$SLICE_DIR/summary_${RUN_ID}.json"

MAX_RETRIES="${MAX_RETRIES:-2}"

run_and_capture() {
  local label="$1"
  shift
  local cmd=("$@")
  local attempts=0
  local rc=1

  while (( attempts < MAX_RETRIES )); do
    attempts=$((attempts + 1))
    echo "[$(date -u +%FT%TZ)] RUN $label attempt=$attempts cmd=${cmd[*]}" >> "$CHECKPOINT"
    set +e
    "${cmd[@]}" > >(tee -a "$CHECKPOINT") 2> >(tee -a "$STDERR_FILE" >&2)
    rc=$?
    set -e
    if [[ $rc -eq 0 ]]; then
      echo "[$(date -u +%FT%TZ)] PASS $label rc=0" >> "$CHECKPOINT"
      break
    fi
    echo "[$(date -u +%FT%TZ)] FAIL $label rc=$rc" >> "$CHECKPOINT"
  done

  if [[ $rc -ne 0 ]]; then
    echo "[$(date -u +%FT%TZ)] STOP after $MAX_RETRIES failures for $label" >> "$CHECKPOINT"
    echo "--- first 30 lines stderr ---" >> "$CHECKPOINT"
    sed -n '1,30p' "$STDERR_FILE" >> "$CHECKPOINT" || true
    return $rc
  fi
}

{
  echo "=== Long-horizon checkpoint $RUN_ID ==="
  echo "repo=$ROOT_DIR"
  echo "run_id=$RUN_ID"
  echo "--- git status -sb ---"
  /usr/bin/git -C "$ROOT_DIR" status -sb || true
} > "$CHECKPOINT"

run_and_capture "check-gate-dedupe" bash "$ROOT_DIR/scripts/ci/check-gate-dedupe.sh"
run_and_capture "trust-path" env TRUST_FORCE_RERUN=1 bash "$ROOT_DIR/scripts/one.sh" trust-path
run_and_capture "verify-contract" bash "$ROOT_DIR/scripts/one.sh" verify-contract "$ROOT_DIR/.goalie/evidence/last_gate_one_pass.json"

cat > "$SUMMARY_JSON" <<JSON
{
  "run_id": "$RUN_ID",
  "checkpoint": "$CHECKPOINT",
  "stderr": "$STDERR_FILE",
  "artifact": "$ROOT_DIR/.goalie/evidence/last_gate_one_pass.json"
}
JSON

echo "Slice complete. Summary: $SUMMARY_JSON"
