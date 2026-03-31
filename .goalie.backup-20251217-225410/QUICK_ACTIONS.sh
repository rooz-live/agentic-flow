#!/bin/bash
# Quick Actions - Post Schema Fix & WSJF Replenishment
# Generated: 2025-12-12

set -e

echo "🎯 Agentic Flow - Quick Actions"
echo "================================"
echo ""

# Function to run with error handling
run_cmd() {
    echo "→ $1"
    eval "$2"
    echo ""
}

# 1. Revenue Concentration Fix (CRITICAL - P10)
echo "1️⃣  Address Revenue Concentration (83.1% in top 3)"
run_cmd "Run orchestrator cycle" "python3 scripts/cmd_prod_cycle.py --mode advisory --iterations 2 --circle orchestrator"
run_cmd "Run assessor cycle" "python3 scripts/cmd_prod_cycle.py --mode advisory --iterations 2 --circle assessor"

# 2. Check Integration Failures (HIGH - P8)
echo "2️⃣  Check Integration Health"
run_cmd "Customer sync status" "./scripts/af pattern-stats --pattern integration_customer_sync"
run_cmd "Host provision status" "./scripts/af pattern-stats --pattern integration_host_provision"

# 3. Deploy Failure Analysis (HIGH - P6)
echo "3️⃣  Analyze Deploy Failures"
run_cmd "Safe degrade patterns" "./scripts/af pattern-stats --pattern safe_degrade"
run_cmd "Deploy failures" "./scripts/af pattern-stats --pattern deploy_fail"

# 4. Daily Health Check
echo "4️⃣  Daily Health Metrics"
run_cmd "Revenue attribution" "python3 scripts/agentic/revenue_attribution.py --json"
run_cmd "Schema compliance" "python3 scripts/monitor_schema_drift.py --last 100"
run_cmd "Governor health" "./scripts/af governor-health"

echo "✅ All quick actions complete!"
echo ""
echo "📊 Key Metrics:"
echo "  - Allocation Efficiency: 9.78% → Target: 80%"
echo "  - Revenue Concentration: 83.1% → Target: <60%"
echo "  - Observability: 1.0% → Target: 90% (ENABLED)"
echo "  - Potential Revenue: +$4,885/mo (+270%)"
echo ""
echo "Next: Review .goalie/EXECUTION_SUMMARY_2025_12_12.md"
