#!/usr/bin/env bash
# scripts/kill-dev-ports.sh
#
# Kill any processes occupying the agentic-flow dev-server ports.
#
# WHY THIS EXISTS:
#   Ctrl+Z (suspend) instead of Ctrl+C (terminate) accumulates "T" (stopped)
#   node processes that still hold their port bindings. Playwright's
#   reuseExistingServer:true then silently reuses these stale servers, which
#   return 404 for /trading.html because they are from wrong sessions or
#   different project copies (e.g. projects/investing/agentic-flow vs
#   code/investing/agentic-flow).
#
# PORTS:
#   5173 — Vite dev server (trading dashboard)
#   3030 — Node monitoring dashboard_server.js
#   5000 — Flask API (web_dashboard.py)
#
# USAGE:
#   bash scripts/kill-dev-ports.sh            # kills 5173 + 3030
#   bash scripts/kill-dev-ports.sh --all      # also kills 5000
#   npm run pkill:ports                       # same as above (5173 + 3030)
#
# This script is safe to run repeatedly. It silently succeeds if ports are free.

set -euo pipefail

ALL=false
[[ "${1:-}" == "--all" ]] && ALL=true

PORTS=(5173 3030)
$ALL && PORTS+=(5000)

killed=0
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Killing $(echo "$pids" | wc -l | tr -d ' ') process(es) on :$port"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    ((killed++))
  fi
done

if [[ $killed -eq 0 ]]; then
  echo "All dev ports are clear."
else
  echo "Done. Cleared $killed port(s)."
fi
