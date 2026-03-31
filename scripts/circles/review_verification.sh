#!/bin/bash
# Review Verification Script
# Verifies completed items in backlogs using forensic success criteria
# Syncs verification results to GitLab

BASE_DIR="investing/agentic-flow/circles"
VERIFICATION_LOG=".goalie/verification_log.jsonl"

# GitLab Sync Function
sync_verification_to_gitlab() {
    local item_id="$1"
    local status="$2"
    local evidence="$3"
    
    GITLAB_URL="${GITLAB_URL:-https://gitlab.com}"
    
    if [ -z "$GITLAB_TOKEN" ] || [ -z "$GITLAB_PROJECT_ID" ]; then
        echo "⚠️ GitLab sync skipped: Missing GITLAB_TOKEN or GITLAB_PROJECT_ID"
        return 1
    fi
    
    # Find issue by title (assuming title has item_id)
    ISSUE_IID=$(curl --silent --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues?search=$item_id" | \
        jq '.[0].iid // empty')
    
    if [ -z "$ISSUE_IID" ]; then
        echo "⚠️ No GitLab issue found for $item_id"
        return 1
    fi
    
    # Add note with verification result
    response=$(curl --request POST \
         --url "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues/$ISSUE_IID/notes" \
         --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
         --header "Content-Type: application/json" \
         --data "{
             \"body\": \"Verification: $status\\nEvidence: $evidence\"
         }" --write-out "%{http_code}" --silent --output /dev/null)
    
    if [ "$response" -eq 201 ]; then
        echo "✅ Verification synced to GitLab for $item_id"
        return 0
    else
        echo "❌ GitLab sync failed for $item_id (HTTP $response)"
        return 1
    fi
}

echo "🔍 Running Review Verification - $(date)"
echo "======================================"

COMPLETED_COUNT=0
VERIFIED_COUNT=0
FAILED_COUNT=0

# Find all backlog.md files
find "$BASE_DIR" -name "backlog.md" | while read backlog_file; do
    if [ ! -f "$backlog_file" ]; then
        echo "⚠️ Skipping invalid file: $backlog_file"
        continue
    fi
    
    echo "📋 Processing $backlog_file"
    
    # Parse table rows
    awk 'BEGIN {FS="|"}
         NR>2 && /COMPLETE/ {
             gsub(/^[ \t]+|[ \t]+$/, "", $0)
             id = $2; gsub(/^[ \t]+|[ \t]+$/, "", id)
             task = $3; gsub(/^[ \t]+|[ \t]+$/, "", task)
             criteria = $7; gsub(/^[ \t]+|[ \t]+$/, "", criteria)
             if (criteria != "") {
                 print id "||" task "||" criteria
             }
         }' "$backlog_file" | while IFS='||' read -r id task criteria; do
        ((COMPLETED_COUNT++))
        
        if [ -z "$criteria" ]; then
            echo "  ⚠️ Skipping $id: No criteria defined"
            continue
        fi
        
        echo "  🔎 Verifying $id: $task"
        echo "     Criteria: $criteria"
        
        # Run forensic check
        evidence=$(eval "$criteria" 2>&1)
        if [ $? -eq 0 ] && [ ! -z "$evidence" ]; then
            status="VERIFIED"
            ((VERIFIED_COUNT++))
        else
            status="FAILED"
            ((FAILED_COUNT++))
        fi
        
        echo "     Result: $status"
        echo "     Evidence: $evidence"
        
        # Log to verification log
        echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"id\": \"$id\", \"status\": \"$status\", \"evidence\": \"$evidence\"}" >> "$VERIFICATION_LOG"
        
        # Sync to GitLab
        sync_verification_to_gitlab "$id" "$status" "$evidence"
    done
done

echo ""
echo "📊 Verification Summary:"
echo "  • Completed Items: $COMPLETED_COUNT"
echo "  • Verified: $VERIFIED_COUNT"
echo "  • Failed: $FAILED_COUNT"
echo "======================================"

# Alert if failures
if [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️  $FAILED_COUNT verifications failed! Check logs."
    exit 1
else
    echo "✅ All verifications passed."
fi