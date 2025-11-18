#!/bin/bash
# Replenish Circle Backlogs from Retro Insights
# Usage: ./replenish_circle.sh

SOURCE_FILE="investing/agentic-flow/docs/QUICK_WINS.md"
TARGET_BACKLOG="investing/agentic-flow/circles/orchestrator/operational-orchestrator-roles/Orchestrator/backlog.md"

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
    read -p "     💰 Budget (CapEx/OpEx) [OpEx]: " BUDGET
    BUDGET=${BUDGET:-OpEx}
    
    read -p "     🧬 Method Pattern (e.g., Strangler Fig, TDD, New) [TDD]: " PATTERN
    PATTERN=${PATTERN:-TDD}

    read -p "     📉 DoR (Baseline Metric) [None]: " BASELINE
    BASELINE=${BASELINE:-None}
    
    read -p "     ✅ DoD (Success Criteria/Forensic check): " SUCCESS_CRITERIA
    SUCCESS_CRITERIA=${SUCCESS_CRITERIA:-[ ] Action verified}

    # Generate ID
    ID="FLOW-R-$(date +%s)-$(echo $RANDOM | cut -c1-3)"
    
    echo "  ✨ Adding: $TASK_DESC"
    echo "| $ID | $TASK_DESC | PENDING | $BUDGET | $PATTERN | $BASELINE | $SUCCESS_CRITERIA |" >> "$TARGET_BACKLOG"
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