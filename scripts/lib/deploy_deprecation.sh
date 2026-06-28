#!/usr/bin/env bash
# Shared deprecation router for legacy deploy entrypoints.
set -euo pipefail
LEGACY="${1:-unknown}"
shift || true
echo "ERROR: scripts/${LEGACY}.sh is deprecated — use ./scripts/one.sh instead." >&2
echo "  Example: ./scripts/one.sh deploy-uapi" >&2
echo "  Example: ./scripts/one.sh deploy-edge" >&2
echo "  Canonical impl: scripts/deploy/deploy-uapi.sh" >&2
exit 1
