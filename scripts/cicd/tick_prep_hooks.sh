#!/usr/bin/env bash
# DoR gate before wave_autopilot: harness doctor must pass.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

echo "=== tick_prep: harness doctor (DoD gate) ==="
if [[ -d "$ROOT/apps/agent-harness" ]]; then
  npm --prefix "$ROOT/apps/agent-harness" run doctor
else
  echo "SKIP harness doctor: apps/agent-harness missing"
fi
