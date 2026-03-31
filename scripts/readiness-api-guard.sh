#!/usr/bin/env bash
# @business-context WSJF: Feature-flag simulation for readiness API (403 when disabled)
# readiness-api-guard.sh — READINESS_API_ENABLED=false → blocked JSON

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/scripts/validators/file/validation-runner.sh"

if [[ "${READINESS_API_ENABLED:-true}" != "true" ]]; then
  cat <<'EOF'
{"error":"readiness_api_disabled","code":403,"message":"READINESS_API_ENABLED is not true"}
EOF
  exit 147
fi

exec "$RUNNER" "$@"
