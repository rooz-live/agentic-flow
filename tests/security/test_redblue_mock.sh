#!/usr/bin/env bash
# Slow-tier smoke: redblue + impeccable CLI + loop_prompts RC (no live targets).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if ! command -v npx >/dev/null; then
  echo "SKIP redblue: npx missing"
  exit 0
fi
npx --yes @metaharness/redblue --version >/dev/null 2>&1 || npx --yes @metaharness/redblue -h >/dev/null 2>&1 || {
  echo "FAIL: @metaharness/redblue CLI not loadable"
  exit 1
}
npx --yes impeccable --version >/dev/null
# skills pin: impeccable skills update is the canonical refresh command
if [[ -f "$ROOT/config/loop_prompts.yaml" ]]; then
  AF_SKIP_OP_READ=1 bash "$ROOT/scripts/cicd/loop_timer_engine.sh" --dry-run --once >/dev/null 2>&1 || {
    echo "FAIL: loop_timer_engine dry-run RC non-zero"
    exit 1
  }
fi
echo "PASS redblue_impeccable_cli_smoke"
