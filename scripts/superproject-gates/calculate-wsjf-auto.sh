#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# WSJF Auto-Calculator
# ==========================================
# Auto-calculates WSJF scores for backlog items
# Uses keyword detection to score CoD components
#
# Usage:
#   ./calculate-wsjf-auto.sh --circle <circle> [--auto-enrich]
#   ./calculate-wsjf-auto.sh --task "Fix urgent customer bug"
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKLOG_DIR="$PROJECT_ROOT/docs/backlogs"

# Default values
CIRCLE=""
AUTO_ENRICH=false
TASK_TEXT=""
DEBUG=false

# ==========================================
# Keyword Dictionaries for CoD Components
# ==========================================
declare -A UBV_KEYWORDS=(
    ["customer"]=3
    ["revenue"]=3
    ["user"]=2
    ["business"]=2
    ["value"]=2
    ["profit"]=3
    ["growth"]=2
    ["market"]=2
)

declare -A TC_KEYWORDS=(
    ["urgent"]=3
    ["blocker"]=3
    ["critical"]=3
    ["deadline"]=2
    ["asap"]=3
    ["immediate"]=3
    ["time-sensitive"]=2
    ["priority"]=2
)

declare -A RR_KEYWORDS=(
    ["security"]=3
    ["bug"]=2
    ["vulnerability"]=3
    ["risk"]=3
    ["outage"]=3
    ["downtime"]=3
    ["compliance"]=2
    ["regulatory"]=2
)

declare -A SIZE_KEYWORDS=(
    ["quick"]=1
    ["simple"]=1
    ["small"]=1
    ["large"]=5
    ["complex"]=5
    ["major"]=5
    ["minor"]=1
    ["medium"]=3
)

# ==========================================
# Functions
# ==========================================

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --circle <name>     Calculate WSJF for all tasks in circle backlog
    --auto-enrich       Update backlog.md files with calculated scores
    --task <text>       Calculate WSJF for a single task description
    --debug             Enable debug output
    -h, --help          Show this help message

Examples:
    # Calculate WSJF for all seeker backlog items
    $0 --circle seeker

    # Calculate and update assessor backlog
    $0 --circle assessor --auto-enrich

    # Calculate WSJF for a single task
    $0 --task "Fix urgent security bug in auth system"

EOF
    exit 0
}

# Keyword detection and scoring
score_component() {
    local text="$1"
    local component="$2"  # UBV, TC, RR, SIZE
    local keywords_ref="$3"
    
    local text_lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')
    local total_score=0
    local keyword_count=0
    
    # Iterate over keywords for this component
    case "$component" in
        UBV)
            for keyword in "${!UBV_KEYWORDS[@]}"; do
                if [[ "$text_lower" =~ $keyword ]]; then
                    total_score=$((total_score + UBV_KEYWORDS[$keyword]))
                    keyword_count=$((keyword_count + 1))
                    [ "$DEBUG" = true ] && echo "  [UBV] Detected: $keyword (+${UBV_KEYWORDS[$keyword]})"
                fi
            done
            ;;
        TC)
            for keyword in "${!TC_KEYWORDS[@]}"; do
                if [[ "$text_lower" =~ $keyword ]]; then
                    total_score=$((total_score + TC_KEYWORDS[$keyword]))
                    keyword_count=$((keyword_count + 1))
                    [ "$DEBUG" = true ] && echo "  [TC] Detected: $keyword (+${TC_KEYWORDS[$keyword]})"
                fi
            done
            ;;
        RR)
            for keyword in "${!RR_KEYWORDS[@]}"; do
                if [[ "$text_lower" =~ $keyword ]]; then
                    total_score=$((total_score + RR_KEYWORDS[$keyword]))
                    keyword_count=$((keyword_count + 1))
                    [ "$DEBUG" = true ] && echo "  [RR] Detected: $keyword (+${RR_KEYWORDS[$keyword]})"
                fi
            done
            ;;
        SIZE)
            for keyword in "${!SIZE_KEYWORDS[@]}"; do
                if [[ "$text_lower" =~ $keyword ]]; then
                    total_score=$((total_score + SIZE_KEYWORDS[$keyword]))
                    keyword_count=$((keyword_count + 1))
                    [ "$DEBUG" = true ] && echo "  [SIZE] Detected: $keyword (+${SIZE_KEYWORDS[$keyword]})"
                fi
            done
            ;;
    esac
    
    # Default scores if no keywords detected
    if [ $keyword_count -eq 0 ]; then
        case "$component" in
            UBV) total_score=5 ;;
            TC) total_score=5 ;;
            RR) total_score=5 ;;
            SIZE) total_score=3 ;;
        esac
    fi
    
    # Cap scores at 0-10
    [ $total_score -gt 10 ] && total_score=10
    [ $total_score -lt 0 ] && total_score=0
    
    echo "$total_score"
}

