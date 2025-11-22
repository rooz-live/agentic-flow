#!/bin/bash
# Policy Wrapper for Agentic Flow (af)
# - Enforces safety guardrails (System Load & Risk Score)
# - Defaults to MAX CONFIGURATION (12 iterations, full rotation) if no args provided

# Resolve script paths
# Resolve script paths
POLICY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$POLICY_DIR")")"
AF_SCRIPT="$PROJECT_ROOT/scripts/af"

# 1. MAX CONFIGURATION DEFAULT
if [ $# -eq 0 ]; then
    echo -e "\033[1;34m🚀 No arguments provided. Defaulting to MAX CONFIGURATION...\033[0m"
    echo -e "   Command: \033[1;32maf prod-cycle 12 --rotate-circles --depth 3 --autocommit\033[0m"
    echo -e "   Context: Full Rotation (2x all circles), DevOps Depth, Relentless Execution"
    set -- prod-cycle 12 --rotate-circles --depth 3 --autocommit
fi

# 2. HEALTH CHECKS (Guardrails)
INCIDENTS_LOG="$PROJECT_ROOT/logs/governor_incidents.jsonl"
METRICS_LOG="$PROJECT_ROOT/.goalie/metrics_log.jsonl"

# Check System Load
RECENT_LOAD_INCIDENTS=0
if [ -f "$INCIDENTS_LOG" ]; then
    # Check last 20 lines for incidents (matching governance.py window)
    RECENT_LOAD_INCIDENTS=$(tail -n 20 "$INCIDENTS_LOG" | grep "system_overload" | wc -l)
fi

# Check Risk Score
CURRENT_RISK_SCORE=0
if [ -f "$METRICS_LOG" ]; then
    # Extract last valid score, default to 0 if missing/null
    CURRENT_RISK_SCORE=$(tail -n 10 "$METRICS_LOG" | grep "average_score" | tail -n 1 | sed -E 's/.*"average_score":([0-9]+).*/\1/' || echo 0)
fi

# 3. DYNAMIC POLICY ENFORCEMENT
if [ "$RECENT_LOAD_INCIDENTS" -gt 5 ]; then
    echo -e "\033[0;31m⚠️  High System Load ($RECENT_LOAD_INCIDENTS incidents). Disabling Code Autocommit.\033[0m"
    export AF_ALLOW_CODE_AUTOCOMMIT=0
elif [ "$CURRENT_RISK_SCORE" -gt 0 ] && [ "$CURRENT_RISK_SCORE" -lt 50 ]; then
    echo -e "\033[0;31m⚠️  High Risk Score ($CURRENT_RISK_SCORE < 50). Disabling Code Autocommit.\033[0m"
    export AF_ALLOW_CODE_AUTOCOMMIT=0
else
    echo -e "\033[0;32m✅ System Healthy (Load OK, Risk $CURRENT_RISK_SCORE). Code Autocommit Allowed.\033[0m"
    export AF_ALLOW_CODE_AUTOCOMMIT=1
fi

# 4. EXECUTION
# exec "$AF_SCRIPT" "$@"
# (Removed to prevent infinite loop when sourced by af)
