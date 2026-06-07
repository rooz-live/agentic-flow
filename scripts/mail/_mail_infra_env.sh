#!/usr/bin/env bash
set -euo pipefail
MAIL_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CPANEL_SSH_HOST="${CPANEL_SSH_HOST:-cpanel-whm}"
STX_SSH_HOST="${STX_SSH_HOST:-stx}"
STX_KEY="${STX_KEY:-$HOME/.ssh/starlingx_key}"
WHM_HOST="${WHM_HOST:-192.168.122.237}"
WHM_PORT="${WHM_PORT:-2087}"
if [[ -f "$MAIL_REPO_ROOT/.env" ]]; then set -a; source "$MAIL_REPO_ROOT/.env"; set +a; fi
export CPANEL_SSH_HOST STX_SSH_HOST STX_KEY WHM_HOST WHM_PORT