# Calculate confidence based on keyword density
calculate_confidence() {
    local text="$1"
    local ubv_score="$2"
    local tc_score="$3"
    local rr_score="$4"
    local size_score="$5"
    
    local text_lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')
    local keyword_hits=0
    local total_keywords=0
    
    # Count all keywords detected
    for keyword in "${!UBV_KEYWORDS[@]}" "${!TC_KEYWORDS[@]}" "${!RR_KEYWORDS[@]}" "${!SIZE_KEYWORDS[@]}"; do
        total_keywords=$((total_keywords + 1))
        if [[ "$text_lower" =~ $keyword ]]; then
            keyword_hits=$((keyword_hits + 1))
        fi
    done
    
    # Baseline: 50%
    # Add up to 40% based on keyword density
    local keyword_rate=$(awk "BEGIN {printf \"%.2f\", $keyword_hits / $total_keywords}")
    local confidence=$(awk "BEGIN {printf \"%.2f\", 0.50 + (0.40 * $keyword_rate)}")
    
    # Boost confidence if high-signal keywords present
    if [[ "$text_lower" =~ (urgent|blocker|critical|security|revenue) ]]; then
        confidence=$(awk "BEGIN {printf \"%.2f\", $confidence + 0.10}")
    fi
    
    # Cap at 0.90
    if (( $(awk "BEGIN {print ($confidence > 0.90)}") )); then
        confidence=0.90
    fi
    
    echo "$confidence"
}

# Calculate WSJF score
calculate_wsjf() {
    local task_text="$1"
    
    # Handle empty/missing task text gracefully
    if [ -z "$task_text" ]; then
        task_text="[No description provided]"
        echo "⚠️  Warning: Empty task description - using defaults"
    fi
    
    echo "📊 Calculating WSJF for: \"$task_text\""
    [ "$DEBUG" = true ] && echo "Debug mode enabled - showing keyword detection..."
    
    # Score each CoD component (suppress debug output for variable assignment)
    local ubv=$(score_component "$task_text" "UBV" "UBV_KEYWORDS" 2>/dev/null | tail -1)
    local tc=$(score_component "$task_text" "TC" "TC_KEYWORDS" 2>/dev/null | tail -1)
    local rr=$(score_component "$task_text" "RR" "RR_KEYWORDS" 2>/dev/null | tail -1)
    local size=$(score_component "$task_text" "SIZE" "SIZE_KEYWORDS" 2>/dev/null | tail -1)
    
    # Prevent division by zero
    if [ "$size" -le 0 ]; then
        size=3  # Default medium size
    fi
    
    # Show debug output if enabled
    if [ "$DEBUG" = true ]; then
        score_component "$task_text" "UBV" "UBV_KEYWORDS" >/dev/null
        score_component "$task_text" "TC" "TC_KEYWORDS" >/dev/null
        score_component "$task_text" "RR" "RR_KEYWORDS" >/dev/null
        score_component "$task_text" "SIZE" "SIZE_KEYWORDS" >/dev/null
    fi
    
    # Calculate CoD (Cost of Delay)
    local cod=$(awk "BEGIN {printf \"%.2f\", ($ubv + $tc + $rr)}")
    
    # Calculate WSJF = CoD / Size
    local wsjf=$(awk "BEGIN {printf \"%.2f\", $cod / $size}")
    
    # Calculate confidence
    local confidence=$(calculate_confidence "$task_text" "$ubv" "$tc" "$rr" "$size")
    
    # Output results
    cat << EOF

Results:
  User Business Value (UBV): $ubv / 10
  Time Criticality (TC):     $tc / 10
  Risk Reduction (RR):       $rr / 10
  Job Size:                  $size / 10
  
  Cost of Delay (CoD):       $cod
  WSJF Score:                $wsjf
  Confidence:                $(awk "BEGIN {printf \"%.0f%%\", $confidence * 100}")

EOF
    
    # Return as JSON for programmatic use
    echo "{\"ubv\":$ubv,\"tc\":$tc,\"rr\":$rr,\"size\":$size,\"cod\":$cod,\"wsjf\":$wsjf,\"confidence\":$confidence}"
}

