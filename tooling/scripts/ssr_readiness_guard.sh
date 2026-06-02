#!/usr/bin/env bash
# ssr_readiness_guard.sh - Verify SSR swarm-api-server environment preflight
set -euo pipefail

echo "🔍 Running SSR Readiness Guard..."

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed." >&2
  exit 1
fi
echo "✓ Node.js version: $(node -v)"

# 2. Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed." >&2
  exit 1
fi
echo "✓ npm version: $(npm -v)"

# 3. Check port 3001 availability
PORT=${SWARM_API_PORT:-3001}
if command -v lsof &>/dev/null; then
  if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Warning: Port $PORT is already in use." >&2
  else
    echo "✓ Port $PORT is free and ready for binding."
  fi
elif command -v netstat &>/dev/null; then
  if netstat -an | grep "$PORT" | grep -i listen >/dev/null; then
    echo "⚠️ Warning: Port $PORT is already in use." >&2
  else
    echo "✓ Port $PORT is free."
  fi
fi

# 4. Check better-sqlite3 native module availability
echo "Checking better-sqlite3 native module..."
if node -e "require('better-sqlite3')" &>/dev/null; then
  echo "✓ better-sqlite3 native module is available and functional."
else
  echo "⚠️ Warning: better-sqlite3 native module is not functional or needs rebuild."
fi

# 5. Check if required files exist
REQUIRED_FILES=(
  "projects/investing/agentic-flow/src/api/swarm-api-server.ts"
  "projects/investing/agentic-flow/frontend/src/integrations/cognitum_mcp_server.ts"
  "projects/investing/agentic-flow/frontend/src/integrations/cognitum_affiliate.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ Required file exists: $file"
  else
    echo "❌ Error: Required file missing: $file" >&2
    exit 1
  fi
done

echo "🎉 SSR environment readiness verified."
exit 0
