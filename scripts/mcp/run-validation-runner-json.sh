#!/usr/bin/env bash
# @business-context WSJF: T1a MCP bridge — IDE/CI calls validation-runner without hand-rolling paths
# @constraint DDD-VALIDATION: Read-only on email file; no network
# Run: ./scripts/mcp/run-validation-runner-json.sh /absolute/path/to/file.eml
# Optional: SKIP_SEMANTIC_VALIDATION=true ./scripts/mcp/run-validation-runner-json.sh ...
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNNER="$ROOT/scripts/validators/file/validation-runner.sh"

if [[ $# -lt 1 ]]; then
  echo '{"error":"missing_file_path","hint":"Provide absolute path to .eml"}' >&2
  exit 10
fi

FILE_PATH="$1"
case "$FILE_PATH" in
  /*) ;;
  *)
    echo '{"error":"path_must_be_absolute"}' >&2
    exit 10
    ;;
esac

if [[ ! -f "$FILE_PATH" ]]; then
  echo "{\"error\":\"not_found\",\"path\":\"$FILE_PATH\"}" >&2
  exit 11
fi

exec bash "$RUNNER" --json -f "$FILE_PATH"
