#!/bin/bash
# Replenish Circle Backlogs from Retro Insights
# Usage: ./replenish_circle.sh [circle] [--auto-calc-wsjf]
#   circle: analyst|assessor|innovator|intuitive|orchestrator|seeker (default: orchestrator)
#   --auto-calc-wsjf: Skip interactive prompts, use defaults

set -euo pipefail

# Circle parameter with default
CIRCLE="${1:-orchestrator}"
AUTO_CALC=${2:-}

SOURCE_FILE="docs/QUICK_WINS.md"

# Validate circle
case "$CIRCLE" in
    analyst|assessor|innovator|intuitive|orchestrator|seeker)
        echo "🎯 Replenishing $CIRCLE circle"
        ;;
    *)
        echo "❌ Invalid circle: $CIRCLE"
        echo "Valid circles: analyst, assessor, innovator, intuitive, orchestrator, seeker"
        exit 1
        ;;
esac

# Find target backlog (prioritize operational roles, fallback to circle-lead)
find_target_backlog() {
    local circle="$1"
    local candidates
    
    # Try operational roles first
    candidates=$(find "circles/$circle/operational-*-roles/" -name "backlog.md" 2>/dev/null | head -1)
    
    if [[ -z "$candidates" ]]; then
        # Try circle-lead
        candidates=$(find "circles/$circle/circle-lead-*/" -name "backlog.md" 2>/dev/null | head -1)
    fi
    
    echo "$candidates"
}

TARGET_BACKLOG=$(find_target_backlog "$CIRCLE")

if [[ -z "$TARGET_BACKLOG" ]]; then
    echo "❌ No backlog.md found for $CIRCLE circle"
    echo "Searched in:"
    echo "  - circles/$CIRCLE/operational-*-roles/"
    echo "  - circles/$CIRCLE/circle-lead-*/"
    exit 1
fi

echo "📝 Target backlog: $TARGET_BACKLOG"

echo "🔍 Scanning for Retro Insights in $SOURCE_FILE..."

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file $SOURCE_FILE not found!"
    exit 1
fi

if [ ! -f "$TARGET_BACKLOG" ]; then
    echo "❌ Target backlog $TARGET_BACKLOG not found!"
    exit 1
fi

# Grep for 'source:retro', format as table row, and append
# Assuming QUICK_WINS format: - [ ] source:retro Description
# Target format: | ID | Task | Status | Budget | Method Pattern | DoR (Baseline) | DoD (Success Criteria) |

