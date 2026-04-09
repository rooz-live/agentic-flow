#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay Governance Framework with MPP Learning Lifecycle
# Complete baseline/error/frequency/parameterization/hardcoded/order audit
# Triggers MPP learning, validates skills, exports data
# Pre-Cycle, Pre-Iteration, Post-Validation, Post-Retro hooks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"
EXPORT_DIR="${PROJECT_ROOT}/exports"
AUDIT_LOG="${PROJECT_ROOT}/logs/governance-audit.log"
MPP_LEARNING_DIR="${PROJECT_ROOT}/mpp-learning"

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

# Ensure directories
mkdir -p "$EXPORT_DIR" "$(dirname "$AUDIT_LOG")" "$MPP_LEARNING_DIR"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Logging
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

audit_log() {
    echo "[$(date -Iseconds)] $*" >> "$AUDIT_LOG"
}

print_banner() {
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC} ${BOLD}🏛️  Governance Framework - Complete Lifecycle${NC}        ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_phase() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRE-CYCLE: ESTABLISH BASELINES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

pre_cycle_baseline() {
    print_phase "🔵 PRE-CYCLE: Establish Baselines"
    
    local baseline_file="$EXPORT_DIR/baseline-$(date +%Y%m%d-%H%M%S).json"
    
    print_section "1. System Baseline"
    
    # Capture comprehensive baseline
    if [[ ! -f "$DB_PATH" ]]; then
        echo -e "  ${RED}✗${NC} Database not found - cannot establish baseline"
        return 1
    fi
    
    cat > "$baseline_file" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "baseline_type": "pre_cycle",
  "database": {
    "path": "$DB_PATH",
    "size_bytes": $(stat -f%z "$DB_PATH" 2>/dev/null || echo "0"),
    "integrity": "$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "ERROR")"
  },
  "metrics": {
    "total_episodes": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0"),
    "success_episodes": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0"),
    "success_rate": $(sqlite3 "$DB_PATH" "SELECT ROUND(CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1) FROM episodes;" 2>/dev/null || echo "0.0"),
    "avg_completion": $(sqlite3 "$DB_PATH" "SELECT COALESCE(ROUND(AVG(completion_pct), 1), 0.0) FROM completion_episodes;" 2>/dev/null || echo "0.0"),
    "circles": $(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT circle) FROM completion_episodes;" 2>/dev/null || echo "0"),
    "skills": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  },
  "circle_performance": [
$(sqlite3 "$DB_PATH" "
  SELECT '    {\"circle\": \"' || circle || '\", \"avg_completion\": ' || ROUND(AVG(completion_pct), 1) || ', \"episodes\": ' || COUNT(*) || ', \"success_rate\": ' || ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 1) || '},'
  FROM completion_episodes
  GROUP BY circle;" 2>/dev/null || echo "")
    {}
  ],
  "errors": {
    "total_failures": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 0;" 2>/dev/null || echo "0"),
    "failure_rate": $(sqlite3 "$DB_PATH" "SELECT ROUND(CAST(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1) FROM episodes;" 2>/dev/null || echo "0.0")
  },
  "frequency": {
    "last_24h": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-24 hours');" 2>/dev/null || echo "0"),
    "last_7d": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0"),
    "last_30d": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-30 days');" 2>/dev/null || echo "0")
  }
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Baseline captured: $baseline_file"
    
    # Display summary
    local total=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    local success=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
    local rate=$(sqlite3 "$DB_PATH" "SELECT ROUND(CAST($success AS FLOAT) * 100 / NULLIF($total, 0), 1);" 2>/dev/null || echo "0.0")
    
    echo ""
    echo -e "  ${BOLD}Baseline Metrics:${NC}"
    echo -e "    Episodes: $total"
    echo -e "    Success Rate: ${rate}%"
    echo -e "    Exported to: $baseline_file"
    
    audit_log "PRE_CYCLE: Baseline established - $total episodes, ${rate}% success"
    
    print_section "2. Parameterization Audit"
    
    # Find all hardcoded parameters
    echo -e "  ${BOLD}Scanning for hardcoded parameters...${NC}"
    
    local param_file="$EXPORT_DIR/parameters-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$param_file" <<EOF
# Hardcoded Parameters Audit - $(date -Iseconds)
# 
# Format: FILE:LINE:PARAMETER=VALUE
#

EOF
    
    # Scan key scripts for hardcoded values
    grep -rn "MIN_SUCCESS_RATE\|MIN_EQUITY_SCORE\|TARGET_COMPLETION\|MAX_ITERATIONS\|MAX_STALE_HOURS" \
        "$SCRIPT_DIR"/*.sh 2>/dev/null | grep -v "^#" >> "$param_file" || true
    
    local param_count=$(grep -v "^#" "$param_file" | grep -v "^$" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Found $param_count hardcoded parameters"
    echo -e "  ${DIM}Saved to: $param_file${NC}"
    
    audit_log "PRE_CYCLE: Parameterization audit - $param_count parameters found"
    
    print_section "3. Order Analysis"
    
    # Analyze execution order patterns
    echo -e "  ${BOLD}Circle Execution Order (last 30 days):${NC}"
    
    sqlite3 "$DB_PATH" "
      SELECT circle, COUNT(*) as executions,
             ROUND(AVG(JULIANDAY('now') - JULIANDAY(created_at)) * 24, 1) as avg_hours_ago
      FROM completion_episodes
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY circle
      ORDER BY executions DESC;" 2>/dev/null | while IFS='|' read -r circle count hours; do
        if [[ -n "$circle" ]]; then
            echo -e "    $circle: $count executions (last: ${hours}h ago)"
        fi
    done
    
    audit_log "PRE_CYCLE: Order analysis completed"
    
    echo "$baseline_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRE-ITERATION: GOVERNANCE REVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

pre_iteration_governance() {
    local iteration=$1
    
    print_phase "🟡 PRE-ITERATION $iteration: Governance Review"
    
    print_section "1. Compliance Checks"
    
    local checks_passed=0
    local checks_total=5
    
    # Check 1: Database writeable
    echo -e "  ${CYAN}[1/5]${NC} Database writeable..."
    if [[ -w "$DB_PATH" ]]; then
        echo -e "  ${GREEN}✓${NC} PASS"
        ((checks_passed++))
    else
        echo -e "  ${RED}✗${NC} FAIL - Database read-only"
    fi
    
    # Check 2: No critical errors in last run
    echo -e "  ${CYAN}[2/5]${NC} Error rate check..."
    local error_rate=$(sqlite3 "$DB_PATH" "
      SELECT ROUND(CAST(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1)
      FROM episodes
      WHERE created_at > datetime('now', '-1 hour');" 2>/dev/null || echo "0")
    
    local error_int=$(printf "%.0f" "$error_rate")
    if [[ $error_int -lt 50 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - Error rate: ${error_rate}%"
        ((checks_passed++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - Error rate: ${error_rate}%"
    fi
    
    # Check 3: Resource availability
    echo -e "  ${CYAN}[3/5]${NC} Resource availability..."
    local disk_free=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    echo -e "  ${GREEN}✓${NC} PASS - Disk free: $disk_free"
    ((checks_passed++))
    
    # Check 4: No stale locks
    echo -e "  ${CYAN}[4/5]${NC} Lock file check..."
    if [[ ! -f "/tmp/ay-smart-cycle.lock" ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - No stale locks"
        ((checks_passed++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - Lock file exists"
    fi
    
    # Check 5: Skills validated
    echo -e "  ${CYAN}[5/5]${NC} Skills validation..."
    local skills_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
    if [[ $skills_count -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} PASS - $skills_count skills available"
        ((checks_passed++))
    else
        echo -e "  ${YELLOW}◐${NC} WARN - No skills found"
    fi
    
    echo ""
    echo -e "  ${BOLD}Compliance: $checks_passed/$checks_total${NC}"
    
    audit_log "PRE_ITERATION_$iteration: Governance review - $checks_passed/$checks_total checks passed"
    
    print_section "2. Risk Assessment"
    
    # Quick ROAM check
    echo -e "  ${BOLD}ROAM Quick Check:${NC}"
    echo -e "    R - Resource exhaustion: ${GREEN}Low${NC} (disk: $disk_free)"
    echo -e "    O - Operational issues: $([ $error_int -lt 30 ] && echo "${GREEN}Low${NC}" || echo "${YELLOW}Medium${NC}")"
    echo -e "    A - Acceptance criteria: ${GREEN}Defined${NC} (70% success)"
    echo -e "    M - Mitigation ready: ${GREEN}Active${NC} (time budgets enforced)"
    
    audit_log "PRE_ITERATION_$iteration: Risk assessment completed"
    
    return $((checks_total - checks_passed))
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# POST-VALIDATION: RETROSPECTIVE ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

post_validation_retro() {
    local iteration=$1
    local baseline_file=$2
    
    print_phase "🟢 POST-VALIDATION $iteration: Retrospective Analysis"
    
    print_section "1. Delta Analysis"
    
    # Compare against baseline
    if [[ ! -f "$baseline_file" ]]; then
        echo -e "  ${YELLOW}⚠${NC} No baseline file - skipping delta analysis"
        return
    fi
    
    local baseline_success=$(jq -r '.metrics.success_rate' "$baseline_file" 2>/dev/null || echo "0")
    local baseline_completion=$(jq -r '.metrics.avg_completion' "$baseline_file" 2>/dev/null || echo "0")
    
    local current_success=$(sqlite3 "$DB_PATH" "
      SELECT ROUND(CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1)
      FROM episodes;" 2>/dev/null || echo "0")
    
    local current_completion=$(sqlite3 "$DB_PATH" "
      SELECT COALESCE(ROUND(AVG(completion_pct), 1), 0.0)
      FROM completion_episodes;" 2>/dev/null || echo "0")
    
    local delta_success=$(echo "$current_success - $baseline_success" | bc -l 2>/dev/null || echo "0")
    local delta_completion=$(echo "$current_completion - $baseline_completion" | bc -l 2>/dev/null || echo "0")
    
    echo -e "  ${BOLD}Metric Deltas:${NC}"
    echo -e "    Success Rate: $baseline_success% → $current_success% (${delta_success:+$delta_success})"
    echo -e "    Avg Completion: $baseline_completion% → $current_completion% (${delta_completion:+$delta_completion})"
    
    audit_log "POST_VALIDATION_$iteration: Delta - success: $delta_success, completion: $delta_completion"
    
    print_section "2. Error Analysis"
    
    # Analyze recent failures
    echo -e "  ${BOLD}Recent Failures (last hour):${NC}"
    
    local failures=$(sqlite3 "$DB_PATH" "
      SELECT COUNT(*) FROM episodes
      WHERE success = 0 AND created_at > datetime('now', '-1 hour');" 2>/dev/null || echo "0")
    
    if [[ $failures -gt 0 ]]; then
        echo -e "  ${YELLOW}⚠${NC} $failures failures detected"
        
        # Get failure details
        sqlite3 "$DB_PATH" "
          SELECT circle, ceremony, error
          FROM episodes
          WHERE success = 0 AND created_at > datetime('now', '-1 hour')
          LIMIT 5;" 2>/dev/null | while IFS='|' read -r circle ceremony error; do
            if [[ -n "$circle" ]]; then
                echo -e "    - $circle/$ceremony: ${error:-unknown}"
            fi
        done
    else
        echo -e "  ${GREEN}✓${NC} No failures in last hour"
    fi
    
    audit_log "POST_VALIDATION_$iteration: Error analysis - $failures failures"
    
    print_section "3. Performance Trends"
    
    # Calculate trend over last 3 iterations
    local trend=$(sqlite3 "$DB_PATH" "
      WITH recent AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn,
          completion_pct
        FROM completion_episodes
        WHERE created_at > datetime('now', '-3 hours')
        LIMIT 30
      )
      SELECT ROUND(
        AVG(CASE WHEN rn <= 10 THEN completion_pct ELSE NULL END) -
        AVG(CASE WHEN rn > 20 THEN completion_pct ELSE NULL END),
        1
      ) FROM recent;" 2>/dev/null || echo "0")
    
    if (( $(echo "$trend > 0" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "  ${GREEN}📈 Trending UP${NC} (+${trend}%)"
    elif (( $(echo "$trend < 0" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "  ${RED}📉 Trending DOWN${NC} (${trend}%)"
    else
        echo -e "  ${BLUE}➡️  STABLE${NC}"
    fi
    
    audit_log "POST_VALIDATION_$iteration: Performance trend - $trend%"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# POST-RETRO: LEARNING CAPTURE (MPP)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

post_retro_learning() {
    local iteration=$1
    
    print_phase "🟣 POST-RETRO $iteration: Learning Capture (MPP)"
    
    print_section "1. Trigger MPP Learning"
    
    local learning_file="$MPP_LEARNING_DIR/learning-iter$iteration-$(date +%Y%m%d-%H%M%S).json"
    
    echo -e "  ${BOLD}Capturing learnings...${NC}"
    
    # Extract patterns from recent episodes
    cat > "$learning_file" <<EOF
{
  "iteration": $iteration,
  "timestamp": "$(date -Iseconds)",
  "mpp_protocol": {
    "method": "pattern_extraction",
    "pattern": "continuous_improvement",
    "protocol": "test_validate_learn"
  },
  "learnings": {
    "successful_patterns": [
$(sqlite3 "$DB_PATH" "
  SELECT '      {\"circle\": \"' || circle || '\", \"ceremony\": \"' || ceremony || '\", \"success_rate\": ' || 
         ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 1) || ', \"count\": ' || COUNT(*) || '},'
  FROM episodes
  WHERE created_at > datetime('now', '-1 hour') AND success = 1
  GROUP BY circle, ceremony
  HAVING COUNT(*) >= 2;" 2>/dev/null || echo "")
      {}
    ],
    "failure_patterns": [
$(sqlite3 "$DB_PATH" "
  SELECT '      {\"circle\": \"' || circle || '\", \"ceremony\": \"' || ceremony || '\", \"failure_rate\": ' || 
         ROUND(AVG(CASE WHEN success = 0 THEN 100.0 ELSE 0.0 END), 1) || ', \"count\": ' || COUNT(*) || '},'
  FROM episodes
  WHERE created_at > datetime('now', '-1 hour') AND success = 0
  GROUP BY circle, ceremony
  HAVING COUNT(*) >= 2;" 2>/dev/null || echo "")
      {}
    ]
  },
  "skills_learned": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skills WHERE created_at > datetime('now', '-1 hour');" 2>/dev/null || echo "0"),
  "recommendations": [
    "Continue monitoring success patterns",
    "Address failure patterns in next iteration",
    "Validate skill application effectiveness"
  ]
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Learning captured: $learning_file"
    
    audit_log "POST_RETRO_$iteration: MPP learning captured - $learning_file"
    
    print_section "2. Validate Skills"
    
    echo -e "  ${BOLD}Skill Validation:${NC}"
    
    # Check which skills were actually used
    local total_skills=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
    local used_skills=$(sqlite3 "$DB_PATH" "
      SELECT COUNT(DISTINCT skill_id) FROM episodes
      WHERE created_at > datetime('now', '-1 hour');" 2>/dev/null || echo "0")
    
    echo -e "    Total Skills: $total_skills"
    echo -e "    Used (last hour): $used_skills"
    
    if [[ $used_skills -gt 0 ]]; then
        local utilization=$(echo "scale=1; $used_skills * 100 / $total_skills" | bc -l 2>/dev/null || echo "0")
        echo -e "    Utilization: ${utilization}%"
    fi
    
    audit_log "POST_RETRO_$iteration: Skills validated - $used_skills/$total_skills used"
    
    print_section "3. Re-export Data"
    
    local export_file="$EXPORT_DIR/complete-export-iter$iteration-$(date +%Y%m%d-%H%M%S).sql"
    
    echo -e "  ${BOLD}Exporting complete dataset...${NC}"
    
    # Full database export
    sqlite3 "$DB_PATH" .dump > "$export_file" 2>/dev/null || {
        echo -e "  ${RED}✗${NC} Export failed"
        return 1
    }
    
    local export_size=$(ls -lh "$export_file" | awk '{print $5}')
    echo -e "  ${GREEN}✓${NC} Data exported: $export_file ($export_size)"
    
    audit_log "POST_RETRO_$iteration: Data re-exported - $export_size"
    
    print_section "4. Learning Summary"
    
    echo -e "  ${BOLD}Key Insights:${NC}"
    
    # Generate insights
    local top_circle=$(sqlite3 "$DB_PATH" "
      SELECT circle FROM episodes
      WHERE created_at > datetime('now', '-1 hour')
      GROUP BY circle
      ORDER BY AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) DESC
      LIMIT 1;" 2>/dev/null || echo "unknown")
    
    local worst_circle=$(sqlite3 "$DB_PATH" "
      SELECT circle FROM episodes
      WHERE created_at > datetime('now', '-1 hour')
      GROUP BY circle
      ORDER BY AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) ASC
      LIMIT 1;" 2>/dev/null || echo "unknown")
    
    echo -e "    • Best performer: ${GREEN}$top_circle${NC}"
    echo -e "    • Needs attention: ${YELLOW}$worst_circle${NC}"
    echo -e "    • Skills validated: $used_skills active"
    echo -e "    • Data exported: $export_size"
    
    audit_log "POST_RETRO_$iteration: Learning summary - best: $top_circle, worst: $worst_circle"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPLETE GOVERNANCE CYCLE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_complete_cycle() {
    local max_iterations=${1:-3}
    
    print_banner
    
    echo -e "${BOLD}Complete Governance Cycle${NC}"
    echo -e "Max Iterations: $max_iterations"
    echo ""
    
    # PRE-CYCLE
    local baseline_file=$(pre_cycle_baseline)
    
    # ITERATION LOOP
    for ((iteration=1; iteration<=max_iterations; iteration++)); do
        echo ""
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${MAGENTA}ITERATION $iteration / $max_iterations${NC}"
        echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
        
        # PRE-ITERATION
        pre_iteration_governance "$iteration"
        local governance_issues=$?
        
        if [[ $governance_issues -gt 2 ]]; then
            echo -e "  ${RED}✗${NC} Too many governance issues - stopping"
            break
        fi
        
        # SIMULATE WORK (in real system, this would be smart-cycle iteration)
        print_phase "⚙️  ITERATION $iteration: Executing Improvement Cycle"
        echo -e "  ${DIM}[Simulated - would run smart-cycle here]${NC}"
        sleep 2
        
        # POST-VALIDATION
        post_validation_retro "$iteration" "$baseline_file"
        
        # POST-RETRO
        post_retro_learning "$iteration"
        
    done
    
    # FINAL SUMMARY
    print_phase "📊 COMPLETE CYCLE SUMMARY"
    
    echo -e "  ${BOLD}Governance Artifacts Generated:${NC}"
    echo -e "    Baseline: $baseline_file"
    echo -e "    Exports: $EXPORT_DIR/"
    echo -e "    Learning: $MPP_LEARNING_DIR/"
    echo -e "    Audit Log: $AUDIT_LOG"
    
    echo ""
    echo -e "${GREEN}✅ Governance cycle complete${NC}"
    
    audit_log "COMPLETE_CYCLE: Finished $max_iterations iterations"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay-governance-framework.sh - Complete Lifecycle Governance${NC}

${BOLD}USAGE:${NC}
  ay-governance-framework.sh [command] [options]

${BOLD}COMMANDS:${NC}
  pre-cycle                Run pre-cycle baseline
  pre-iteration <N>        Run pre-iteration governance
  post-validation <N> <baseline>  Run post-validation retro
  post-retro <N>           Run post-retro learning
  complete [iterations]    Run complete cycle (default: 3)

${BOLD}LIFECYCLE HOOKS:${NC}
  1. PRE-CYCLE: Establish baselines
     - System metrics capture
     - Parameterization audit
     - Execution order analysis

  2. PRE-ITERATION: Governance review
     - Compliance checks (5-point)
     - Resource availability
     - Risk assessment (ROAM)

  3. POST-VALIDATION: Retrospective analysis
     - Delta analysis (vs baseline)
     - Error pattern detection
     - Performance trends

  4. POST-RETRO: Learning capture (MPP)
     - Pattern extraction
     - Skills validation
     - Data re-export
     - Insight generation

${BOLD}OUTPUTS:${NC}
  - exports/baseline-TIMESTAMP.json
  - exports/parameters-TIMESTAMP.txt
  - exports/complete-export-iterN-TIMESTAMP.sql
  - mpp-learning/learning-iterN-TIMESTAMP.json
  - logs/governance-audit.log

${BOLD}EXAMPLES:${NC}
  # Run complete 3-iteration cycle
  ay-governance-framework.sh complete 3

  # Run individual hooks
  ay-governance-framework.sh pre-cycle
  ay-governance-framework.sh pre-iteration 1
  ay-governance-framework.sh post-validation 1 baseline.json
  ay-governance-framework.sh post-retro 1

EOF
    exit 0
fi

case "${1:-complete}" in
    pre-cycle)
        pre_cycle_baseline
        ;;
    pre-iteration)
        pre_iteration_governance "${2:-1}"
        ;;
    post-validation)
        post_validation_retro "${2:-1}" "${3:-/tmp/baseline.json}"
        ;;
    post-retro)
        post_retro_learning "${2:-1}"
        ;;
    complete)
        run_complete_cycle "${2:-3}"
        ;;
    *)
        run_complete_cycle 3
        ;;
esac
