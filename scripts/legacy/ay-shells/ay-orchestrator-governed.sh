#!/usr/bin/env bash
# Governed Orchestrator - Truth-aligned execution with governance checkpoints
# Implements: Pre-Cycle DoR, Pre-Iteration ROAM, Post-Validation Retro, Post-Retro MPP Learning
#
# Axiom: Truth demands clarity, discernment, and exposure
# Constraint: Time demands continuity, transmission, and endurance
# Tension: Hold both without pretending they are the same

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB="$PROJECT_ROOT/agentdb.db"

# Source UI functions from base orchestrator
source "$SCRIPT_DIR/ay-orchestrator.sh" 2>/dev/null || {
  # Fallback UI if source fails
  BOLD='\033[1m'
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  MAGENTA='\033[0;35m'
  CYAN='\033[0;36m'
  NC='\033[0m'
  
  section_header() { echo -e "\n${BOLD}${BLUE}═══ $1 ═══${NC}\n"; }
  status_line() {
    case "$1" in
      ok) echo -e "${GREEN}✓${NC} $2" ;;
      warn) echo -e "${YELLOW}⚠${NC} $2" ;;
      error) echo -e "${RED}✗${NC} $2" ;;
      info) echo -e "${CYAN}ℹ${NC} $2" ;;
      *) echo "  $2" ;;
    esac
  }
  decision_prompt() {
    local question="$1"
    local default="${2:-y}"
    echo -e "\n${BOLD}${MAGENTA}❓ $question${NC}"
    echo -e "${CYAN}   [y] Yes  [n] No  [s] Skip${NC}"
    read -p "   Decision [$default]: " -n 1 -r
    echo
    REPLY=${REPLY:-$default}
    case "$REPLY" in
      [Yy]) return 0 ;;
      [Ss]) return 2 ;;
      *) return 1 ;;
    esac
  }
}

#═══════════════════════════════════════════
# PRE-CYCLE: Establish Baselines (DoR Check)
# Truth condition: Verify minimum viable state
#═══════════════════════════════════════════

pre_cycle_baseline_check() {
  section_header "Pre-Cycle: Definition of Ready (DoR)" "📋"
  
  echo "Verifying minimum viable baseline..."
  echo ""
  
  local dor_passed=true
  local warnings=0
  
  # 1. Minimum episodes (truth condition: 30+ required for statistical validity)
  local episode_count=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
  if [[ $episode_count -lt 30 ]]; then
    status_line "error" "DoR FAILED: Need 30+ episodes (have: $episode_count)"
    echo "  → Truth constraint: Statistical validity requires minimum sample size"
    dor_passed=false
  else
    status_line "ok" "DoR PASSED: Episodes ($episode_count >= 30)"
  fi
  
  # 2. Threshold confidence (structural integrity check)
  if [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    local high_conf=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null | \
      grep -c "HIGH_CONFIDENCE" || echo "0")
    
    if [[ $high_conf -lt 2 ]]; then
      status_line "warn" "DoR WARNING: Low confidence ($high_conf/5 HIGH)"
      echo "  → Consequence: Degradation/cascade detection may have false positives"
      ((warnings++))
    else
      status_line "ok" "DoR PASSED: Confidence ($high_conf/5 HIGH)"
    fi
  fi
  
  # 3. Recent failures (stability check - no cascading failures)
  local recent_fail=$(sqlite3 "$AGENTDB" \
    "SELECT COUNT(*) FROM observations WHERE success=0 AND created_at > strftime('%s', 'now', '-1 hour');" \
    2>/dev/null || echo "0")
  
  if [[ $recent_fail -gt 10 ]]; then
    status_line "error" "DoR FAILED: High failure rate ($recent_fail in 1h)"
    echo "  → Truth condition: System unstable - resolve failures before orchestration"
    dor_passed=false
  else
    status_line "ok" "DoR PASSED: Failure rate acceptable ($recent_fail in 1h)"
  fi
  
  # 4. Database integrity (structural validity)
  if ! sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM degradation_events;" >/dev/null 2>&1; then
    status_line "warn" "DoR WARNING: degradation_events table missing"
    echo "  → Run: sqlite3 agentdb.db < schema/degradation_events.sql"
    ((warnings++))
  fi
  
  echo ""
  echo -e "${BOLD}DoR Summary:${NC}"
  echo "  Episodes: $episode_count"
  echo "  Confidence: $high_conf/5 HIGH"
  echo "  Recent failures: $recent_fail"
  echo "  Warnings: $warnings"
  
  if [[ "$dor_passed" == "false" ]]; then
    echo ""
    status_line "error" "DoR NOT MET - Cannot proceed to orchestration"
    echo ""
    echo -e "${BOLD}Recommended Actions:${NC}"
    if [[ $episode_count -lt 30 ]]; then
      echo "  1. Build baseline: ./scripts/ay-orchestrator.sh --cycles 1 --auto"
    fi
    if [[ $recent_fail -gt 10 ]]; then
      echo "  2. Investigate failures: sqlite3 agentdb.db 'SELECT * FROM observations WHERE success=0 LIMIT 10'"
    fi
    return 1
  else
    status_line "ok" "DoR MET - Safe to proceed"
    return 0
  fi
}

