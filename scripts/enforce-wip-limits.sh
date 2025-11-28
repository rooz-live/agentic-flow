#!/usr/bin/env bash
#
# Enforce Kanban WIP Limits - WSJF 4.2
# Prevents backlog explosion by enforcing hard limits on active work items
#
# Usage: ./scripts/enforce-wip-limits.sh [--check|--enforce|--report]
#

set -euo pipefail

# Configuration (adjust based on team capacity)
declare -A WIP_LIMITS=(
    ["now"]=5          # Active work limit
    ["next"]=10        # Ready queue limit
    ["later"]=20       # Backlog limit
    ["total"]=3500     # Total action items ceiling
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
DOC_QUERY="$SCRIPT_DIR/doc_query.py"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

check_prerequisites() {
    if [[ ! -f "$DOC_QUERY" ]]; then
        echo -e "${RED}Error: doc_query.py not found${NC}"
        exit 1
    fi
    
    if ! command -v python3 &>/dev/null; then
        echo -e "${RED}Error: python3 not found${NC}"
        exit 1
    fi
}

count_action_items() {
    python3 "$DOC_QUERY" --action-items --json 2>/dev/null | \
        python3 -c "import sys, json; print(len(json.load(sys.stdin)))"
}

count_by_category() {
    local category=$1
    python3 "$DOC_QUERY" "$category" --json 2>/dev/null | \
        python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('matches_found', 0))" 2>/dev/null || echo "0"
}

check_limits() {
    echo "🔍 Checking WIP Limits..."
    echo ""
    
    local total_items=$(count_action_items)
    local now_items=$(count_by_category "\\[now\\]|wsjf-now")
    local next_items=$(count_by_category "\\[next\\]|wsjf-next")
    local later_items=$(count_by_category "\\[later\\]|wsjf-later")
    
    local violations=0
    
    # Check total limit
    if [[ $total_items -gt ${WIP_LIMITS[total]} ]]; then
        echo -e "${RED}❌ Total WIP Violation: $total_items > ${WIP_LIMITS[total]}${NC}"
        ((violations++))
    else
        echo -e "${GREEN}✅ Total: $total_items / ${WIP_LIMITS[total]}${NC}"
    fi
    
    # Check category limits
    if [[ $now_items -gt ${WIP_LIMITS[now]} ]]; then
        echo -e "${RED}❌ Now WIP Violation: $now_items > ${WIP_LIMITS[now]}${NC}"
        ((violations++))
    else
        echo -e "${GREEN}✅ Now: $now_items / ${WIP_LIMITS[now]}${NC}"
    fi
    
    if [[ $next_items -gt ${WIP_LIMITS[next]} ]]; then
        echo -e "${YELLOW}⚠️  Next Queue High: $next_items > ${WIP_LIMITS[next]}${NC}"
        ((violations++))
    else
        echo -e "${GREEN}✅ Next: $next_items / ${WIP_LIMITS[next]}${NC}"
    fi
    
    if [[ $later_items -gt ${WIP_LIMITS[later]} ]]; then
        echo -e "${YELLOW}⚠️  Backlog High: $later_items > ${WIP_LIMITS[later]}${NC}"
        ((violations++))
    else
        echo -e "${GREEN}✅ Later: $later_items / ${WIP_LIMITS[later]}${NC}"
    fi
    
    echo ""
    return $violations
}

generate_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local total_items=$(count_action_items)
    
    cat > "$GOALIE_DIR/wip_report_$(date +%Y%m%d_%H%M%S).yaml" <<EOF
---
timestamp: "$timestamp"
wip_limits:
  configured:
    now: ${WIP_LIMITS[now]}
    next: ${WIP_LIMITS[next]}
    later: ${WIP_LIMITS[later]}
    total: ${WIP_LIMITS[total]}
  current:
    total_items: $total_items
    now_items: $(count_by_category "\\[now\\]|wsjf-now")
    next_items: $(count_by_category "\\[next\\]|wsjf-next")
    later_items: $(count_by_category "\\[later\\]|wsjf-later")
violations:
  total_exceeded: $(( total_items > WIP_LIMITS[total] ? 1 : 0 ))
  categories_exceeded: $(check_limits > /dev/null 2>&1; echo $?)
recommendations:
  - "Archive lowest WSJF items from 'later' queue"
  - "Complete or close items in 'now' before starting new work"
  - "Review and consolidate duplicate action items"
EOF
    
    echo -e "${GREEN}✅ Report generated: $GOALIE_DIR/wip_report_$(date +%Y%m%d_%H%M%S).yaml${NC}"
}

enforce_limits() {
    echo "🛡️  Enforcing WIP Limits (Dry Run)..."
    echo ""
    
    local total_items=$(count_action_items)
    
    if [[ $total_items -gt ${WIP_LIMITS[total]} ]]; then
        local excess=$((total_items - WIP_LIMITS[total]))
        echo -e "${YELLOW}⚠️  $excess items over limit${NC}"
        echo ""
        echo "Recommended Actions:"
        echo "  1. Archive $excess lowest priority items"
        echo "  2. Consolidate duplicate action items"
        echo "  3. Close completed items"
        echo ""
        echo "Run: git mv <lowest-priority-files> archive/backlog-$(date +%Y-%m)/"
    else
        echo -e "${GREEN}✅ Within limits, no enforcement needed${NC}"
    fi
}

show_usage() {
    cat <<EOF
Usage: $0 [--check|--enforce|--report]

Options:
  --check     Check current WIP against limits (default)
  --enforce   Suggest enforcement actions (dry run)
  --report    Generate YAML report with recommendations
  --help      Show this help message

Examples:
  $0                    # Check current WIP
  $0 --enforce          # Get enforcement recommendations
  $0 --report           # Generate detailed report

WIP Limits (configured):
  Now (active):    ${WIP_LIMITS[now]} items
  Next (ready):    ${WIP_LIMITS[next]} items
  Later (backlog): ${WIP_LIMITS[later]} items
  Total ceiling:   ${WIP_LIMITS[total]} items
EOF
}

main() {
    check_prerequisites
    
    local mode="${1:---check}"
    
    case "$mode" in
        --check)
            if check_limits; then
                echo -e "${GREEN}✅ All WIP limits within thresholds${NC}"
                exit 0
            else
                echo -e "${RED}❌ WIP limit violations detected${NC}"
                echo "Run with --enforce for recommendations"
                exit 1
            fi
            ;;
        --enforce)
            enforce_limits
            ;;
        --report)
            generate_report
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            echo "Unknown option: $mode"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
