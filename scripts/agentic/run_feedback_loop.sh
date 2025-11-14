#!/usr/bin/env bash
# run_feedback_loop.sh - Execute complete Build-Measure-Learn cycle
# Zero context-switching: All in one command

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Source environment shims
if [[ -f "${PROJECT_ROOT}/scripts/policy/env_shim.sh" ]]; then
  source "${PROJECT_ROOT}/scripts/policy/env_shim.sh"
fi

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SAFETY_CHECK="${SAFETY_CHECK:-1}"
DRY_RUN="${DRY_RUN:-0}"
VERBOSE="${VERBOSE:-0}"

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" >&2
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

info() {
  echo -e "${BLUE}[INFO]${NC} $*" >&2
}

# PHASE 1: Safety checks
run_safety_checks() {
  log "PHASE 1: Safety Checks"
  
  if [[ "${SAFETY_CHECK}" != "1" ]]; then
    warn "Safety checks disabled (SAFETY_CHECK=0)"
    return 0
  fi
  
  # Check for new .md files
  if [[ -x "${PROJECT_ROOT}/scripts/policy/no_new_md_guard.sh" ]]; then
    info "Checking for new .md files..."
    if ! bash "${PROJECT_ROOT}/scripts/policy/no_new_md_guard.sh" --check; then
      error "New .md files detected! Policy violation."
      exit 1
    fi
    info "✓ NO-NEW-MD policy compliant"
  else
    warn "no_new_md_guard.sh not found or not executable"
  fi
  
  # Verify databases exist
  if [[ -f "${PROJECT_ROOT}/.agentdb/agentdb.sqlite" ]]; then
    info "✓ AgentDB found"
  else
    warn "AgentDB not found at .agentdb/agentdb.sqlite"
  fi
  
  if [[ -f "${PROJECT_ROOT}/metrics/risk_analytics_baseline.db" ]]; then
    info "✓ Risk Analytics DB found"
  else
    warn "Risk Analytics DB not found"
  fi
  
  echo ""
}

# PHASE 2: Capture metrics (MEASURE)
capture_metrics() {
  log "PHASE 2: Capture Metrics (MEASURE)"
  
  if [[ -x "${PYTHON3}" ]] && [[ -f "${PROJECT_ROOT}/scripts/agentic/bootstrap_local_metrics.py" ]]; then
    info "Capturing baseline metrics..."
    if [[ "${DRY_RUN}" == "1" ]]; then
      info "[DRY RUN] Would run: ${PYTHON3} bootstrap_local_metrics.py"
    else
      cd "${PROJECT_ROOT}"
      if "${PYTHON3}" scripts/agentic/bootstrap_local_metrics.py; then
        info "✓ Metrics captured successfully"
      else
        warn "Metrics capture failed (non-fatal)"
      fi
    fi
  else
    warn "bootstrap_local_metrics.py not found or Python not available"
  fi
  
  echo ""
}

# PHASE 3: Link metrics to retrospective (LEARN)
link_metrics_to_retro() {
  log "PHASE 3: Link Metrics to Retrospective (LEARN)"
  
  if [[ -f "${PROJECT_ROOT}/scripts/link_metrics_to_retro.sh" ]]; then
    info "Linking metrics to retrospective insights..."
    if [[ "${DRY_RUN}" == "1" ]]; then
      info "[DRY RUN] Would run: bash link_metrics_to_retro.sh"
    else
      cd "${PROJECT_ROOT}"
      if bash scripts/link_metrics_to_retro.sh; then
        info "✓ Metrics linked successfully"
        if [[ -f ".goalie/metrics_dashboard.md" ]]; then
          info "Dashboard generated: .goalie/metrics_dashboard.md"
        fi
      else
        warn "Metrics linkage failed (non-fatal)"
      fi
    fi
  else
    warn "link_metrics_to_retro.sh not found"
  fi
  
  echo ""
}

# PHASE 4: Show unified status
show_status() {
  log "PHASE 4: Unified Status"
  
  if [[ -x "${PROJECT_ROOT}/scripts/agentic/unified_tool_interface.sh" ]]; then
    info "Fetching system status..."
    if [[ "${DRY_RUN}" == "1" ]]; then
      info "[DRY RUN] Would run: unified_tool_interface.sh status"
    else
      bash "${PROJECT_ROOT}/scripts/agentic/unified_tool_interface.sh" status || warn "Status check failed"
    fi
  else
    warn "unified_tool_interface.sh not found"
  fi
  
  echo ""
}

