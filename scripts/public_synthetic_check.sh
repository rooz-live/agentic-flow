#!/usr/bin/env bash
# Shim → canonical: tooling/scripts/public_synthetic_check.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL="${ROOT}/tooling/scripts/public_synthetic_check.sh"
if [[ -x "$CANONICAL" ]]; then
    exec "$CANONICAL" "$@"
else
    echo "ERROR: canonical script not found at $CANONICAL" >&2
    exit 1
fi