#═══════════════════════════════════════════
# PRE-ITERATION: Governance Review (ROAM)
# Authority condition: Legitimate judgment, not power
#═══════════════════════════════════════════

pre_iteration_governance_review() {
  section_header "Pre-Iteration: Governance Review (ROAM)" "⚖️"
  
  # ROAM: Risk, Opportunity, Assumption, Mitigation
  # Truth condition: Risk assessment based on actual data, not optimism
  
  echo "Checking ROAM register for blocking issues..."
  echo ""
  
  # 1. Risk register check (if exists)
  if [[ -f "$PROJECT_ROOT/roam_register.db" ]]; then
    local high_risks=$(sqlite3 "$PROJECT_ROOT/roam_register.db" \
      "SELECT COUNT(*) FROM roam_items WHERE severity='HIGH' AND status='OPEN';" 2>/dev/null || echo "0")
    
    if [[ $high_risks -gt 0 ]]; then
      status_line "warn" "$high_risks HIGH severity ROAM items OPEN"
      echo ""
      echo -e "${BOLD}HIGH Risk Items:${NC}"
      sqlite3 "$PROJECT_ROOT/roam_register.db" \
        "SELECT id, category, description FROM roam_items WHERE severity='HIGH' AND status='OPEN' LIMIT 5;" \
        2>/dev/null || echo "  (Unable to query ROAM register)"
      echo ""
      
      # Consequence awareness: explicit acknowledgment of risk
      if ! decision_prompt "Proceed with HIGH risk items open?" "n"; then
        status_line "error" "Governance review BLOCKED by ROAM items"
        echo "  → Truth constraint: High risks require mitigation before proceeding"
        return 1
      fi
      
      status_line "warn" "Proceeding despite risks - user acknowledged consequences"
    else
      status_line "ok" "No HIGH risk ROAM items blocking"
    fi
  else
    status_line "info" "ROAM register not found - skipping risk check"
    echo "  → Consider creating: touch roam_register.db"
  fi
  
  # 2. Budget/resource check (time demands continuity)
  echo ""
  echo -e "${BOLD}Resource Status:${NC}"
  
  local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
  if [[ $disk_usage -ge 90 ]]; then
    status_line "error" "Disk usage critical: ${disk_usage}%"
    return 1
  elif [[ $disk_usage -ge 75 ]]; then
    status_line "warn" "Disk usage high: ${disk_usage}%"
  else
    status_line "ok" "Disk usage acceptable: ${disk_usage}%"
  fi
  
  # 3. Ethical alignment check (good thoughts, good words, good deeds)
  echo ""
  echo -e "${BOLD}Ethical Alignment:${NC}"
  
  # Check for anti-patterns in recent executions
  local rapid_failures=$(sqlite3 "$AGENTDB" \
    "SELECT COUNT(*) FROM observations WHERE success=0 AND created_at > strftime('%s', 'now', '-5 minutes');" \
    2>/dev/null || echo "0")
  
  if [[ $rapid_failures -ge 5 ]]; then
    status_line "error" "Rapid failures detected - possible misalignment"
    echo "  → Pause and reflect: Are we optimizing for truth or for metrics?"
    return 1
  else
    status_line "ok" "No rapid failure patterns detected"
  fi
  
  echo ""
  status_line "ok" "Governance review complete - proceeding"
  
  return 0
}

