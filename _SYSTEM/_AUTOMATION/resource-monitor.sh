#!/usr/bin/env bash
# _SYSTEM/_AUTOMATION/resource-monitor.sh
# Disk and Memory Resource Monitoring

set -euo pipefail

# CSQBM Governance Constraint: emit background trace telemetry
PROJECT_ROOT="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ] && source "$PROJECT_ROOT/scripts/validation-core.sh" || true

disk_percent=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_percent" -gt 95 ]; then
    echo "CRITICAL: Disk usage at ${disk_percent}% - initiating emergency proactive cleanup."
    npm cache clean --force || true
    pip3 cache purge || true
    find /private/tmp -type f -mtime +1 -delete 2>/dev/null || true
    find ~/Library/Logs -maxdepth 1 -type f -mtime +3 -delete 2>/dev/null || true
fi

mem_percent=$(ps aux | awk '{sum+=$4} END {print sum}')
if (( $(echo "$mem_percent > 90.0" | bc -l) )); then
    echo "CRITICAL: Memory footprint too high (${mem_percent}%). Flushing orphaned Swarm agents."
    pkill -f "swarm-agent" || true
fi
