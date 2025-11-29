#!/bin/bash
# Retro Insights Tracking and Sync Script
# Processes insights_log.jsonl, tags actionable retros, and syncs to GitLab

INSIGHTS_LOG="investing/agentic-flow/.goalie/insights_log.jsonl"
TAGGED_INSIGHTS=".goalie/tagged_insights.jsonl"

# GitLab Sync Function
sync_insight_to_gitlab() {
    local insight_type="$1"
    local insight_text="$2"
    local timestamp="$3"
    
    GITLAB_URL="${GITLAB_URL:-https://gitlab.com}"
    
    if [ -z "$GITLAB_TOKEN" ] || [ -z "$GITLAB_PROJECT_ID" ]; then
        echo "⚠️ GitLab sync skipped: Missing GITLAB_TOKEN or GITLAB_PROJECT_ID"
        return 1
    fi
    
    if [ -z "$insight_text" ]; then
        echo "❌ Invalid insight: Empty text"
        return 1
    fi
    
    # Create GitLab issue for insight
    response=$(curl --request POST \
         --url "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues" \
         --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
         --header "Content-Type: application/json" \
         --data "{
             \"title\": \"Retro Insight [$insight_type] - $timestamp\",
             \"description\": \"$insight_text\",
             \"labels\": [\"retro\", \"insight\", \"$insight_type\"]
         }" --write-out "%{http_code}" --silent --output /dev/null)
    
    if [ "$response" -eq 201 ]; then
        echo "✅ Insight synced to GitLab: $insight_text"
        return 0
    else
        echo "❌ GitLab sync failed (HTTP $response)"
        return 1
    fi
}

echo "🔄 Processing Retro Insights - $(date)"
echo "======================================"

if [ ! -f "$INSIGHTS_LOG" ]; then
    echo "❌ Insights log not found!"
    exit 1
fi

TAGGED_COUNT=0
SYNCED_COUNT=0

# Process each line in insights_log.jsonl
while read -r line; do
    # Check if it's a retro insight
    if echo "$line" | grep -q '"type": "retro_insight"'; then
        timestamp=$(echo "$line" | jq -r '.timestamp // empty')
        text=$(echo "$line" | jq -r '.text // empty')
        
        if [ -z "$text" ]; then
            echo "⚠️ Skipping empty insight"
            continue
        fi
        
        # Tag insight (simple categorization)
        if echo "$text" | grep -iq "performance\|optimization"; then
            tag="performance"
        elif echo "$text" | grep -iq "error\|bug\|fail"; then
            tag="bug"
        elif echo "$text" | grep -iq "process\|workflow"; then
            tag="process"
        else
            tag="general"
        fi
        
        echo "  📝 Insight: $text"
        echo "     Tag: $tag"
        
        # Check for duplicate in tagged_insights
        if grep -q "$text" "$TAGGED_INSIGHTS" 2>/dev/null; then
            echo "     ⚠️ Skipping duplicate"
            continue
        fi
        
        # Log tagged insight
        echo "{\"timestamp\": \"$timestamp\", \"type\": \"tagged_retro\", \"tag\": \"$tag\", \"text\": \"$text\"}" >> "$TAGGED_INSIGHTS"
        ((TAGGED_COUNT++))
        
        # Sync to GitLab
        if sync_insight_to_gitlab "$tag" "$text" "$timestamp"; then
            ((SYNCED_COUNT++))
        fi
    fi
done < "$INSIGHTS_LOG"

echo ""
echo "📊 Summary:"
echo "  • Tagged Insights: $TAGGED_COUNT"
echo "  • Synced to GitLab: $SYNCED_COUNT"
echo "======================================"

if [ $TAGGED_COUNT -eq 0 ]; then
    echo "ℹ️ No new retro insights found."
else
    echo "✅ Processing complete."
fi