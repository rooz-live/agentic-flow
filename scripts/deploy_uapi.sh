#!/usr/bin/env bash
# DEPRECATED: use scripts/deploy/deploy-uapi.sh via ./scripts/one.sh deploy-uapi
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "WARN: scripts/deploy_uapi.sh is deprecated — exec scripts/deploy/deploy-uapi.sh" >&2
exec bash "$ROOT/scripts/deploy/deploy-uapi.sh" "$@"