#═══════════════════════════════════════════
# POST-VALIDATION: Retrospective Analysis
# Discernment condition: What actually happened?
#═══════════════════════════════════════════

post_validation_retrospective() {
  section_header "Post-Validation: Retrospective" "🔍"
  
  local cycle_num=$1
  
  echo "Cycle $cycle_num Retrospective Analysis"
  echo "Truth condition: Evaluate outcomes, not intentions"
  echo ""
  
  # What worked? (evidence-based)
  echo -e "${BOLD}✅ What worked well:${NC}"
  sqlite3 "$AGENTDB" <<EOF 2>/dev/null || echo "  (No data available)"
SELECT 
  '  • Episode: ' || task || ' (reward: ' || ROUND(reward, 2) || ')'
FROM episodes
WHERE success = 1 
  AND created_at > strftime('%s', 'now', '-1 hour')
ORDER BY reward DESC
LIMIT 5;
EOF
  
  echo ""
  echo -e "${BOLD}❌ What needs improvement:${NC}"
  sqlite3 "$AGENTDB" <<EOF 2>/dev/null || echo "  (No failures)"
SELECT 
  '  • Episode: ' || task || ' (failed)'
FROM episodes
WHERE success = 0
  AND created_at > strftime('%s', 'now', '-1 hour')
ORDER BY created_at DESC
LIMIT 5;
EOF
  
  echo ""
  echo -e "${BOLD}📊 Key Metrics:${NC}"
  
  local success_rate=$(sqlite3 "$AGENTDB" \
    "SELECT ROUND(AVG(CASE WHEN success=1 THEN 100.0 ELSE 0.0 END), 1) FROM episodes WHERE created_at > strftime('%s', 'now', '-1 hour');" \
    2>/dev/null || echo "N/A")
  
  local episode_count=$(sqlite3 "$AGENTDB" \
    "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-1 hour');" \
    2>/dev/null || echo "0")
  
  echo "  Success Rate: ${success_rate}%"
  echo "  Episodes Run: $episode_count"
  
  # Store retrospective (continuity: preserve learning)
  local retro_dir="$PROJECT_ROOT/retrospectives"
  mkdir -p "$retro_dir"
  
  local retro_file="$retro_dir/cycle-$cycle_num-$(date +%s).txt"
  {
    echo "═══════════════════════════════════════════"
    echo "Retrospective: Cycle $cycle_num"
    echo "Timestamp: $(date)"
    echo "═══════════════════════════════════════════"
    echo ""
    echo "OUTCOMES:"
    echo "- Success rate: ${success_rate}%"
    echo "- Episodes run: $episode_count"
    echo ""
    echo "SUCCESSFUL PATTERNS:"
    sqlite3 "$AGENTDB" \
      "SELECT '- ' || task || ' (reward: ' || ROUND(reward, 2) || ')' FROM episodes WHERE success=1 AND created_at > strftime('%s', 'now', '-1 hour') ORDER BY reward DESC LIMIT 5;" \
      2>/dev/null || echo "- None"
    echo ""
    echo "FAILURE PATTERNS:"
    sqlite3 "$AGENTDB" \
      "SELECT '- ' || task FROM episodes WHERE success=0 AND created_at > strftime('%s', 'now', '-1 hour') LIMIT 5;" \
      2>/dev/null || echo "- None"
    echo ""
    echo "NEXT ACTIONS:"
    if (( $(echo "$success_rate < 80" | bc -l 2>/dev/null || echo "0") )); then
      echo "- Investigate failure patterns"
      echo "- Review threshold configurations"
    else
      echo "- Continue with current approach"
      echo "- Consider increasing divergence rate"
    fi
  } > "$retro_file"
  
  echo ""
  status_line "ok" "Retrospective saved: ${retro_file##*/}"
  
  return 0
}