# Process circle backlog
process_circle_backlog() {
    local circle="$1"
    local backlog_file="$BACKLOG_DIR/$circle/backlog.md"
    
    if [ ! -f "$backlog_file" ]; then
        echo "⚠️  No backlog found for $circle"
        echo "Expected: $backlog_file"
        
        if [ "$AUTO_ENRICH" = true ]; then
            echo "📝 Creating backlog structure..."
            mkdir -p "$BACKLOG_DIR/$circle"
            cat > "$backlog_file" << 'EOF'
# Circle Backlog

| ID | Task | Status | UBV | TC | RR | Size | WSJF | Confidence | DoR | DoD |
|----|------|--------|-----|----|----|------|------|------------|-----|-----|
| 001 | Example task | todo | - | - | - | - | - | - | [ ] | [ ] |

**Legend:**
- UBV: User Business Value (0-10)
- TC: Time Criticality (0-10)
- RR: Risk Reduction (0-10)
- Size: Job Size (0-10, lower is smaller)
- WSJF: Weighted Shortest Job First score (higher is better)
- Confidence: Auto-calculation confidence (50-90%)
EOF
            echo "✅ Created template backlog at $backlog_file"
            echo "💡 Add tasks and re-run with --auto-enrich to calculate WSJF"
        fi
        return 1
    fi
    
    echo "📖 Processing backlog: $circle"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Parse markdown table and calculate WSJF for each task
    local task_count=0
    local line_num=0
    
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        
        # Skip header/separator lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ "$line" =~ ^\|[-:]+\|.*$ ]] && continue
        [[ "$line" =~ ^\*\*.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Parse task line (| ID | Task | Status | ...)
        if [[ "$line" =~ ^\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\| ]]; then
            local task_id="${BASH_REMATCH[1]}"
            local task_text="${BASH_REMATCH[2]}"
            
            # Trim whitespace
            task_id=$(echo "$task_id" | xargs)
            task_text=$(echo "$task_text" | xargs)
            
            # Skip headers, separators, and example tasks
            [[ "$task_id" == "ID" ]] && continue
            [[ "$task_id" =~ ^[-:]+$ ]] && continue
            [[ "$task_text" =~ [Ee]xample ]] && continue
            [[ -z "$task_text" ]] && continue
            
            task_count=$((task_count + 1))
            
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Task $task_count (ID: $task_id): $task_text"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            # Calculate WSJF and display results
            calculate_wsjf "$task_text"
            local result_json=$(calculate_wsjf "$task_text" 2>/dev/null | tail -1)
            
            if [ "$AUTO_ENRICH" = true ]; then
                # TODO: Update backlog.md with calculated values
                echo ""
                echo "📝 Auto-enrichment: Would update line $line_num with WSJF data"
                echo "   JSON: $result_json"
            fi
        fi
    done < "$backlog_file"
    
    if [ $task_count -eq 0 ]; then
        echo "⚠️  No tasks found in backlog"
    else
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Processed $task_count tasks"
    fi
}

# ==========================================
# Main
# ==========================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --circle)
                CIRCLE="$2"
                shift 2
                ;;
            --auto-enrich)
                AUTO_ENRICH=true
                shift
                ;;
            --task)
                TASK_TEXT="$2"
                shift 2
                ;;
            --debug)
                DEBUG=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                echo "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    # Validate inputs
    # Allow empty TASK_TEXT but require --task flag was set
    if [ -z "$CIRCLE" ] && [ "${TASK_TEXT+set}" != "set" ]; then
        echo "❌ Error: Must specify --circle or --task"
        usage
    fi
    
    if [ -n "$CIRCLE" ] && [ "${TASK_TEXT+set}" = "set" ]; then
        echo "❌ Error: Cannot specify both --circle and --task"
        usage
    fi
    
    # Execute
    if [ "${TASK_TEXT+set}" = "set" ]; then
        # Single task calculation (even if empty string)
        calculate_wsjf "$TASK_TEXT"
    else
        # Circle backlog processing
        process_circle_backlog "$CIRCLE"
    fi
}

main "$@"
