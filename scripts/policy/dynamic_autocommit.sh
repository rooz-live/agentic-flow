#!/bin/bash
# Reads metrics_log.jsonl to decide if code autocommit is safe

# 1. Check Measure: Recent CPU Load (from governor incidents)
# Ensure the file exists before grepping to avoid errors
if [ -f "logs/governor_incidents.jsonl" ]; then
    recent_load_incidents=$(grep "system_overload" logs/governor_incidents.jsonl | tail -n 10 | wc -l)
else
    recent_load_incidents=0
fi

# 2. Check Dimension: Risk Score (from metrics log)
if [ -f ".goalie/metrics_log.jsonl" ]; then
    current_risk_score=$(tail -n 1 .goalie/metrics_log.jsonl | jq '.average_score // 0')
else
    current_risk_score=0
fi

# Handle empty or invalid risk score
if [ -z "$current_risk_score" ] || [ "$current_risk_score" == "null" ]; then
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

# When sourced from scripts/af this file only needs to tweak env vars; do not
# re-exec af here or we end up in an infinite loop.
return 0 2>/dev/null || true
