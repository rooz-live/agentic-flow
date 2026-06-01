#!/usr/bin/env bash
# ssr_readiness_guard.sh - Verify SSR API and environment readiness

set -euo pipefail

echo "=== SSR Readiness Guard ==="

# 1. Node Version Check
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | tr -d 'v')
  MAJOR_VER=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$MAJOR_VER" -lt 20 ]; then
    echo "❌ Fail: Node version is $NODE_VER. Required >= 20." >&2
    exit 1
  fi
  echo "✓ Node version: v$NODE_VER (>= 20)"
else
  echo "❌ Fail: node is not installed." >&2
  exit 1
fi

# 2. Config/Proxies Check
CADDY_CONFIG="src/proxies/edge_gateway.cfg"
if [ -f "$CADDY_CONFIG" ]; then
  echo "✓ Caddy config exists: $CADDY_CONFIG"
else
  echo "⚠️ Warning: Caddy proxy config missing: $CADDY_CONFIG"
fi

# 3. Environment Secrets Check
# Look in .env files
COGNITUM_SECRET=""
for f in .env ../.env ../../.env; do
  if [ -f "$f" ]; then
    COGNITUM_SECRET=$(grep "^COGNITUM_WEBHOOK_SECRET=" "$f" | cut -d'=' -f2- | tr -d '"'\')
    if [ -n "$COGNITUM_SECRET" ]; then
      break
    fi
  fi
done

if [ -n "$COGNITUM_SECRET" ] || [ -n "${COGNITUM_WEBHOOK_SECRET:-}" ]; then
  echo "✓ COGNITUM_WEBHOOK_SECRET is set"
else
  echo "❌ Fail: COGNITUM_WEBHOOK_SECRET is not set in environment or .env files" >&2
  exit 1
fi

# 4. Database Check
DB_PATH="${AGENTDB_LEARNING_PATH:-$HOME/.agentdb/agentdb_learning.db}"
if [ -f "$DB_PATH" ]; then
  echo "✓ AgentDB Learning Database exists: $DB_PATH"
else
  echo "⚠️ Warning: AgentDB Learning Database file missing: $DB_PATH (will be touched on launch)"
fi

# 5. Check if we can build or verify TypeScript
if [ -f "tsconfig.json" ]; then
  echo "✓ tsconfig.json exists"
fi

echo "✓ SSR Readiness Check Passed Successfully!"
exit 0