# PHASE 5: Next actions (BUILD)
show_next_actions() {
  log "PHASE 5: Next Actions (BUILD)"
  
  # Parse metrics_dashboard.md for top 3 WSJF items
  if [[ -f "${PROJECT_ROOT}/.goalie/metrics_dashboard.md" ]]; then
    info "Top 3 WSJF-ranked action items:"
    grep -A 1 "HIGH - WSJF" "${PROJECT_ROOT}/.goalie/metrics_dashboard.md" | head -n 6 || true
  else
    warn "metrics_dashboard.md not found"
  fi
  
  # Show quick wins status
  if [[ -f "${PROJECT_ROOT}/docs/QUICK_WINS.md" ]]; then
    info "Quick Wins progress:"
    grep -E "^\*\*Status\*\*:|^\*\*Progress\*\*:" "${PROJECT_ROOT}/docs/QUICK_WINS.md" | tail -n 2 || true
  fi
  
  echo ""
  info "Complete Build-Measure-Learn cycle DONE!"
  info "Review .goalie/metrics_dashboard.md for prioritized action items"
  echo ""
}

# PHASE 6: Validation (optional)
validate_thresholds() {
  log "PHASE 6: Validate Thresholds (optional)"
  
  if [[ -x "${PYTHON3}" ]] && [[ -f "${PROJECT_ROOT}/scripts/agentic/bootstrap_local_metrics.py" ]]; then
    info "Validating metrics against target thresholds..."
    if [[ "${DRY_RUN}" == "1" ]]; then
      info "[DRY RUN] Would run: ${PYTHON3} bootstrap_local_metrics.py --validate-thresholds"
    else
      cd "${PROJECT_ROOT}"
      "${PYTHON3}" scripts/agentic/bootstrap_local_metrics.py --validate-thresholds || warn "Validation failed"
    fi
  fi
  
  echo ""
}

# Main execution
main() {
  info "======================================"
  info "Build-Measure-Learn Feedback Loop"
  info "Zero Context Loss Architecture v1.0"
  info "======================================"
  echo ""
  
  run_safety_checks
  capture_metrics
  link_metrics_to_retro
  show_status
  show_next_actions
  
  # Optional: validate thresholds
  if [[ "${VALIDATE:-0}" == "1" ]]; then
    validate_thresholds
  fi
  
  log "All phases complete! ✓"
  echo ""
  info "To validate metrics against targets:"
  info "  VALIDATE=1 $0"
  echo ""
}

# Help text
show_help() {
  cat <<EOF
Usage: $0 [OPTIONS]

Execute complete Build-Measure-Learn feedback loop with zero context switching

OPTIONS:
  --help              Show this help message
  --dry-run           Show what would be done without executing
  --verbose           Enable verbose output
  --no-safety-check   Skip safety validations (not recommended)
  --validate          Run threshold validation at end

ENVIRONMENT VARIABLES:
  SAFETY_CHECK=0      Disable safety checks (default: 1)
  DRY_RUN=1           Enable dry run mode (default: 0)
  VERBOSE=1           Enable verbose logging (default: 0)
  VALIDATE=1          Run threshold validation (default: 0)

EXAMPLES:
  # Normal operation
  $0

  # Dry run to preview
  DRY_RUN=1 $0

  # With validation
  VALIDATE=1 $0

  # Disable safety (use with caution)
  SAFETY_CHECK=0 $0

PHASES:
  1. Safety Checks    - Verify NO-NEW-MD compliance, check databases
  2. Capture Metrics  - Run bootstrap_local_metrics.py (MEASURE)
  3. Link to Retro    - Generate metrics_dashboard.md (LEARN)
  4. Show Status      - Display unified system status
  5. Next Actions     - Show WSJF-prioritized action items (BUILD)
  6. Validate         - Check metrics against targets (optional)

OUTPUT:
  .goalie/metrics_dashboard.md  - WSJF-ranked action items
  .goalie/metrics_log.jsonl     - Timestamped metrics snapshots
  logs/learning/events.jsonl    - Learning events captured

EOF
}

# Parse arguments
if [[ $# -gt 0 ]]; then
  case "$1" in
    --help|-h)
      show_help
      exit 0
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    --verbose|-v)
      VERBOSE=1
      set -x
      ;;
    --no-safety-check)
      SAFETY_CHECK=0
      ;;
    --validate)
      VALIDATE=1
      ;;
    *)
      error "Unknown option: $1"
      echo ""
      show_help
      exit 1
      ;;
  esac
fi

# Execute
main