# Note: grep is case insensitive (-i) to catch Source:retro, source:Retro, etc.
# Using sed to remove the markdown list item and checkbox markers
grep -i "source:retro" "$SOURCE_FILE" | while read -r line; do
    # Clean up the line (remove markdown list/checkbox and source tag)
    TASK_DESC=$(echo "$line" | sed -E 's/- \[[ x]\] .*source:retro //i')
    
    # If description is empty or just whitespace, skip
    if [[ -z "${TASK_DESC// }" ]]; then
        continue
    fi

    # Check if already in backlog to avoid duplicates
    # Use fixed string grep (-F) to handle special chars in description
    if grep -Fq "$TASK_DESC" "$TARGET_BACKLOG"; then
        echo "  ⚠️  Skipping duplicate: $TASK_DESC"
        continue
    fi

    # Interactive Prompt for Dimensions
    echo ""
    echo "  🎯 New Insight found: $TASK_DESC"
    
    if [[ "$AUTO_CALC" == "--auto-calc-wsjf" ]]; then
        # Auto mode: use defaults
        BUDGET="OpEx"
        PATTERN="TDD"
        BASELINE="None"
        SUCCESS_CRITERIA="[ ] Action verified"
        UBV=2
        TC=2
        RR=2
        SIZE=1
        echo "  🤖 Auto-calculating WSJF with defaults"
    else
        # Interactive mode
        read -p "     💰 Budget (CapEx/OpEx) [OpEx]: " BUDGET
        BUDGET=${BUDGET:-OpEx}
        
        read -p "     🧬 Method Pattern (e.g., Strangler Fig, TDD, New) [TDD]: " PATTERN
        PATTERN=${PATTERN:-TDD}

        read -p "     📉 DoR (Baseline Metric) [None]: " BASELINE
        BASELINE=${BASELINE:-None}
        
        read -p "     ✅ DoD (Success Criteria/Forensic check): " SUCCESS_CRITERIA
        SUCCESS_CRITERIA=${SUCCESS_CRITERIA:-[ ] Action verified}

        # CoD / WSJF Calculation
        echo "     📊 WSJF Estimation (Fibonacci: 1, 2, 3, 5, 8, 13, 20)"
        
        read -p "       - User/Business Value (UBV): " UBV
        UBV=${UBV:-1}
        read -p "       - Time Criticality (TC): " TC
        TC=${TC:-1}
        read -p "       - Risk Reduction (RR): " RR
        RR=${RR:-1}
        
        read -p "       - Job Size (Duration): " SIZE
        SIZE=${SIZE:-1}
    fi
    
    COD=$((UBV + TC + RR))
    
    # Calculate WSJF with 1 decimal place using awk
    WSJF=$(awk "BEGIN {printf \"%.1f\", $COD / $SIZE}")
    
    echo "       -> CoD: $COD | Size: $SIZE | WSJF: $WSJF"

    # Generate ID
    ID="FLOW-R-$(date +%s)-$(echo $RANDOM | cut -c1-3)"
    
    echo "  ✨ Adding: $TASK_DESC"
    # Append to backlog with new columns: | ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
    echo "| $ID | $TASK_DESC | PENDING | $BUDGET | $PATTERN | $BASELINE | $SUCCESS_CRITERIA | $COD | $SIZE | $WSJF |" >> "$TARGET_BACKLOG"
done

# GitLab Sync Function
sync_to_gitlab() {
    local task_id="$1"
    local task_desc="$2"
    local budget="$3"
    local pattern="$4"
    local baseline="$5"
    local success_criteria="$6"
    
    # Assume env vars: GITLAB_TOKEN, GITLAB_PROJECT_ID, GITLAB_URL (default to https://gitlab.com)
    GITLAB_URL="${GITLAB_URL:-https://gitlab.com}"
    
    if [ -z "$GITLAB_TOKEN" ] || [ -z "$GITLAB_PROJECT_ID" ]; then
        echo "⚠️ GitLab sync skipped: Missing GITLAB_TOKEN or GITLAB_PROJECT_ID"
        return 1
    fi
    
    if [ -z "$task_desc" ] || [ -z "$success_criteria" ]; then
        echo "❌ Invalid input: Task description and success criteria required"
        return 1
    fi
    
    # Create GitLab issue
    response=$(curl --request POST \
         --url "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues" \
         --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
         --header "Content-Type: application/json" \
         --data "{
             \"title\": \"[$task_id] $task_desc\",
             \"description\": \"Budget: $budget\\nPattern: $pattern\\nBaseline: $baseline\\nSuccess Criteria: $success_criteria\",
             \"labels\": [\"agentic-flow\", \"$budget\"]
         }" --write-out "%{http_code}" --silent --output /dev/null)
    
    if [ "$response" -eq 201 ]; then
        echo "✅ Synced $task_id to GitLab"
        return 0
    else
        echo "❌ GitLab sync failed for $task_id (HTTP $response)"
        return 1
    fi
}

# After adding to backlog, sync to GitLab with validation
if sync_to_gitlab "$ID" "$TASK_DESC" "$BUDGET" "$PATTERN" "$BASELINE" "$SUCCESS_CRITERIA"; then
    echo "✅ Replenishment and sync complete"
else
    echo "⚠️ Replenishment complete but sync failed"
fi