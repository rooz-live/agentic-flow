#!/usr/bin/env bash
#
# ay-loop.sh — The Active Sensing Layer (Continuous Testing & Telemetry)
#
# Runs in an active terminal session to continually monitor test execution,
# deployment artifacts, swarm health, and performance drift.
# Purpose: Prevent "Completion Theater" by verifying physical execution continuously.

set -euo pipefail

INTERVAL=${1:-10}
echo "================================================================"
echo " ♾️  Systemic.OS Active Sensing Layer (/loop)"
echo " Interval: ${INTERVAL}s | Mode: Immediate Reality Checking"
echo "================================================================"

while true; do
    echo -e "\n[$(date +%T)] 🔄 Polling systemic edges..."
    
    # 1. Swarm Health Check
    if pgrep -f "run_swarm_experiment.sh" > /dev/null; then
        echo "  [SWARM] Active execution detected. Monitoring log size vectors..."
        ls -lh .goalie/swarm_exp/*.log 2>/dev/null | awk '{print "    " $5 "\t" $9}' || true
    else
        echo "  [SWARM] No active adverse scenario running."
    fi

    # 2. Local CI Parity (Smoke Check)
    echo "  [SMOKE] Checking infrastructure integrity..."
    ./scripts/infra/smoke.sh > /dev/null 2>&1 && echo "    ✓ Passive Smoke Passed" || echo "    ✗ Passive Smoke Failed"

    # 3. Port/Server Checks (Physical verification over subjective plans)
    if lsof -i :8888 > /dev/null 2>&1; then
        echo "  [IDE] Local PDF IDE running on port 8888."
    fi

    sleep "$INTERVAL"
done
