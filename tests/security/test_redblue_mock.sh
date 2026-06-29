#!/usr/bin/env bash
# Slow-tier smoke: redblue + impeccable CLI load (no live targets).
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
echo "PASS redblue_impeccable_cli_smoke"
