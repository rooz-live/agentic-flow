#!/usr/bin/env bash
# Shim → canonical implementation (no exec loop).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export AGENT_SLICE="${AGENT_SLICE:-publication}"
exec "$ROOT/code/tooling/scripts/agent_session_dor.sh" "$@"
