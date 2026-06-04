#!/usr/bin/env bash
# tooling/scripts/public_synthetic_check.sh — shim → code/tooling canonical (R-CLS-06).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CANONICAL="${REPO_ROOT}/code/tooling/scripts/public_synthetic_check.sh"
if [[ ! -x "$CANONICAL" ]]; then
  echo "ERROR: canonical not found: $CANONICAL" >&2
  exit 1
fi
exec "${REPO_ROOT}/code/tooling/scripts/public_synthetic_check.sh" "$@"