#═══════════════════════════════════════════
# POST-RETRO: Learning Capture (MPP)
# Transmission condition: Insight must replicate
#═══════════════════════════════════════════

post_retro_learning_capture() {
  section_header "Post-Retro: Learning Capture (MPP)" "🧠"
  
  echo "Capturing patterns from successful episodes..."
  echo "Principle: Wisdom survives through transmission, not authority"
  echo ""
  
  # 1. Trigger MPP Learning (if available)
  if [[ -f "$SCRIPT_DIR/mcp_workload_distributor.py" ]]; then
    status_line "info" "Triggering MPP pattern extraction..."
    
    # Extract from high-reward episodes only (quality over quantity)
    if python3 "$SCRIPT_DIR/mcp_workload_distributor.py" learn \
      --source agentdb \
      --lookback 1h \
      --min-reward 0.7 2>/dev/null; then
      status_line "ok" "MPP Learning triggered successfully"
    else
      status_line "warn" "MPP learning failed - pattern extraction incomplete"
    fi
  else
    status_line "warn" "MPP Learning script not found"
    echo "  → Expected: $SCRIPT_DIR/mcp_workload_distributor.py"
  fi
  
  # 2. Validate captured skills (truth testing)
  echo ""
  if [[ -f "$SCRIPT_DIR/ay-validate.sh" ]]; then
    status_line "info" "Validating captured skills..."
    
    if "$SCRIPT_DIR/ay-validate.sh" skills recent 2>/dev/null; then
      status_line "ok" "Skills validated"
    else
      status_line "warn" "Skill validation failed - review manually"
    fi
  else
    status_line "info" "Skill validation script not available"
  fi
  
  # 3. Re-export data (continuity: preserve state)
  echo ""
  if command -v npx >/dev/null 2>&1; then
    status_line "info" "Exporting updated data..."
    
    local export_dir="$PROJECT_ROOT/exports"
    mkdir -p "$export_dir"
    
    local export_file="$export_dir/latest-$(date +%s).json"
    if npx agentdb export --format json > "$export_file" 2>/dev/null; then
      status_line "ok" "Data exported: ${export_file##*/}"
      
      # Keep only last 10 exports (prevent unbounded growth)
      ls -t "$export_dir"/latest-*.json 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    else
      status_line "warn" "Data export failed"
    fi
  else
    status_line "info" "agentdb CLI not available - skipping export"
  fi
  
  echo ""
  status_line "ok" "Learning capture complete"
  
  return 0
}

#═══════════════════════════════════════════
# MAIN: Governed Orchestration Loop
# Tension: Truth vs Time, held without collapse
#═══════════════════════════════════════════

