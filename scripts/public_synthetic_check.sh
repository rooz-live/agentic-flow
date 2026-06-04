#!/usr/bin/env bash
# Shim → canonical: code/tooling/scripts/public_synthetic_check.sh (R-CLS-06)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL="${ROOT}/code/tooling/scripts/public_synthetic_check.sh"
if [[ -x "$CANONICAL" ]]; then
    exec "$CANONICAL" "$@"
else
    echo "ERROR: canonical script not found at $CANONICAL" >&2
    exit 1
fi
