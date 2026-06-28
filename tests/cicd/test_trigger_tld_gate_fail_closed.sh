#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
grep -q 'REQUIRE_WAIT' "$ROOT/scripts/deploy/trigger_tld_gate_ci.sh"
grep -q 'fail-closed' "$ROOT/scripts/deploy/trigger_tld_gate_ci.sh"
grep -q 'resolve_run_id' "$ROOT/scripts/deploy/trigger_tld_gate_ci.sh"
bash -n "$ROOT/scripts/deploy/trigger_tld_gate_ci.sh"
echo "PASS trigger_tld_gate fail-closed contract"
