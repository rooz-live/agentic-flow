#!/bin/bash
set -euo pipefail
echo "--> [WSJF 8.0] Purging NPM global caches..."
npm cache clean --force 2>/dev/null || true
rm -rf ~/.npm/_cacache 2>/dev/null || true