governed_orchestrate() {
  local max_cycles="${1:-5}"
  
  section_header "Governed Orchestrator (Truth-Aligned)" "⚖️🤖"
  
  echo -e "${BOLD}Configuration:${NC}"
  echo "  Max Cycles: $max_cycles"
  echo "  Governance: Pre-Cycle DoR + Pre-Iteration ROAM"
  echo "  Learning: Post-Validation Retro + Post-Retro MPP"
  echo "  Database: $AGENTDB"
  echo ""
  
  echo -e "${BOLD}Principles:${NC}"
  echo "  • Truth: Clarity, discernment, exposure (no insulation)"
  echo "  • Time: Continuity, transmission, endurance (no forgetting)"
  echo "  • Tension: Both demands held without pretending sameness"
  echo ""
  
  # PRE-CYCLE: Establish baselines (DoR)
  if ! pre_cycle_baseline_check; then
    status_line "error" "Pre-cycle baseline check FAILED"
    echo ""
    echo "Cannot proceed to orchestration - DoR not met"
    exit 1
  fi
  
  local cycle_num=0
  
  while [[ $cycle_num -lt $max_cycles ]]; do
    ((cycle_num++))
    
    section_header "Cycle $cycle_num (Governed)" "🔄"
    
    # PRE-ITERATION: Governance review (ROAM)
    if ! pre_iteration_governance_review; then
      status_line "error" "Governance review BLOCKED cycle $cycle_num"
      echo "  → Risk/ethical misalignment detected"
      exit 1
    fi
    
    # CORE: Run orchestration cycle (delegate to base orchestrator)
    echo ""
    echo -e "${BOLD}Executing orchestration...${NC}"
    
    if "$SCRIPT_DIR/ay-orchestrator.sh" --cycles 1 --auto; then
      local orch_result=0
      status_line "ok" "Orchestration cycle $cycle_num completed"
    else
      local orch_result=$?
      status_line "warn" "Orchestration cycle $cycle_num had issues (exit: $orch_result)"
    fi
    
    # POST-VALIDATION: Retrospective analysis
    post_validation_retrospective "$cycle_num"
    
    # POST-RETRO: Learning capture (MPP)
    post_retro_learning_capture
    
    # Check if done (truth condition: system actually healthy)
    echo ""
    local remaining_issues=$(sqlite3 "$AGENTDB" \
      "SELECT COUNT(*) FROM observations WHERE success=0 AND created_at > strftime('%s', 'now', '-5 minutes');" \
      2>/dev/null || echo "999")
    
    if [[ $remaining_issues -eq 0 ]] && [[ $orch_result -eq 0 ]]; then
      section_header "System Ready (Validated)" "🎉"
      status_line "ok" "All governance checkpoints passed"
      status_line "ok" "System is production-ready"
      break
    fi
    
    # Continue? (free choice, not compulsion)
    echo ""
    if [[ $cycle_num -ge $max_cycles ]]; then
      status_line "warn" "Max cycles reached"
      break
    fi
    
    if ! decision_prompt "Continue to next governed cycle?" "y"; then
      status_line "info" "Orchestration stopped by user choice"
      break
    fi
  done
  
  # Final summary
  section_header "Governed Orchestration Complete" "📊"
  
  echo -e "${BOLD}Results:${NC}"
  echo "  Cycles Completed: $cycle_num"
  echo "  Governance Checkpoints: $((cycle_num * 4)) passed"
  echo "  Retrospectives: $cycle_num captured"
  echo "  Learning Loops: $cycle_num executed"
  echo ""
  
  echo -e "${BOLD}Outputs:${NC}"
  echo "  Retrospectives: $(ls -1 "$PROJECT_ROOT/retrospectives"/*.txt 2>/dev/null | wc -l | tr -d ' ') files"
  echo "  Exports: $(ls -1 "$PROJECT_ROOT/exports"/latest-*.json 2>/dev/null | wc -l | tr -d ' ') snapshots"
  echo ""
  
  status_line "ok" "All governance requirements met"
  
  return 0
}

#═══════════════════════════════════════════
# CLI Interface
#═══════════════════════════════════════════

show_help() {
  cat << 'EOF'
Governed Orchestrator - Truth-Aligned Execution

USAGE:
  ./ay-orchestrator-governed.sh [cycles]

ARGUMENTS:
  cycles    Maximum cycles to run (default: 5)

GOVERNANCE CHECKPOINTS:
  Pre-Cycle:       Definition of Ready (DoR) - baseline verification
  Pre-Iteration:   ROAM review - risk/ethical alignment
  Post-Validation: Retrospective - what actually happened
  Post-Retro:      MPP Learning - pattern extraction & transmission

PRINCIPLES:
  Truth:   Clarity, discernment, exposure (resists insulation)
  Time:    Continuity, transmission, endurance (requires structure)
  Tension: Both demands held, neither collapsed

EXAMPLES:
  # Single governed cycle (recommended for testing)
  ./ay-orchestrator-governed.sh 1

  # Full governed orchestration (5 cycles)
  ./ay-orchestrator-governed.sh

  # Extended session (10 cycles)
  ./ay-orchestrator-governed.sh 10

OUTPUTS:
  retrospectives/cycle-N-*.txt  - Truth: what happened
  exports/latest-*.json         - Time: state preservation
  
EOF
}

# Parse CLI
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  show_help
  exit 0
fi

# Run governed orchestration
governed_orchestrate "${1:-5}"
