#!/usr/bin/env bash
set -euo pipefail

# Swarm Orchestration Launch Script
# Coordinates initialization of risk DB, ROAM risks, dashboard, and governance agent.

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[swarm-launcher]${NC} $1"; }
warn() { echo -e "${YELLOW}[swarm-launcher]${NC} $1"; }
error() { echo -e "${RED}[swarm-launcher]${NC} $1" >&2; }

# 1. Environment Check
log "Checking environment..."
if [ -z "${E2B_API_KEY:-}" ]; then
    if [ -f .env ]; then
        # Try to load from .env
        export $(grep -v '^#' .env | xargs)
    fi
    if [ -z "${E2B_API_KEY:-}" ]; then
        warn "E2B_API_KEY not set. Sandbox capabilities will be limited."
    fi
fi

# 2. Initialize Risk Database
log "Initializing Risk Database..."
./scripts/db/risk_db_init.sh

# 3. Initialize ROAM Risks
log "Initializing ROAM Risks..."
python3 scripts/roam_risk_init.py --auto

# 4. Start Dashboard (Background)
log "Starting Monitoring Dashboard..."
npm run dashboard:start > dashboard.log 2>&1 &
DASHBOARD_PID=$!
log "Dashboard started (PID: $DASHBOARD_PID). Logs: dashboard.log"

# 5. Start Governance Agent (Background)
log "Starting Governance Agent..."
if [ -f scripts/governance_agent.py ]; then
    python3 scripts/governance_agent.py > governance.log 2>&1 &
    GOV_PID=$!
    log "Governance Agent started (PID: $GOV_PID). Logs: governance.log"
else
    warn "Governance agent script not found at scripts/governance_agent.py"
fi

# 6. Wait for interrupt
log "Swarm is running. Press Ctrl+C to stop."

cleanup() {
    log "Stopping swarm..."
    kill $DASHBOARD_PID 2>/dev/null || true
    if [ -n "${GOV_PID:-}" ]; then
        kill $GOV_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
