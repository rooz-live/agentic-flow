#!/bin/bash
# Reads metrics_log.jsonl to decide if code autocommit is safe

# 1. Check Measure: Recent CPU Load (from governor incidents)
# Ensure logs directory exists
mkdir -p logs
touch logs/governor_incidents.jsonl

recent_load_incidents=$(grep "system_overload" logs/governor_incidents.jsonl 2>/dev/null | tail -n 10 | wc -l)

# 2. Check Dimension: Risk Score (from metrics log)
# Ensure .goalie directory exists
mkdir -p .goalie
touch .goalie/metrics_log.jsonl

current_risk_score=$(tail -n 1 .goalie/metrics_log.jsonl 2>/dev/null | jq '.average_score // 0')

# Default to 0 if jq fails or file is empty
if [ -z "$current_risk_score" ]; then
    current_risk_score=0
fi

if [ "$recent_load_incidents" -gt 5 ]; then
    echo "⚠️ High System Load ($recent_load_incidents incidents). Disabling Code Autocommit."
    export AF_ALLOW_CODE_AUTOCOMMIT=0
elif (( $(echo "$current_risk_score > 50" | bc -l) )); then
    echo "⚠️ High Risk Score ($current_risk_score). Disabling Code Autocommit."
    export AF_ALLOW_CODE_AUTOCOMMIT=0
else
    echo "✅ System Healthy. Code Autocommit Allowed."
    export AF_ALLOW_CODE_AUTOCOMMIT=1
fi
