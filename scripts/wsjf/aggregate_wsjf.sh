#!/usr/bin/env bash
set -euo pipefail

# Multi-Repo WSJF Aggregation
# Crawls /Users/shahroozbhopti/Documents/code for QUICK_WINS.md and .goalie/CONSOLIDATED_ACTIONS.yaml
# Generates rollup section appended to agentic-flow/docs/QUICK_WINS.md

CODE_DIR="/Users/shahroozbhopti/Documents/code"
OUTPUT_JSON="/tmp/wsjf_rollup_$(date +%Y%m%d_%H%M%S).json"
TARGET_DOC="$CODE_DIR/agentic-flow/docs/QUICK_WINS.md"

echo "🔍 Scanning repos under $CODE_DIR..."
echo "📊 Aggregating WSJF data..."

# Initialize JSON structure
cat > "$OUTPUT_JSON" <<'EOF'
{
  "scan_time": "",
  "repos": []
}
EOF

SCAN_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg time "$SCAN_TIME" '.scan_time = $time' "$OUTPUT_JSON" > "${OUTPUT_JSON}.tmp" && mv "${OUTPUT_JSON}.tmp" "$OUTPUT_JSON"

# Find repos with QUICK_WINS.md or .goalie/CONSOLIDATED_ACTIONS.yaml
for repo_dir in "$CODE_DIR"/*/ ; do
    [[ ! -d "$repo_dir" ]] && continue
    
    repo_name=$(basename "$repo_dir")
    [[ "$repo_name" == "node_modules" ]] && continue
    [[ "$repo_name" == ".git" ]] && continue
    
    qw_file="$repo_dir/docs/QUICK_WINS.md"
    goalie_file="$repo_dir/.goalie/CONSOLIDATED_ACTIONS.yaml"
    
    has_data=false
    item_count=0
    completed=0
    high_priority=0
    wsjf_sum=0
    
    # Check QUICK_WINS.md
    if [[ -f "$qw_file" ]]; then
        has_data=true
        item_count=$(grep -c "^- \[" "$qw_file" || true)
        completed=$(grep -c "^- \[x\]" "$qw_file" || true)
        high_priority=$(grep -c "priority: HIGH" "$qw_file" || true)
    fi
    
    # Check .goalie YAML
    if [[ -f "$goalie_file" ]]; then
        has_data=true
        yaml_items=$(grep -c "^  - key:" "$goalie_file" || true)
        yaml_done=$(grep -c "status: DONE" "$goalie_file" || true)
        yaml_high=$(grep -c "priority: HIGH" "$goalie_file" || true)
        
        item_count=$((item_count + yaml_items))
        completed=$((completed + yaml_done))
        high_priority=$((high_priority + yaml_high))
    fi
    
    [[ "$has_data" == false ]] && continue
    
    # Add repo entry to JSON
    jq --arg name "$repo_name" \
       --argjson items "$item_count" \
       --argjson comp "$completed" \
       --argjson high "$high_priority" \
       '.repos += [{
           name: $name,
           total_items: $items,
           completed: $comp,
           high_priority: $high,
           completion_pct: (if $items > 0 then (($comp * 100) / $items | floor) else 0 end)
       }]' "$OUTPUT_JSON" > "${OUTPUT_JSON}.tmp" && mv "${OUTPUT_JSON}.tmp" "$OUTPUT_JSON"
    
    echo "  ✅ $repo_name: $completed/$item_count complete, $high_priority HIGH priority"
done

# Generate markdown rollup section
ROLLUP_SECTION=$(cat <<'ROLLUP_END'

---

## 🌐 Multi-Repo WSJF Rollup

**Generated**: SCAN_TIME_PLACEHOLDER  
**Single Source of Truth** - Aggregated across all repos

### Repo Summary

REPO_TABLE_PLACEHOLDER

### Top WSJF Items Across Repos

HIGH_ITEMS_PLACEHOLDER

### Execution Priority

1. **NOW**: Complete all HIGH priority items in repos above 0% completion
2. **NEXT**: Target repos below 40% completion for quick wins  
3. **LATER**: Maintain repos above 80% completion

**Next Review**: Run `./scripts/wsjf/aggregate_wsjf.sh` after each completed item

ROLLUP_END
)

# Build repo table
REPO_TABLE="| Repo | Total | Done | % | HIGH |
|------|-------|------|---|------|"

while IFS= read -r line; do
    name=$(echo "$line" | jq -r '.name')
    total=$(echo "$line" | jq -r '.total_items')
    comp=$(echo "$line" | jq -r '.completed')
    pct=$(echo "$line" | jq -r '.completion_pct')
    high=$(echo "$line" | jq -r '.high_priority')
    
    status_icon="🔴"
    [[ $pct -ge 80 ]] && status_icon="🟢"
    [[ $pct -ge 40 && $pct -lt 80 ]] && status_icon="🟡"
    
    REPO_TABLE="$REPO_TABLE
| $name | $total | $comp | $status_icon $pct% | $high |"
done < <(jq -c '.repos[]' "$OUTPUT_JSON")

# Build HIGH items list
HIGH_ITEMS="**Repos with HIGH priority items:**"
high_count=$(jq '[.repos[] | select(.high_priority > 0)] | length' "$OUTPUT_JSON")

if [[ $high_count -gt 0 ]]; then
    while IFS= read -r line; do
        name=$(echo "$line" | jq -r '.name')
        high=$(echo "$line" | jq -r '.high_priority')
        pct=$(echo "$line" | jq -r '.completion_pct')
        HIGH_ITEMS="$HIGH_ITEMS
- **$name**: $high HIGH items ($pct% complete)"
    done < <(jq -c '.repos[] | select(.high_priority > 0)' "$OUTPUT_JSON")
else
    HIGH_ITEMS="$HIGH_ITEMS
- ✅ No HIGH priority items across all repos!"
fi

# Replace placeholders
ROLLUP_SECTION="${ROLLUP_SECTION//SCAN_TIME_PLACEHOLDER/$SCAN_TIME}"
ROLLUP_SECTION="${ROLLUP_SECTION//REPO_TABLE_PLACEHOLDER/$REPO_TABLE}"
ROLLUP_SECTION="${ROLLUP_SECTION//HIGH_ITEMS_PLACEHOLDER/$HIGH_ITEMS}"

# Check if rollup section already exists
if grep -q "## 🌐 Multi-Repo WSJF Rollup" "$TARGET_DOC" 2>/dev/null; then
    echo "📝 Updating existing rollup section..."
    # Remove old rollup and append new one
    sed -i.bak '/## 🌐 Multi-Repo WSJF Rollup/,$d' "$TARGET_DOC"
    echo "$ROLLUP_SECTION" >> "$TARGET_DOC"
else
    echo "📝 Appending new rollup section..."
    echo "$ROLLUP_SECTION" >> "$TARGET_DOC"
fi

echo ""
echo "✅ WSJF rollup complete!"
echo "📄 Updated: $TARGET_DOC"
echo "📊 Temporary data: $OUTPUT_JSON"
echo ""
echo "Summary:"
total_repos=$(jq '.repos | length' "$OUTPUT_JSON")
total_items=$(jq '[.repos[].total_items] | add' "$OUTPUT_JSON")
total_done=$(jq '[.repos[].completed] | add' "$OUTPUT_JSON")
echo "  - $total_repos repos scanned"
echo "  - $total_done/$total_items items complete across all repos"
