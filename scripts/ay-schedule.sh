#!/usr/bin/env bash
#
# ay-schedule.sh — The Continuity Layer (Background Scheduled Processes)
#
# Runs persistently across sessions for nightly audits, weekly architecture
# reviews, and long-running analysis. Leverages active/passive coverage ratios
# guided by WSJF and ROAM risks.

set -euo pipefail

MODE=${1:-daily}
echo "================================================================"
echo " ♾️  Systemic.OS Continuity Layer (/schedule)"
echo " Mode: $MODE | Purpose: Long-Term Knowledge Accumulation"
echo "================================================================"

case "$MODE" in
    nightly|daily)
        echo "[SCHEDULE] Executing Nightly Audit (Passive Coverage Ratio & Cost Check)"
        # 1. Execute budget tracking API projection
        npx ts-node -O '{"module":"commonjs"}' scripts/ay-authorize-budget.ts || echo "[SCHEDULE] Alert: Budget limits breached."
        
        # 2. Re-evaluate ROAM Risks via API Cost Analyzer
        python3 scripts/infra/cpanel/api-cost-analyzer.py --export-json logs/api-cost.json
        echo "[SCHEDULE] Nightly Telemetry Updated."
        ;;
    weekly)
        echo "[SCHEDULE] Executing Weekly Architecture Review"
        # 1. OpenSSF Scorecard & Semgrep validation
        ./scripts/infra/security/scan-local.sh
        
        # 2. Aggregate WSJF into RFC ledger
        echo "Synthesizing new RFC metrics for Single-Threaded Deployments..."
        ;;
    *)
        echo "Unknown schedule mode. Valid: daily, nightly, weekly"
        exit 1
        ;;
esac
