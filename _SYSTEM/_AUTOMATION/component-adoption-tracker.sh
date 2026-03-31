#!/bin/bash
# component-adoption-tracker.sh - Track ROBUST component adoption over time
# Monitors which components are implemented and generates adoption metrics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
TRACKING_FILE="/tmp/component-adoption.json"
HISTORY_FILE="/tmp/adoption-history.jsonl"

# ROBUST components to track
declare -A COMPONENTS=(
    ["pre_flight"]="check_prerequisites|Pre-flight Checks|Validate dependencies and environment"
    ["bounded_reasoning"]="create_contract|Bounded Reasoning|Declare process bounds upfront"
    ["eta_tracking"]="update_progress|ETA Tracking|Emit progress state changes"
    ["tdd_logging"]="log_tdd|TDD Logging|Log red-green-refactor cycles"
    ["process_cleanup"]="wait.*PID|Process Cleanup|Explicit wait for process termination"
    ["timeout_guards"]="timeout|Timeout Guards|Enforce time bounds"
    ["dependency_injection"]="source.*framework|Dependency Injection|Make dependencies explicit"
    ["progress_hooks"]="emit_progress_update|Progress Hooks|Hook into state changes"
)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize tracking
init_tracking() {
    if [[ ! -f "$TRACKING_FILE" ]]; then
        echo '{"components": {}, "last_updated": null}' > "$TRACKING_FILE"
    fi
}

# Check component implementation
check_component() {
    local component_id="$1"
    local pattern="$2"
    local file="$3"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "true"
    else
        echo "false"
    fi
}

# Update component status
update_component_status() {
    local script_file="$PROJECT_ROOT/scripts/orchestrators/cascade-tunnel.sh"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Read current tracking data
    local tracking_data=$(cat "$TRACKING_FILE")
    
    # Update each component
    for component_id in "${!COMPONENTS[@]}"; do
        IFS='|' read -r pattern name description <<< "${COMPONENTS[$component_id]}"
        
        local implemented=$(check_component "$component_id" "$pattern" "$script_file")
        
        # Update tracking data
        tracking_data=$(echo "$tracking_data" | jq \
            --arg comp "$component_id" \
            --arg impl "$implemented" \
            --arg ts "$timestamp" \
            '.components[$comp] = {
                "name": $name,
                "description": $description,
                "implemented": ($impl == "true"),
                "last_seen": $ts
            } | .last_updated = $ts')
    done
    
    # Save updated data
    echo "$tracking_data" > "$TRACKING_FILE"
    
    # Add to history
    local adoption_pct=$(calculate_adoption_percentage "$tracking_data")
    echo "{\"timestamp\": \"$timestamp\", \"adoption_percentage\": $adoption_pct}" >> "$HISTORY_FILE"
}

# Calculate adoption percentage
calculate_adoption_percentage() {
    local data="$1"
    local total=$(echo "$data" | jq '.components | length')
    local implemented=$(echo "$data" | jq '[.components[] | select(.implemented)] | length')
    
    if [[ $total -gt 0 ]]; then
        echo "scale=2; $implemented * 100 / $total" | bc -l
    else
        echo "0"
    fi
}

