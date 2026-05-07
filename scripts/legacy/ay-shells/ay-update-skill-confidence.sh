#!/usr/bin/env bash
# ay-update-skill-confidence.sh - Update skill confidence based on outcomes

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_STORE="${PROJECT_ROOT}/reports/skills-store.json"
VALIDATIONS="${PROJECT_ROOT}/reports/skill-validations.json"

update_confidence() {
    local skill_name="$1"
    local outcome="$2"  # success|failure
    local evidence="$3"
    
    if [[ ! -f "$SKILLS_STORE" ]]; then
        echo "Error: Skills store not found" >&2
        return 1
    fi
    
    # Calculate confidence adjustment
    local adjustment=0.05
    if [[ "$outcome" == "failure" ]]; then
        adjustment=-0.05
    fi
    
    # Update skill confidence
    jq --arg name "$skill_name" --argjson adj "$adjustment" '
        .skills |= map(
            if .name == $name then
                .success_rate = ([.success_rate + $adj, 0] | max | [., 1.0] | min) |
                .last_updated = (now | todate)
            else . end
        )
    ' "$SKILLS_STORE" > "${SKILLS_STORE}.tmp" && mv "${SKILLS_STORE}.tmp" "$SKILLS_STORE"
    
    # Record validation
    local validation_entry=$(cat <<EOF
{
  "skill_name": "$skill_name",
  "outcome": "$outcome",
  "evidence": "$evidence",
  "confidence_adjustment": $adjustment,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    
    jq --argjson entry "$validation_entry" '.validations += [$entry]' "$VALIDATIONS" > "${VALIDATIONS}.tmp"
    mv "${VALIDATIONS}.tmp" "$VALIDATIONS"
    
    echo "✓ Confidence updated for skill: $skill_name (outcome: $outcome)"
}

# Main execution
if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <skill_name> <outcome> <evidence>"
    exit 1
fi

update_confidence "$1" "$2" "$3"
