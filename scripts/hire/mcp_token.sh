#!/usr/bin/env bash
# Resolve hire.agentics.org MCP bearer token (op read or env).
set -euo pipefail

if [[ -n "${MCP_TOKEN:-}" ]]; then
  printf '%s' "$MCP_TOKEN"
  exit 0
fi

if [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
  export OP_SERVICE_ACCOUNT_TOKEN
fi

if command -v op >/dev/null 2>&1; then
  op read "op://Personal/Agentics/MCP API Token" 2>/dev/null && exit 0
fi

echo "mcp_token: set MCP_TOKEN or configure op read op://Personal/Agentics/MCP API Token" >&2
exit 1
