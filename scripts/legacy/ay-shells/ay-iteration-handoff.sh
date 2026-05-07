#!/usr/bin/env bash
# ay-iteration-handoff.sh - Generate iteration handoff report

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/reports"
HANDOFF_REPORT="${REPORTS_DIR}/iteration-handoff.json"

generate_handoff() {
    local iteration_num="${1:-unknown}"
    
    # Collect metrics from current iteration
    local skills_count=0
    local validations_count=0
    local confidence_avg=0.0
    
    if [[ -f "${REPORTS_DIR}/skills-store.json" ]]; then
        skills_count=$(jq '.skills | length' "${REPORTS_DIR}/skills-store.json")
        confidence_avg=$(jq '[.skills[].success_rate] | add / length' "${REPORTS_DIR}/skills-store.json" 2>/dev/null || echo "0.0")
    fi
    
    if [[ -f "${REPORTS_DIR}/skill-validations.json" ]]; then
        validations_count=$(jq '.validations | length' "${REPORTS_DIR}/skill-validations.json")
    fi
    
    # Generate handoff report
    cat > "$HANDOFF_REPORT" <<EOF
{
  "iteration": "$iteration_num",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "skills": {
    "total_count": $skills_count,
    "average_confidence": $confidence_avg
  },
  "validations": {
    "total_count": $validations_count
  },
  "next_actions": [
    "Review low-confidence skills",
    "Execute validation tests",
    "Update ROAM scores"
  ]
}
EOF
    
    echo "✓ Iteration handoff report generated: $HANDOFF_REPORT"
}

generate_handoff "$@"
