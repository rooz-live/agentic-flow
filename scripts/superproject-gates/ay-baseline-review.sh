#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay Baseline/Frequency/Hardcoded Review & Retro
# Validates system health, checks execution frequency, reviews hardcoded values
# Generates retrospective insights automatically
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"
REVIEW_LOG="${PROJECT_ROOT}/logs/baseline-reviews.log"
RETRO_DIR="${PROJECT_ROOT}/retros"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Thresholds (HARDCODED - Review quarterly)
MIN_SUCCESS_RATE=70
MIN_EQUITY_SCORE=65
TARGET_COMPLETION=75
MAX_STALE_HOURS=24
REVIEW_FREQUENCY_DAYS=7

# Ensure directories exist
mkdir -p "$(dirname "$REVIEW_LOG")" "$RETRO_DIR"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Logging
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log_review() {
    echo "[$(date -Iseconds)] $*" >> "$REVIEW_LOG"
}

print_banner() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}📊 Baseline/Frequency/Hardcoded Review & Retro${NC}      ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. BASELINE VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

validate_baseline() {
    print_section "1️⃣ Baseline Validation"
    echo ""
    
    local baseline_score=0
    local baseline_total=10
    
    # Check 1: Database exists and healthy
    echo -e "  ${CYAN}[1/10]${NC} Database integrity..."
    if [[ -f "$DB_PATH" ]] && sqlite3 "$DB_PATH" "PRAGMA integrity_check;" &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} PASS - Database healthy"
        ((baseline_score++))
    else
        echo -e "  ${RED}✗${NC} FAIL - Database corrupted or missing"
    fi
    
    # Check 2: Required tables exist
    echo -e "  ${CYAN}[2/10]${NC} Required tables..."
    local required_tables=("episodes" "completion_episodes" "skills")
    local tables_ok=1
    for table in "${required_tables[@]}"; do
        if ! sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null | grep -q "$table"; then
            echo -e "  ${RED}✗${NC} Missing table: $table"
            tables_ok=0
        fi
    done
    if [[ $tables_ok -eq 1 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - All required tables present"
        ((baseline_score++))
    fi
    
    # Check 3: Minimum data threshold
    echo -e "  ${CYAN}[3/10]${NC} Data sufficiency..."
    local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    if [[ $total_eps -ge 30 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - $total_eps episodes (≥30 threshold)"
        ((baseline_score++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - $total_eps episodes (<30 threshold)"
    fi
    
    # Check 4: All circles have data
    echo -e "  ${CYAN}[4/10]${NC} Circle coverage..."
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    local covered=0
    for circle in "${circles[@]}"; do
        local count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle';" 2>/dev/null || echo "0")
        [[ $count -gt 0 ]] && ((covered++))
    done
    if [[ $covered -eq 6 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - All 6 circles have data"
        ((baseline_score++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - Only $covered/6 circles have data"
    fi
    
    # Check 5: Scripts executable
    echo -e "  ${CYAN}[5/10]${NC} Script executability..."
    local scripts=("ay-wsjf-iterate.sh" "ay-continuous-improve.sh" "ay-smart-cycle.sh")
    local executable=0
    for script in "${scripts[@]}"; do
        [[ -x "$SCRIPT_DIR/$script" ]] && ((executable++))
    done
    if [[ $executable -eq 3 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - All critical scripts executable"
        ((baseline_score++))
    else
        echo -e "  ${RED}✗${NC} FAIL - Only $executable/3 scripts executable"
    fi
    
    # Check 6: Recent activity (last 24h)
    echo -e "  ${CYAN}[6/10]${NC} Recent activity..."
    local recent=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-24 hours');" \
        2>/dev/null || echo "0")
    if [[ $recent -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - $recent episodes in last 24h"
        ((baseline_score++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - No activity in last 24h (stale)"
    fi
    
    # Check 7: Success rate above minimum
    echo -e "  ${CYAN}[7/10]${NC} Success rate threshold..."
    local success_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
    local success_rate=$(echo "scale=1; $success_eps * 100 / $total_eps" | bc -l 2>/dev/null || echo "0")
    local success_int=$(printf "%.0f" "$success_rate")
    if [[ $success_int -ge $MIN_SUCCESS_RATE ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - Success rate: ${success_rate}%"
        ((baseline_score++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - Success rate: ${success_rate}% (below ${MIN_SUCCESS_RATE}%)"
    fi
    
    # Check 8: No circles critically underperforming (<50%)
    echo -e "  ${CYAN}[8/10]${NC} Critical underperformers..."
    local critical=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
         GROUP BY circle HAVING AVG(completion_pct) < 50;" 2>/dev/null || echo "0")
    if [[ $critical -eq 0 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - No circles <50% completion"
        ((baseline_score++))
    else
        echo -e "  ${RED}✗${NC} FAIL - $critical circles critically low (<50%)"
    fi
    
    # Check 9: Configuration files present
    echo -e "  ${CYAN}[9/10]${NC} Configuration files..."
    if [[ -f "$PROJECT_ROOT/.env" ]] && [[ -f "$PROJECT_ROOT/config/dor-budgets.json" ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - Configuration files present"
        ((baseline_score++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - Some configuration files missing"
    fi
    
    # Check 10: Logs directory writable
    echo -e "  ${CYAN}[10/10]${NC} Logs writable..."
    if [[ -w "$(dirname "$REVIEW_LOG")" ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - Logs directory writable"
        ((baseline_score++))
    else
        echo -e "  ${RED}✗${NC} FAIL - Cannot write logs"
    fi
    
    # Summary
    echo ""
    local baseline_pct=$((baseline_score * 100 / baseline_total))
    echo -e "  ${BOLD}Baseline Score: $baseline_score/$baseline_total ($baseline_pct%)${NC}"
    
    log_review "BASELINE: $baseline_score/$baseline_total ($baseline_pct%)"
    
    if [[ $baseline_score -ge 8 ]]; then
        echo -e "  ${GREEN}✓ Baseline: HEALTHY${NC}"
        return 0
    elif [[ $baseline_score -ge 6 ]]; then
        echo -e "  ${YELLOW}⚠ Baseline: DEGRADED${NC}"
        return 1
    else
        echo -e "  ${RED}✗ Baseline: CRITICAL${NC}"
        return 2
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. FREQUENCY ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

analyze_frequency() {
    print_section "2️⃣ Execution Frequency Analysis"
    echo ""
    
    if [[ ! -f "$DB_PATH" ]]; then
        echo -e "  ${YELLOW}⚠${NC} Database not found - skipping frequency analysis"
        return
    fi
    
    # Last review timestamp
    local last_review=$(tail -1 "$REVIEW_LOG" 2>/dev/null | grep -o '[0-9-]*T[0-9:]*' || echo "")
    if [[ -n "$last_review" ]]; then
        local last_review_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$last_review" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local days_since=$(( (now_epoch - last_review_epoch) / 86400 ))
        
        echo -e "  Last Review: $last_review (${days_since}d ago)"
        if [[ $days_since -gt $REVIEW_FREQUENCY_DAYS ]]; then
            echo -e "  ${YELLOW}⚠${NC} Review overdue (>${REVIEW_FREQUENCY_DAYS}d)"
        else
            echo -e "  ${GREEN}✓${NC} Review on schedule"
        fi
    else
        echo -e "  ${BLUE}ℹ${NC} First review - no history"
    fi
    
    # Circle execution frequency
    echo ""
    echo -e "  ${BOLD}Circle Execution Frequency (last 7 days):${NC}"
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    for circle in "${circles[@]}"; do
        local count=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(*) FROM completion_episodes 
             WHERE circle='$circle' AND created_at > datetime('now', '-7 days');" \
            2>/dev/null || echo "0")
        
        local freq_per_day=$(echo "scale=1; $count / 7" | bc -l 2>/dev/null || echo "0")
        
        if [[ $count -ge 7 ]]; then
            echo -e "    ${GREEN}✓${NC} $circle: $count episodes (${freq_per_day}/day)"
        elif [[ $count -ge 3 ]]; then
            echo -e "    ${YELLOW}◐${NC} $circle: $count episodes (${freq_per_day}/day)"
        else
            echo -e "    ${RED}✗${NC} $circle: $count episodes (${freq_per_day}/day - low)"
        fi
    done
    
    # Stale data check
    echo ""
    echo -e "  ${BOLD}Staleness Check:${NC}"
    local last_activity=$(sqlite3 "$DB_PATH" \
        "SELECT MAX(created_at) FROM episodes;" 2>/dev/null || echo "")
    
    if [[ -n "$last_activity" ]]; then
        local last_epoch=$(date -j -f "%Y-%m-%d %H:%M:%S" "$last_activity" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local hours_since=$(( (now_epoch - last_epoch) / 3600 ))
        
        echo -e "    Last Activity: $last_activity (${hours_since}h ago)"
        if [[ $hours_since -gt $MAX_STALE_HOURS ]]; then
            echo -e "    ${RED}✗${NC} Data STALE (>${MAX_STALE_HOURS}h)"
        else
            echo -e "    ${GREEN}✓${NC} Data FRESH"
        fi
    fi
    
    log_review "FREQUENCY: Analyzed execution patterns"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. HARDCODED VALUES REVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

review_hardcoded() {
    print_section "3️⃣ Hardcoded Values Review"
    echo ""
    
    echo -e "  ${BOLD}Current Thresholds:${NC}"
    echo -e "    MIN_SUCCESS_RATE:     ${MIN_SUCCESS_RATE}%"
    echo -e "    MIN_EQUITY_SCORE:     ${MIN_EQUITY_SCORE}%"
    echo -e "    TARGET_COMPLETION:    ${TARGET_COMPLETION}%"
    echo -e "    MAX_STALE_HOURS:      ${MAX_STALE_HOURS}h"
    echo -e "    REVIEW_FREQUENCY:     ${REVIEW_FREQUENCY_DAYS}d"
    
    # Check if thresholds are still appropriate
    echo ""
    echo -e "  ${BOLD}Threshold Appropriateness:${NC}"
    
    if [[ -f "$DB_PATH" ]]; then
        # Analyze actual performance distribution
        local circles_above_min=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
             GROUP BY circle HAVING AVG(completion_pct) >= $MIN_SUCCESS_RATE;" \
            2>/dev/null || echo "0")
        
        local circles_total=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(DISTINCT circle) FROM completion_episodes;" \
            2>/dev/null || echo "6")
        
        local pct_meeting=$(echo "scale=1; $circles_above_min * 100 / $circles_total" | bc -l 2>/dev/null || echo "0")
        local pct_int=$(printf "%.0f" "$pct_meeting")
        
        echo -e "    Circles meeting ${MIN_SUCCESS_RATE}% threshold: $circles_above_min/$circles_total (${pct_meeting}%)"
        
        if [[ $pct_int -lt 50 ]]; then
            echo -e "    ${RED}⚠${NC} Consider lowering MIN_SUCCESS_RATE (too aggressive)"
        elif [[ $pct_int -gt 90 ]]; then
            echo -e "    ${YELLOW}⚠${NC} Consider raising MIN_SUCCESS_RATE (too lenient)"
        else
            echo -e "    ${GREEN}✓${NC} Threshold appears appropriate"
        fi
    fi
    
    # Review last threshold change
    echo ""
    echo -e "  ${BOLD}Recommendation:${NC}"
    echo -e "    Review thresholds quarterly or when system behavior changes significantly"
    echo -e "    Next review due: $(date -v+90d +%Y-%m-%d)"
    
    log_review "HARDCODED: Reviewed thresholds - ${circles_above_min}/${circles_total} circles meeting targets"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. AUTOMATIC RETROSPECTIVE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

generate_retro() {
    print_section "4️⃣ Automated Retrospective"
    echo ""
    
    local retro_file="$RETRO_DIR/retro-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$retro_file" <<EOF
# Retrospective: $(date +"%Y-%m-%d %H:%M:%S")

## 📊 What's Working Well

EOF
    
    # Analyze what's working
    if [[ -f "$DB_PATH" ]]; then
        local top_circles=$(sqlite3 "$DB_PATH" \
            "SELECT circle, ROUND(AVG(completion_pct), 1) as avg 
             FROM completion_episodes 
             GROUP BY circle 
             HAVING COUNT(*) >= 5
             ORDER BY avg DESC 
             LIMIT 3;" 2>/dev/null || echo "")
        
        echo "### Top Performing Circles" >> "$retro_file"
        echo "$top_circles" | while IFS='|' read -r circle avg; do
            [[ -n "$circle" ]] && echo "- **$circle**: $avg% completion" >> "$retro_file"
        done
        echo "" >> "$retro_file"
    fi
    
    cat >> "$retro_file" <<EOF

## ⚠️ What Needs Improvement

EOF
    
    # Analyze what needs work
    if [[ -f "$DB_PATH" ]]; then
        local low_circles=$(sqlite3 "$DB_PATH" \
            "SELECT circle, ROUND(AVG(completion_pct), 1) as avg 
             FROM completion_episodes 
             GROUP BY circle 
             HAVING AVG(completion_pct) < $MIN_SUCCESS_RATE
             ORDER BY avg ASC;" 2>/dev/null || echo "")
        
        echo "### Underperforming Circles" >> "$retro_file"
        if [[ -n "$low_circles" ]]; then
            echo "$low_circles" | while IFS='|' read -r circle avg; do
                [[ -n "$circle" ]] && echo "- **$circle**: $avg% completion (target: ${MIN_SUCCESS_RATE}%)" >> "$retro_file"
            done
        else
            echo "- None! All circles meeting targets ✓" >> "$retro_file"
        fi
        echo "" >> "$retro_file"
    fi
    
    cat >> "$retro_file" <<EOF

## 🎯 Action Items

1. **Primary Focus**: Improve circles below ${MIN_SUCCESS_RATE}% completion
2. **Monitoring**: Track success rate trends weekly
3. **Review**: Re-evaluate thresholds in 90 days

## 📈 Trends

EOF
    
    # Calculate trends
    if [[ -f "$DB_PATH" ]]; then
        local recent_avg=$(sqlite3 "$DB_PATH" \
            "SELECT ROUND(AVG(completion_pct), 1) FROM completion_episodes 
             WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0")
        
        local older_avg=$(sqlite3 "$DB_PATH" \
            "SELECT ROUND(AVG(completion_pct), 1) FROM completion_episodes 
             WHERE created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days');" \
             2>/dev/null || echo "0")
        
        local trend=$(echo "$recent_avg - $older_avg" | bc -l 2>/dev/null || echo "0")
        
        echo "- Last 7 days avg: ${recent_avg}%" >> "$retro_file"
        echo "- Previous 7 days avg: ${older_avg}%" >> "$retro_file"
        echo "- Trend: ${trend}% $(echo "$trend >= 0" | bc -l &>/dev/null && echo "📈 improving" || echo "📉 declining")" >> "$retro_file"
    fi
    
    cat >> "$retro_file" <<EOF

## 🔧 System Health

- Database: $(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "ERROR")
- Total Episodes: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
- Review Date: $(date +"%Y-%m-%d")

---

*Auto-generated by ay-baseline-review.sh*
EOF
    
    echo -e "  ${GREEN}✓${NC} Retrospective saved: $retro_file"
    echo ""
    echo -e "  ${BOLD}Preview:${NC}"
    head -25 "$retro_file" | sed 's/^/    /'
    echo -e "    ${DIM}[...truncated]${NC}"
    
    log_review "RETRO: Generated $retro_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    print_banner
    
    echo -e "${BOLD}Running comprehensive system review...${NC}"
    echo ""
    
    validate_baseline
    local baseline_status=$?
    
    analyze_frequency
    
    review_hardcoded
    
    generate_retro
    
    # Final verdict
    print_section "⚖️ Final Verdict"
    echo ""
    
    case $baseline_status in
        0)
            echo -e "  ${GREEN}✅ GO${NC} - System healthy and ready"
            echo -e "  ${DIM}All baseline checks passing${NC}"
            ;;
        1)
            echo -e "  ${YELLOW}⚠️ CONTINUE${NC} - System functional but degraded"
            echo -e "  ${DIM}Some baseline checks failed - review recommended${NC}"
            ;;
        *)
            echo -e "  ${RED}❌ NO-GO${NC} - Critical issues detected"
            echo -e "  ${DIM}Manual intervention required${NC}"
            ;;
    esac
    
    echo ""
    echo -e "${DIM}Review log: $REVIEW_LOG${NC}"
    echo -e "${DIM}Retros: $RETRO_DIR${NC}"
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay-baseline-review.sh - System Health & Retrospective${NC}

${BOLD}USAGE:${NC}
  ay-baseline-review.sh

${BOLD}WHAT IT DOES:${NC}
  1. Validates baseline system health (10 checks)
  2. Analyzes execution frequency patterns
  3. Reviews hardcoded threshold values
  4. Generates automated retrospective

${BOLD}OUTPUTS:${NC}
  - Review log: logs/baseline-reviews.log
  - Retrospective: retros/retro-TIMESTAMP.md

${BOLD}FREQUENCY:${NC}
  Run weekly or before major changes

EOF
    exit 0
fi

main "$@"
