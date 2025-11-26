#!/bin/bash
# Check for upstream @foxruv/iris updates

set -euo pipefail

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

CURRENT_VERSION=$(npm list @foxruv/iris --depth=0 --json 2>/dev/null | jq -r '.dependencies["@foxruv/iris"].version')
LATEST_VERSION=$(npm view @foxruv/iris version 2>/dev/null || echo "unknown")

echo "=== IRIS Dependency Health Check ==="
echo "Current: @foxruv/iris@$CURRENT_VERSION"
echo "Latest:  @foxruv/iris@$LATEST_VERSION"

if [ "$LATEST_VERSION" != "unknown" ] && [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
    echo "⚠️  Update available!"
    npm view @foxruv/iris@$LATEST_VERSION
elif [ "$LATEST_VERSION" == "unknown" ]; then
    echo "⚠️  Could not fetch latest version info."
else
    echo "✅ Up to date"
fi

# Check for security vulnerabilities
echo ""
echo "=== Security Audit ==="
npm audit --audit-level=moderate --json | jq '.vulnerabilities | length'
