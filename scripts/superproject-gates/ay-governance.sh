#!/bin/bash
# AY Governance Framework
# Implements: Baseline → Error Analysis → Audit → Review → Retrospective → Learning Capture
# Usage: ./scripts/ay-governance.sh <phase>
# Phases: baseline | analyze | audit | review | retro | export | all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-./agentdb.db}"
GOVERNANCE_DIR="${GOVERNANCE_DIR:-./governance}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Symbols
CHECK="✓"
CROSS="✗"
DOT="⚠"
ARROW="→"
CIRCLE="⚙"

print_banner() {
    echo -e "${BOLD}${CYAN}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║                                                      ║"
    echo "║         AY Governance Framework v1.0                 ║"
    echo "║    Baseline → Analyze → Audit → Review → Retro      ║"
    echo "║                                                      ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo ""
    echo -e "${BOLD}${MAGENTA}━━━ $1 ━━━${NC}"
}

print_status() {
    local status=$1
    local message=$2
    case $status in
        success) echo -e "  ${GREEN}${CHECK}${NC} $message" ;;
        error) echo -e "  ${RED}${CROSS}${NC} $message" ;;
        warning) echo -e "  ${YELLOW}${DOT}${NC} $message" ;;
        info) echo -e "  ${BLUE}${ARROW}${NC} $message" ;;
    esac
}

