#!/bin/bash
# Daily Standup Script
# Aggregates metrics from all Circle backlogs to drive Continuous Improvement.

BASE_DIR="investing/agentic-flow/circles"
TOTAL_ITEMS=0
OPEX_ITEMS=0
PENDING_COUNT=0
IN_PROGRESS_COUNT=0
DONE_COUNT=0

echo "📊 Daily Standup Report - $(date)"
# GitLab Sync Function
sync_report_to_gitlab() {
    local report="$1"
    
    # Assume env vars: GITLAB_TOKEN, GITLAB_PROJECT_ID, GITLAB_URL
    GITLAB_URL="${GITLAB_URL:-https://gitlab.com}"
    
    if [ -z "$GITLAB_TOKEN" ] || [ -z "$GITLAB_PROJECT_ID" ]; then
        echo "⚠️ GitLab sync skipped: Missing GITLAB_TOKEN or GITLAB_PROJECT_ID"
        return 1
    fi
    
    # Create daily standup issue or update existing
    local title="Daily Standup - $(date +%Y-%m-%d)"
    response=$(curl --request POST \
         --url "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues" \
         --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
         --header "Content-Type: application/json" \
         --data "{
             \"title\": \"$title\",
             \"description\": \"$report\",
             \"labels\": [\"standup\", \"agentic-flow\"]
         }" --write-out "%{http_code}" --silent --output /dev/null)
    
    if [ "$response" -eq 201 ]; then
        echo "✅ Standup report synced to GitLab"
        return 0
    else
        echo "❌ GitLab sync failed (HTTP $response)"
        return 1
    fi
}

# After generating report, sync it
REPORT=$(cat <<EOT
📊 Daily Standup Report - $(date)
======================================

📈 Metrics:
  • Total Items: $TOTAL_ITEMS
  • Status Breakdown:
    - PENDING:     $PENDING_COUNT
    - IN_PROGRESS: $IN_PROGRESS_COUNT
    - DONE:        $DONE_COUNT
  • OpEx Ratio:    $OPEX_RATIO% (Target < 40%)

EOT
)

if (( $(echo "$OPEX_RATIO > 40" | bc -l) )); then
    REPORT="$REPORT
⚠️  ALERT: OpEx Ratio is high! Consider prioritizing CapEx (Growth) items."
else
    REPORT="$REPORT
✅ Healthy Budget Mix."
fi

REPORT="$REPORT
======================================"

echo "$REPORT"
sync_report_to_gitlab "$REPORT"

# Find all backlog.md files
while IFS= read -r backlog_file; do
    # echo "Processing $backlog_file..." # Debug output
    
    # Read line by line, skipping header/separator lines which start with | ID | or |---| or are empty/comments
    while IFS= read -r line; do
        # Skip headers and empty lines
        if [[ "$line" =~ ^\|[[:space:]]*ID ]] || [[ "$line" =~ ^\|---| ]] || [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
            continue
        fi
        
        # Check if it's a table row (starts with |)
        if [[ "$line" =~ ^\| ]]; then
            ((TOTAL_ITEMS++))
            
            # Check Budget (assuming column 4, but simple grep is safer for now unless strict format)
            # Case insensitive grep for OpEx
            if echo "$line" | grep -q "OpEx"; then
                ((OPEX_ITEMS++))
            fi

            # Check Status (assuming column 3)
            if echo "$line" | grep -q "PENDING"; then
                ((PENDING_COUNT++))
            elif echo "$line" | grep -q "IN_PROGRESS"; then
                ((IN_PROGRESS_COUNT++))
            elif echo "$line" | grep -q "DONE" || echo "$line" | grep -q "COMPLETE"; then
                ((DONE_COUNT++))
            fi
        fi
    done < "$backlog_file"
    
done < <(find "$BASE_DIR" -name "backlog.md")

# Calculate OpEx Ratio
if [ "$TOTAL_ITEMS" -gt 0 ]; then
    # Bash doesn't support floating point easily, using bc or awk
    OPEX_RATIO=$(awk "BEGIN {printf \"%.2f\", ($OPEX_ITEMS / $TOTAL_ITEMS) * 100}")
else
    OPEX_RATIO=0
fi

echo "📈 Metrics:"
echo "  • Total Items: $TOTAL_ITEMS"
echo "  • Status Breakdown:"
echo "    - PENDING:     $PENDING_COUNT"
echo "    - IN_PROGRESS: $IN_PROGRESS_COUNT"
echo "    - DONE:        $DONE_COUNT"
echo "  • OpEx Ratio:    $OPEX_RATIO% (Target < 40%)"

# Alerting Logic
if (( $(echo "$OPEX_RATIO > 40" | bc -l) )); then
    echo ""
    echo "⚠️  ALERT: OpEx Ratio is high! Consider prioritizing CapEx (Growth) items."
else
    echo ""
    echo "✅ Healthy Budget Mix."
fi

echo "======================================"
