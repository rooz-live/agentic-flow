#!/usr/bin/env bash
set -euo pipefail

# Continuous Improvement Orchestrator
# Integrates DoR/DoD cycles with automated learning loops and equity balancing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Load statistical thresholds library
if [[ -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]]; then
    source "$SCRIPT_DIR/lib/statistical-thresholds.sh"
    STATISTICAL_THRESHOLDS_ENABLED=true
else
    STATISTICAL_THRESHOLDS_ENABLED=false
fi

# Configuration - use statistical thresholds when available
if [[ "$STATISTICAL_THRESHOLDS_ENABLED" == "true" ]]; then
    # Dynamic equity threshold based on circle heterogeneity
    EQUITY_RESULT=$(get_equity_threshold "$PROJECT_ROOT/agentdb.db" 2>/dev/null || echo "70|0|0")
    MIN_EQUITY_SCORE=$(echo "$EQUITY_RESULT" | cut -d'|' -f1)
    MIN_EQUITY_SCORE=${MIN_EQUITY_SCORE:-70}
else
    MIN_EQUITY_SCORE=70  # Fallback to hardcoded
fi

LOW_SUCCESS_THRESHOLD=60
LEARNING_ITERATIONS=5
CHECK_INTERVAL_SECONDS=${CHECK_INTERVAL_SECONDS:-300}  # 5 minutes between checks (overridable)
LEARNING_VALIDATION_WINDOW_MIN=${LEARNING_VALIDATION_WINDOW_MIN:-5}

export AGENTDB_PATH="${AGENTDB_PATH:-$PROJECT_ROOT/agentdb.db}"

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

# ==========================================
# 1. Baseline Assessment
# ==========================================
assess_baseline() {
    print_section "1. Baseline Assessment"
    
    if ! command -v npx &>/dev/null; then
        echo -e "  ${YELLOW}⚠ npx unavailable - skipping AgentDB checks${NC}"
        return 1
    fi
    
    # Check AgentDB health
    if timeout 3s npx agentdb stats &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} AgentDB healthy"
        
        # Get total skills
        local total_skills=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
        echo "  Skills in database: $total_skills"
        
        # Calculate equity score
        local equity_score=$(calculate_equity_score)
        echo "  Current equity score: $equity_score/100"
        
        if [ "$equity_score" -lt "$MIN_EQUITY_SCORE" ]; then
            if [[ "$STATISTICAL_THRESHOLDS_ENABLED" == "true" ]]; then
                local episode_cv=$(echo "$EQUITY_RESULT" | cut -d'|' -f2)
                echo -e "  ${YELLOW}⚡ Equity below adaptive threshold ($MIN_EQUITY_SCORE, CV=$episode_cv) - improvement needed${NC}"
            else
                echo -e "  ${YELLOW}⚡ Equity below threshold ($MIN_EQUITY_SCORE) - improvement needed${NC}"
            fi
            return 2  # Needs improvement
        else
            echo -e "  ${GREEN}✓${NC} Equity acceptable"
            return 0  # Healthy
        fi
    else
        echo -e "  ${YELLOW}⚠ AgentDB unavailable${NC}"
        return 1
    fi
}

# ==========================================
# 2. Calculate Circle Equity Score
# ==========================================
calculate_equity_score() {
    local total=0
    local count=0
    
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
        local skill_count=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | \
            jq '.skills | length' 2>/dev/null || echo "0")
        total=$((total + skill_count))
        count=$((count + 1))
    done
    
    if [ "$count" -eq 0 ]; then
        echo "0"
        return
    fi
    
    local avg=$((total / count))
    local variance=0
    
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
        local skill_count=$(npx agentdb skill search --circle "$circle" --json 2>/dev/null | \
            jq '.skills | length' 2>/dev/null || echo "0")
        local diff=$((skill_count - avg))
        variance=$((variance + diff * diff))
    done
    
    # Normalize to 0-100 scale (lower variance = higher score)
    local equity_score=$((100 - variance / 6))
    [ $equity_score -lt 0 ] && equity_score=0
    
    echo "$equity_score"
}

# ==========================================
# 3. Identify Underperforming Circles
# ==========================================
identify_underperformers() {
    print_section "2. Identifying Underperforming Circles"
    
    local underperformers=()
    
    if [ ! -f "$PROJECT_ROOT/agentdb.db" ]; then
        echo "  ℹ️  No AgentDB found - skipping performance check"
        return 0
    fi
    
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
        # Check historical completion rate
        local avg_completion=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle'" \
            2>/dev/null || echo "0")
        
        local episode_count=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle'" \
            2>/dev/null || echo "0")
        
        if [ "$episode_count" -gt 0 ]; then
            local avg_int=$(echo "$avg_completion" | cut -d'.' -f1)
            avg_int=${avg_int:-0}
            
            if [ "$avg_int" -lt "$LOW_SUCCESS_THRESHOLD" ]; then
                echo -e "  ${YELLOW}⚠${NC} $circle: ${avg_completion}% avg (below ${LOW_SUCCESS_THRESHOLD}% threshold)"
                underperformers+=("$circle")
            else
                echo -e "  ${GREEN}✓${NC} $circle: ${avg_completion}% avg"
            fi
        else
            echo "  ℹ️  $circle: No historical data"
        fi
    done
    
    # Export for use by other functions
    echo "${underperformers[@]}"
}

