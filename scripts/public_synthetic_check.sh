#!/usr/bin/env bash
# Shim — canonical: code/tooling/scripts/public_synthetic_check.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/code/tooling/scripts/public_synthetic_check.sh" "$@"