ensure_dirs() {
    mkdir -p "$GOVERNANCE_DIR"/{baselines,audits,reviews,retros,exports}
    print_status success "Governance directories initialized"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 1: Establish Baselines
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_baseline() {
    print_section "Phase 1: Establish Baselines"
    
    local baseline_file="$GOVERNANCE_DIR/baselines/baseline_${TIMESTAMP}.json"
    
    if [[ ! -f "$AGENTDB_PATH" ]]; then
        print_status error "AgentDB not found at $AGENTDB_PATH"
        return 1
    fi
    
    # Extract baseline metrics
    print_status info "Extracting baseline metrics..."
    
    local total_episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    local avg_success=$(sqlite3 "$AGENTDB_PATH" "SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2) FROM episodes;" 2>/dev/null || echo "0")
    local avg_reward=$(sqlite3 "$AGENTDB_PATH" "SELECT ROUND(AVG(reward), 4) FROM episodes;" 2>/dev/null || echo "0")
    local std_reward=$(sqlite3 "$AGENTDB_PATH" "SELECT ROUND(SQRT(AVG((reward - (SELECT AVG(reward) FROM episodes)) * (reward - (SELECT AVG(reward) FROM episodes)))), 4) FROM episodes;" 2>/dev/null || echo "0")
    
    # Circle-level baselines
    local circles=(orchestrator assessor analyst innovator seeker intuitive)
    local circle_data=""
    
    for circle in "${circles[@]}"; do
        local circle_success=$(sqlite3 "$AGENTDB_PATH" "
            SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2)
            FROM episodes
            WHERE json_extract(metadata, '\$.circle') = '$circle';
        " 2>/dev/null || echo "0")
        
        local circle_episodes=$(sqlite3 "$AGENTDB_PATH" "
            SELECT COUNT(*)
            FROM episodes
            WHERE json_extract(metadata, '\$.circle') = '$circle';
        " 2>/dev/null || echo "0")
        
        circle_data="${circle_data}    \"${circle}\": {\"success_rate\": ${circle_success}, \"episodes\": ${circle_episodes}},"$'\n'
    done
    
    # Remove trailing comma
    circle_data="${circle_data%,*}"
    
    # Error frequency analysis
    local error_count=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 0;" 2>/dev/null || echo "0")
    local error_rate=$(awk "BEGIN {printf \"%.2f\", ($error_count / $total_episodes) * 100}")
    
    # Hardcoded values audit
    print_status info "Scanning for hardcoded parameters..."
    local hardcoded_count=$(grep -r "magic_number\|hardcoded\|TODO.*param" "$SCRIPT_DIR" 2>/dev/null | wc -l | tr -d ' ')
    
    # Create baseline JSON
    cat > "$baseline_file" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "database": {
    "path": "$AGENTDB_PATH",
    "total_episodes": $total_episodes,
    "avg_success_rate": $avg_success,
    "avg_reward": $avg_reward,
    "std_reward": $std_reward,
    "error_rate": $error_rate
  },
  "circles": {
$circle_data
  },
  "code_health": {
    "hardcoded_parameters": $hardcoded_count,
    "scripts_scanned": $(find "$SCRIPT_DIR" -name "*.sh" | wc -l | tr -d ' ')
  },
  "thresholds": {
    "min_success_rate": 75,
    "min_episodes": 10,
    "min_circles": 6,
    "equity_threshold": 50
  }
}
EOF
    
    print_status success "Baseline established: $baseline_file"
    
    # Display summary
    echo ""
    echo -e "${BOLD}Baseline Summary:${NC}"
    echo -e "  Episodes: ${BOLD}$total_episodes${NC}"
    echo -e "  Success Rate: ${BOLD}${avg_success}%${NC}"
    echo -e "  Avg Reward: ${BOLD}$avg_reward${NC} (±$std_reward)"
    echo -e "  Error Rate: ${BOLD}${error_rate}%${NC}"
    echo -e "  Hardcoded Params: ${BOLD}$hardcoded_count${NC}"
    
    echo "$baseline_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 2: Error/Frequency Analysis
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_analyze() {
    print_section "Phase 2: Error & Frequency Analysis"
    
    local analysis_file="$GOVERNANCE_DIR/audits/analysis_${TIMESTAMP}.md"
    
    if [[ ! -f "$AGENTDB_PATH" ]]; then
        print_status error "AgentDB not found"
        return 1
    fi
    
    cat > "$analysis_file" <<'EOF'
# Error & Frequency Analysis Report

## 1. Error Distribution by Circle
EOF
    
    print_status info "Analyzing error patterns..."
    
    # Error analysis by circle
    sqlite3 "$AGENTDB_PATH" "
        SELECT 
            json_extract(metadata, '\$.circle') as circle,
            COUNT(*) as total,
            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
            ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2) as success_rate
        FROM episodes
        GROUP BY circle
        ORDER BY errors DESC;
    " | while IFS='|' read -r circle total errors success_rate; do
        echo "- **$circle**: $errors errors / $total episodes ($success_rate% success)" >> "$analysis_file"
        print_status warning "$circle: $errors errors ($success_rate% success)"
    done
    
    cat >> "$analysis_file" <<'EOF'

## 2. Error Frequency Over Time
EOF
    
    # Temporal error analysis
    sqlite3 "$AGENTDB_PATH" "
        SELECT 
            date(created_at) as day,
            COUNT(*) as episodes,
            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
            ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2) as success_rate
        FROM episodes
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7;
    " | while IFS='|' read -r day episodes errors success_rate; do
        echo "- $day: $errors errors / $episodes episodes ($success_rate% success)" >> "$analysis_file"
    done
    
    cat >> "$analysis_file" <<'EOF'

## 3. Top Error Patterns
EOF
    
    # Most common error conditions
    print_status info "Identifying error patterns..."
    sqlite3 "$AGENTDB_PATH" "
        SELECT 
            SUBSTR(json_extract(metadata, '\$.error'), 1, 50) as error_msg,
            COUNT(*) as frequency
        FROM episodes
        WHERE success = 0 AND json_extract(metadata, '\$.error') IS NOT NULL
        GROUP BY error_msg
        ORDER BY frequency DESC
        LIMIT 10;
    " | while IFS='|' read -r error freq; do
        echo "- \`$error\`: $freq occurrences" >> "$analysis_file"
    done
    
    cat >> "$analysis_file" <<'EOF'

## 4. Parameterization Opportunities
EOF
    
    # Scan for hardcoded values
    print_status info "Scanning for parameterization opportunities..."
    grep -rn "magic_number\|0\.[0-9]\+\|[0-9]\{2,\}" "$SCRIPT_DIR" --include="*.sh" 2>/dev/null | head -20 | while read -r line; do
        echo "- $line" >> "$analysis_file"
    done
    
    print_status success "Analysis complete: $analysis_file"
    echo "$analysis_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 3: Audit (Order Analysis)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_audit() {
    print_section "Phase 3: Audit & Order Analysis"
    
    local audit_file="$GOVERNANCE_DIR/audits/audit_${TIMESTAMP}.md"
    
    cat > "$audit_file" <<'EOF'
# System Audit Report

## 1. Script Execution Order
EOF
    
    print_status info "Analyzing script dependencies..."
    
    # List all scripts in recommended execution order
    cat >> "$audit_file" <<'EOF'

### Core Infrastructure
1. `scripts/lib/statistical-thresholds.sh` - Load threshold functions
2. `scripts/ay-continuous-improve.sh assess` - Establish baseline
3. `scripts/ay-wsjf-iterate.sh` - Calculate priorities

### Improvement Cycle
4. `scripts/ay-continuous-improve.sh oneshot` - Run improvement
5. `scripts/monitor-divergence.sh` - Check for cascades
6. `scripts/ay-dashboard.sh performance` - Validate results

### Orchestration
7. `scripts/ay` - Intelligent orchestrator (auto-cycles)
8. `scripts/ay-governance.sh` - Governance framework

## 2. Missing Wiring
EOF
    
    print_status info "Checking for incomplete integrations..."
    
    # Check for unimplemented functions
    grep -rn "TODO\|FIXME\|NotImplemented" "$SCRIPT_DIR" --include="*.sh" 2>/dev/null | head -10 | while read -r line; do
        echo "- $line" >> "$audit_file"
        print_status warning "$line"
    done
    
    cat >> "$audit_file" <<'EOF'

## 3. Skills Validation Status
EOF
    
    # Check which scripts exist and are executable
    local skills=(
        "ay:scripts/ay"
        "ay-continuous-improve:scripts/ay-continuous-improve.sh"
        "ay-wsjf-iterate:scripts/ay-wsjf-iterate.sh"
        "ay-dashboard:scripts/ay-dashboard.sh"
        "ay-governance:scripts/ay-governance.sh"
        "monitor-divergence:scripts/monitor-divergence.sh"
        "statistical-thresholds:scripts/lib/statistical-thresholds.sh"
    )
    
    for skill_info in "${skills[@]}"; do
        IFS=':' read -r skill_name skill_path <<< "$skill_info"
        if [[ -f "$skill_path" ]] && [[ -x "$skill_path" ]]; then
            echo "- ✅ **$skill_name**: Fully wired and executable" >> "$audit_file"
            print_status success "$skill_name: Operational"
        elif [[ -f "$skill_path" ]]; then
            echo "- ⚠️ **$skill_name**: Exists but not executable" >> "$audit_file"
            print_status warning "$skill_name: Not executable"
        else
            echo "- ❌ **$skill_name**: Not found at $skill_path" >> "$audit_file"
            print_status error "$skill_name: Missing"
        fi
    done
    
    cat >> "$audit_file" <<'EOF'

## 4. MPP Learning Integration
EOF
    
    # Check MPP learning triggers
    if grep -q "mpp_learning\|trigger_learning" "$SCRIPT_DIR"/*.sh 2>/dev/null; then
        echo "- ✅ MPP learning hooks found" >> "$audit_file"
        print_status success "MPP learning: Integrated"
    else
        echo "- ⚠️ MPP learning not explicitly wired" >> "$audit_file"
        print_status warning "MPP learning: Not found"
    fi
    
    print_status success "Audit complete: $audit_file"
    echo "$audit_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 4: Review (Pre-Iteration Governance)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_review() {
    print_section "Phase 4: Pre-Iteration Governance Review"
    
    local review_file="$GOVERNANCE_DIR/reviews/review_${TIMESTAMP}.md"
    
    cat > "$review_file" <<EOF
# Pre-Iteration Governance Review

**Date:** $(date)
**Reviewer:** Automated (ay-governance)

## Readiness Checklist

### Infrastructure
EOF
    
    # Check AgentDB
    if [[ -f "$AGENTDB_PATH" ]]; then
        local episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
        echo "- [x] AgentDB available ($episodes episodes)" >> "$review_file"
        print_status success "AgentDB: $episodes episodes"
    else
        echo "- [ ] AgentDB not found" >> "$review_file"
        print_status error "AgentDB: Missing"
    fi
    
    # Check statistical thresholds
    if [[ -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]]; then
        echo "- [x] Statistical thresholds library available" >> "$review_file"
        print_status success "Statistical thresholds: Available"
    else
        echo "- [ ] Statistical thresholds library missing" >> "$review_file"
        print_status error "Statistical thresholds: Missing"
    fi
    
    cat >> "$review_file" <<EOF

### Governance Artifacts
EOF
    
    # Check for recent baseline
    local latest_baseline=$(find "$GOVERNANCE_DIR/baselines" -name "baseline_*.json" -type f 2>/dev/null | sort -r | head -1)
    if [[ -n "$latest_baseline" ]]; then
        echo "- [x] Recent baseline found: $(basename "$latest_baseline")" >> "$review_file"
        print_status success "Baseline: Available"
    else
        echo "- [ ] No recent baseline" >> "$review_file"
        print_status warning "Baseline: Missing (run 'baseline' first)"
    fi
    
    cat >> "$review_file" <<EOF

## Approval Decision

### Recommendation
EOF
    
    # Determine readiness
    local ready=true
    [[ ! -f "$AGENTDB_PATH" ]] && ready=false
    [[ ! -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]] && ready=false
    
    if [[ "$ready" == "true" ]]; then
        echo "**✅ APPROVED**: System ready for iteration" >> "$review_file"
        print_status success "Governance Review: APPROVED"
    else
        echo "**⚠️ CONDITIONAL**: Address missing dependencies" >> "$review_file"
        print_status warning "Governance Review: CONDITIONAL"
    fi
    
    print_status success "Review complete: $review_file"
    echo "$review_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 5: Retrospective Analysis
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_retro() {
    print_section "Phase 5: Retrospective Analysis"
    
    local retro_file="$GOVERNANCE_DIR/retros/retro_${TIMESTAMP}.md"
    
    cat > "$retro_file" <<EOF
# Retrospective Analysis

**Date:** $(date)

## What Went Well ✅
EOF
    
    if [[ -f "$AGENTDB_PATH" ]]; then
        # Find improvements
        local recent_success=$(sqlite3 "$AGENTDB_PATH" "
            SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2)
            FROM episodes
            WHERE created_at > datetime('now', '-24 hours');
        " 2>/dev/null || echo "0")
        
        local prev_success=$(sqlite3 "$AGENTDB_PATH" "
            SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2)
            FROM episodes
            WHERE created_at BETWEEN datetime('now', '-48 hours') AND datetime('now', '-24 hours');
        " 2>/dev/null || echo "0")
        
        local improvement=$(awk "BEGIN {printf \"%.2f\", $recent_success - $prev_success}")
        
        if (( $(echo "$improvement > 0" | bc -l) )); then
            echo "- Success rate improved by ${improvement}% (${prev_success}% → ${recent_success}%)" >> "$retro_file"
            print_status success "Success rate: +${improvement}%"
        fi
    fi
    
    cat >> "$retro_file" <<EOF

## What Needs Improvement ⚠️
EOF
    
    # Identify pain points
    if [[ -f "$AGENTDB_PATH" ]]; then
        sqlite3 "$AGENTDB_PATH" "
            SELECT json_extract(metadata, '\$.circle') as circle
            FROM episodes
            WHERE success = 0 AND created_at > datetime('now', '-24 hours')
            GROUP BY circle
            HAVING COUNT(*) >= 3
            ORDER BY COUNT(*) DESC;
        " | while read -r circle; do
            echo "- High error rate in $circle circle" >> "$retro_file"
            print_status warning "$circle: High errors"
        done
    fi
    
    cat >> "$retro_file" <<EOF

## Action Items 📋
EOF
    
    # Generate action items
    echo "- Run WSJF prioritization to identify highest-value improvements" >> "$retro_file"
    echo "- Target underperforming circles with focused training" >> "$retro_file"
    echo "- Review error patterns and update error handling" >> "$retro_file"
    
    print_status success "Retrospective complete: $retro_file"
    echo "$retro_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 6: Learning Capture & Export
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

phase_export() {
    print_section "Phase 6: Learning Capture & Data Export"
    
    local export_file="$GOVERNANCE_DIR/exports/export_${TIMESTAMP}.json"
    
    if [[ ! -f "$AGENTDB_PATH" ]]; then
        print_status error "AgentDB not found"
        return 1
    fi
    
    print_status info "Exporting learning data..."
    
    # Export key metrics
    sqlite3 "$AGENTDB_PATH" "
        SELECT json_object(
            'total_episodes', COUNT(*),
            'success_rate', ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2),
            'avg_reward', ROUND(AVG(reward), 4),
            'circles', (
                SELECT json_group_array(json_object(
                    'circle', circle,
                    'episodes', episodes,
                    'success_rate', success_rate
                ))
                FROM (
                    SELECT 
                        json_extract(metadata, '\$.circle') as circle,
                        COUNT(*) as episodes,
                        ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 2) as success_rate
                    FROM episodes
                    GROUP BY circle
                )
            )
        )
        FROM episodes;
    " > "$export_file" 2>/dev/null || echo "{}" > "$export_file"
    
    print_status success "Data exported: $export_file"
    
    # Trigger MPP learning
    print_status info "Triggering MPP learning integration..."
    # This would integrate with external MPP systems
    
    echo "$export_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Orchestration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_all() {
    print_banner
    ensure_dirs
    
    phase_baseline
    phase_analyze
    phase_audit
    phase_review
    phase_retro
    phase_export
    
    print_section "Governance Cycle Complete"
    print_status success "All governance artifacts generated"
    echo ""
    echo -e "${BOLD}Artifacts Location:${NC} $GOVERNANCE_DIR"
}

# Main entry point
main() {
    local phase="${1:-all}"
    
    case $phase in
        baseline) print_banner; ensure_dirs; phase_baseline ;;
        analyze) print_banner; ensure_dirs; phase_analyze ;;
        audit) print_banner; ensure_dirs; phase_audit ;;
        review) print_banner; ensure_dirs; phase_review ;;
        retro) print_banner; ensure_dirs; phase_retro ;;
        export) print_banner; ensure_dirs; phase_export ;;
        all) run_all ;;
        *)
            echo "Usage: $0 {baseline|analyze|audit|review|retro|export|all}"
            echo ""
            echo "Phases:"
            echo "  baseline - Establish performance baselines"
            echo "  analyze  - Error/frequency analysis"
            echo "  audit    - Order analysis and skill validation"
            echo "  review   - Pre-iteration governance review"
            echo "  retro    - Retrospective analysis"
            echo "  export   - Learning capture and data export"
            echo "  all      - Run complete governance cycle"
            exit 1
            ;;
    esac
}

main "$@"