# ==========================================
# 4. Execute Improvement Cycle
# ==========================================
execute_improvement_cycle() {
    local circle="$1"
    
    print_section "3. Executing Improvement Cycle: $circle"
    
    # Get primary ceremony for circle
    local ceremony=$(jq -r ".circles.${circle}.ceremony" "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null || echo "standup")
    
    echo "  Circle: $circle"
    echo "  Ceremony: $ceremony"
    echo ""
    
    # Step 1: DoR Budget Lookup
    echo "  [1/4] DoR Budget Lookup"
    if [ -f "$SCRIPT_DIR/ay-prod-dor-lookup.sh" ]; then
        "$SCRIPT_DIR/ay-prod-dor-lookup.sh" "$circle" "$ceremony" --json > /tmp/dor-budget-${circle}.json 2>/dev/null || true
        
        local dor_minutes=$(jq -r '.dor_budget.minutes' /tmp/dor-budget-${circle}.json 2>/dev/null || echo "5")
        echo "    Time Budget: ${dor_minutes}m"
    fi
    
    # Step 2: Execute Time-Boxed Ceremony
    echo ""
    echo "  [2/4] Execute Ceremony (Time-Boxed)"
    
    local start_time=$(date +%s)
    
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
        if "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 | \
            grep -E "✅|✓|Episode|Learning|DoR|DoD" | sed 's/^/    /'; then
            echo -e "    ${GREEN}✓ Ceremony completed${NC}"
        else
            echo -e "    ${YELLOW}⚠ Ceremony completed with warnings${NC}"
        fi
    else
        echo "    ⚠️  ay-prod-cycle.sh not found"
        return 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo "    Duration: ${duration}s"
    
    # Step 3: Trigger Learning
    echo ""
    echo "  [3/4] Trigger Learning Loop"
    
    if [ -f "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]; then
        echo "    Running $LEARNING_ITERATIONS learning iterations..."
        if "$SCRIPT_DIR/ay-prod-learn-loop.sh" "$circle" 2>&1 | head -10 | sed 's/^/    /'; then
            echo -e "    ${GREEN}✓ Learning completed${NC}"
        else
            echo -e "    ${YELLOW}⚠ Learning completed with warnings${NC}"
        fi
    fi
    
    # Step 4: Validate Improvement
    echo ""
    echo "  [4/4] Validate Improvement"
    
    if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
        # Compute portable window cutoff in ms
        now_s=$(date +%s)
        cutoff_s=$(( now_s - (LEARNING_VALIDATION_WINDOW_MIN * 60) ))
        cutoff_ms=$(( cutoff_s * 1000 ))
        local new_avg=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle' AND timestamp > $cutoff_ms" \
            2>/dev/null || echo "0")
        
        echo "    Recent avg completion: ${new_avg}%"
        
        local new_avg_int=$(echo "$new_avg" | cut -d'.' -f1)
        new_avg_int=${new_avg_int:-0}
        
        if [ "$new_avg_int" -ge "$LOW_SUCCESS_THRESHOLD" ]; then
            echo -e "    ${GREEN}✓ Improvement successful${NC}"
            return 0
        else
            echo -e "    ${YELLOW}⚠ Further improvement needed${NC}"
            return 1
        fi
    fi
}

# ==========================================
# 5. Balance Circle Equity
# ==========================================
balance_equity() {
    print_section "4. Balancing Circle Equity"
    
    # Run ceremony for each circle to ensure baseline skills
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    
    for circle in "${circles[@]}"; do
        local ceremony=$(jq -r ".circles.${circle}.ceremony" "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null || echo "standup")
        
        echo ""
        echo "  Executing $circle/$ceremony..."
        
        if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
            "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 | \
                grep -E "✅|Episode" | head -3 | sed 's/^/    /' || true
        fi
        
        # Brief pause between cycles
        sleep 2
    done
    
    echo ""
    echo -e "  ${GREEN}✓ Equity balancing complete${NC}"
}

# ==========================================
# 6. Generate Improvement Report
# ==========================================
generate_report() {
    print_section "5. Improvement Report"
    
    local report_file="$PROJECT_ROOT/.continuous-improvement-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Continuous Improvement Report"
        echo "Generated: $(date)"
        echo ""
        echo "=== Circle Performance ==="
        echo ""
        
        if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
            for circle in orchestrator assessor analyst innovator seeker intuitive; do
                local avg=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
                    "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle'" \
                    2>/dev/null || echo "N/A")
                
                local count=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
                    "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle'" \
                    2>/dev/null || echo "0")
                
                printf "%-15s: %5s%% avg (%3d episodes)\n" "$circle" "$avg" "$count"
            done
        else
            echo "AgentDB not available"
        fi
        
        echo ""
        echo "=== Equity Score ==="
        echo ""
        
        if command -v npx &>/dev/null; then
            local equity=$(calculate_equity_score)
            echo "Current equity: $equity/100"
            
            if [ "$equity" -ge 80 ]; then
                echo "Status: Excellent balance"
            elif [ "$equity" -ge 70 ]; then
                echo "Status: Good balance"
            elif [ "$equity" -ge 60 ]; then
                echo "Status: Moderate balance - improvement recommended"
            else
                echo "Status: Poor balance - improvement required"
            fi
        else
            echo "npx unavailable"
        fi
        
        echo ""
        echo "=== Recommendations ==="
        echo ""
        
        # Check for underperformers
        if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
            for circle in orchestrator assessor analyst innovator seeker intuitive; do
                local avg=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
                    "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle'" \
                    2>/dev/null || echo "0")
                
                local avg_int=$(echo "$avg" | cut -d'.' -f1)
                avg_int=${avg_int:-0}
                
                if [ "$avg_int" -lt "$LOW_SUCCESS_THRESHOLD" ] && [ "$avg_int" -gt 0 ]; then
                    echo "• Run additional learning for $circle: ./scripts/ay-prod-learn-loop.sh $circle"
                fi
            done
        fi
        
    } | tee "$report_file"
    
    echo ""
    echo -e "  ${GREEN}✓${NC} Report saved: $report_file"
}