# Show current adoption status
show_adoption_status() {
    local tracking_data=$(cat "$TRACKING_FILE")
    local adoption_pct=$(calculate_adoption_percentage "$tracking_data")
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${BLUE}  ROBUST COMPONENT ADOPTION TRACKER${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    printf "%-20s %-12s %-40s\n" "COMPONENT" "STATUS" "DESCRIPTION"
    echo "─────────────────────────────────────────────────────────────────"
    
    # Show each component
    for component_id in "${!COMPONENTS[@]}"; do
        IFS='|' read -r pattern name description <<< "${COMPONENTS[$component_id]}"
        
        local implemented=$(echo "$tracking_data" | jq -r ".components[\"$component_id\"].implemented // false")
        
        if [[ "$implemented" == "true" ]]; then
            status="${GREEN}✅ IMPLEMENTED${NC}"
        else
            status="${RED}❌ MISSING${NC}"
        fi
        
        printf "%-20s %-12s %-40s\n" "$name" "$status" "$description"
    done
    
    echo ""
    echo -e "${BLUE}Overall Adoption: ${adoption_pct}%${NC}"
    
    # Show trend
    if [[ -f "$HISTORY_FILE" ]] && [[ $(wc -l < "$HISTORY_FILE") -gt 1 ]]; then
        echo ""
        echo "Adoption Trend (last 5 updates):"
        tail -5 "$HISTORY_FILE" | while read -r line; do
            local ts=$(echo "$line" | jq -r '.timestamp')
            local pct=$(echo "$line" | jq '.adoption_percentage')
            echo "  $(date -d "$ts" '+%Y-%m-%d %H:%M'): ${pct}%"
        done
    fi
    
    echo ""
}

# Generate adoption report
generate_report() {
    local report_file="$PROJECT_ROOT/docs/ROBUST-ADOPTION-REPORT.md"
    
    mkdir -p "$(dirname "$report_file")"
    
    local tracking_data=$(cat "$TRACKING_FILE")
    local adoption_pct=$(calculate_adoption_percentage "$tracking_data")
    
    cat > "$report_file" << EOF
# ROBUST Component Adoption Report

Generated: $(date -u +"%Y-%m-%d %H:%M:%SZ")

## Current Adoption: ${adoption_pct}%

## Component Status

| Component | Status | Description |
|-----------|--------|-------------|
EOF
    
    # Add each component to report
    for component_id in "${!COMPONENTS[@]}"; do
        IFS='|' read -r pattern name description <<< "${COMPONENTS[$component_id]}"
        
        local implemented=$(echo "$tracking_data" | jq -r ".components[\"$component_id\"].implemented // false")
        
        if [[ "$implemented" == "true" ]]; then
            status="✅ Implemented"
        else
            status="❌ Missing"
        fi
        
        echo "| $name | $status | $description |" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## Implementation Priority

Components are prioritized by impact on build quality:

1. **Pre-flight Checks** (20%) - Prevents runtime errors
2. **Bounded Reasoning** (20%) - Provides predictability
3. **ETA Tracking** (20%) - Enables progress visibility
4. **TDD Logging** (20%) - Supports continuous improvement
5. **Process Cleanup** (20%) - Ensures graceful shutdown

## Next Steps

EOF
    
    if [[ $(echo "$adoption_pct < 100" | bc -l) -eq 1 ]]; then
        echo "### Missing Components:" >> "$report_file"
        echo "" >> "$report_file"
        
        for component_id in "${!COMPONENTS[@]}"; do
            IFS='|' read -r pattern name description <<< "${COMPONENTS[$component_id]}"
            
            local implemented=$(echo "$tracking_data" | jq -r ".components[\"$component_id\"].implemented // false")
            
            if [[ "$implemented" != "true" ]]; then
                echo "- [ ] **$name**: $description" >> "$report_file"
            fi
        done
    else
        echo "✅ All ROBUST components implemented!" >> "$report_file"
    fi
    
    echo "Report saved to: $report_file"
}

# Check specific script
check_script() {
    local script_path="$1"
    
    if [[ ! -f "$script_path" ]]; then
        echo "Script not found: $script_path"
        return 1
    fi
    
    echo ""
    echo "Checking: $script_path"
    echo "─────────────────────────────────────────────────────────────────"
    
    for component_id in "${!COMPONENTS[@]}"; do
        IFS='|' read -r pattern name description <<< "${COMPONENTS[$component_id]}"
        
        if grep -q "$pattern" "$script_path" 2>/dev/null; then
            echo "✅ $name"
        else
            echo "❌ $name"
        fi
    done
    
    echo ""
}

# Main execution
case "${1:-status}" in
    "update")
        update_component_status
        ;;
    "status")
        init_tracking
        show_adoption_status
        ;;
    "report")
        init_tracking
        update_component_status
        generate_report
        ;;
    "check")
        check_script "$2"
        ;;
    "reset")
        rm -f "$TRACKING_FILE" "$HISTORY_FILE"
        echo "Tracking data reset"
        ;;
    *)
        echo "Usage: $0 {update|status|report|check|reset} [script]"
        exit 1
        ;;
esac
