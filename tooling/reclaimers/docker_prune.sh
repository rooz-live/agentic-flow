#!/bin/bash
set -euo pipefail
echo "--> [WSJF 7.0] Pruning dangling Docker execution boundaries..."
docker system prune -a -f --volumes 2>/dev/null || true