# ==========================================
# 7. Continuous Mode
# ==========================================
continuous_mode() {
    print_header "🔄 Continuous Improvement Mode"
    
    echo ""
    echo "Configuration:"
    echo "  Check Interval: ${CHECK_INTERVAL_SECONDS}s"
    echo "  Min Equity Score: $MIN_EQUITY_SCORE"
    echo "  Low Success Threshold: $LOW_SUCCESS_THRESHOLD%"
    echo "  Learning Iterations: $LEARNING_ITERATIONS"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    
    local cycle_count=0
    
    while true; do
        cycle_count=$((cycle_count + 1))
        
        print_header "Cycle #$cycle_count - $(date '+%Y-%m-%d %H:%M:%S')"
        
        # Step 1: Assess baseline
        assess_baseline
        local baseline_status=$?
        
        # Step 2: Identify underperformers
        local underperformers_str=$(identify_underperformers)
        IFS=' ' read -r -a underperformers <<< "$underperformers_str"
        
        # Step 3: Execute improvement cycles for underperformers
        if [ ${#underperformers[@]} -gt 0 ]; then
            for circle in "${underperformers[@]}"; do
                execute_improvement_cycle "$circle"
            done
        else
            echo ""
            echo -e "${GREEN}✓ All circles performing well${NC}"
        fi
        
        # Step 4: Check if equity balancing needed
        if [ "$baseline_status" -eq 2 ]; then
            balance_equity
        fi
        
        # Step 5: Generate report
        generate_report
        
        # Wait before next cycle
        echo ""
        echo -e "${BLUE}⏱️  Next check in ${CHECK_INTERVAL_SECONDS}s...${NC}"
        sleep "$CHECK_INTERVAL_SECONDS"
    done
}

# ==========================================
# 8. One-Shot Mode
# ==========================================
oneshot_mode() {
    print_header "⚡ One-Shot Improvement Cycle"
    
    # Full improvement cycle
    assess_baseline
    
    local underperformers_str=$(identify_underperformers)
    IFS=' ' read -r -a underperformers <<< "$underperformers_str"
    
    if [ ${#underperformers[@]} -gt 0 ]; then
        for circle in "${underperformers[@]}"; do
            execute_improvement_cycle "$circle"
        done
    else
        echo ""
        echo -e "${GREEN}✓ All circles healthy - running equity balancing${NC}"
        balance_equity
    fi
    
    generate_report
    
    echo ""
    echo -e "${GREEN}✅ One-shot improvement complete${NC}"
}

# ==========================================
# Main Command Router
# ==========================================
COMMAND="${1:-oneshot}"

case "$COMMAND" in
    continuous|c)
        continuous_mode
        ;;
        
    oneshot|o)
        oneshot_mode
        ;;
        
    assess|a)
        print_header "📊 Baseline Assessment"
        assess_baseline
        ;;
        
    balance|b)
        print_header "⚖️ Circle Equity Balancing"
        balance_equity
        ;;
        
    report|r)
        print_header "📝 Improvement Report"
        generate_report
        ;;
        
    help|h)
        print_header "Continuous Improvement Orchestrator - Help"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  oneshot (o)       Run single improvement cycle (default)"
        echo "  continuous (c)    Run continuous improvement loop"
        echo "  assess (a)        Assess baseline metrics only"
        echo "  balance (b)       Balance circle equity"
        echo "  report (r)        Generate improvement report"
        echo "  help (h)          Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 oneshot              # Single improvement run"
        echo "  $0 continuous           # Continuous monitoring (Ctrl+C to stop)"
        echo "  $0 assess               # Check current state"
        echo ""
        ;;
        
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo "Run: $0 help"
        exit 1
        ;;
esac
