#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Production Launcher: WSJF/Iterate/Run/Build/Measure/Learn
# Single-command entry point for continuous improvement
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

log_info() { echo -e "${CYAN}▶${RESET} $*"; }
log_success() { echo -e "${GREEN}✓${RESET} $*"; }
log_warning() { echo -e "${YELLOW}⚠${RESET} $*"; }

show_banner() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}🚀 Production Continuous Improvement Launcher${RESET}"
  echo -e "${BOLD}${CYAN}   WSJF → Iterate → Run → Build → Measure → Learn${RESET}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Quick Start: Initialize → WSJF → Execute
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

quick_start() {
  show_banner
  
  log_info "Step 1/4: Initializing system..."
  "${SCRIPT_DIR}/ay-yo-integrate.sh" init
  echo ""
  
  log_info "Step 2/4: ROAM risk assessment..."
  "${SCRIPT_DIR}/ay-wsjf-iterate.sh" roam
  echo ""
  
  log_info "Step 3/4: WSJF prioritization..."
  "${SCRIPT_DIR}/ay-wsjf-iterate.sh" wsjf
  echo ""
  
  log_info "Step 4/4: Executing top priority (orchestrator/standup)..."
  "${SCRIPT_DIR}/ay-yo-integrate.sh" exec orchestrator standup advisory
  echo ""
  
  log_success "Quick start complete!"
  log_info "View dashboard: scripts/ay-yo-integrate.sh dashboard"
  log_info "Run full cycle: scripts/ay-production.sh cycle"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Full Cycle: WSJF-driven improvement with monitoring
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

full_cycle() {
  local cycles="${1:-2}"
  
  show_banner
  
  log_info "Starting WSJF-driven continuous improvement"
  log_info "Cycles: ${cycles} (3 ceremonies per cycle)"
  echo ""
  
  # Pre-flight checks
  log_info "Pre-flight: Checking system health..."
  
  # Check AgentDB
  if [[ -f agentdb.db ]]; then
    log_success "AgentDB present"
  else
    log_warning "AgentDB not found, initializing..."
    npx agentdb init --preset production
  fi
  
  # Check risk DB
  if [[ -f .db/risk-traceability.db ]]; then
    log_success "Risk traceability DB present"
  else
    log_warning "Risk DB not found, initializing..."
    "${SCRIPT_DIR}/init-risk-traceability.sh"
  fi
  echo ""
  
  # Run WSJF cycle
  log_info "Executing WSJF cycle with ROAM risk awareness..."
  echo ""
  
  "${SCRIPT_DIR}/ay-wsjf-iterate.sh" cycle "$cycles"
  
  echo ""
  log_success "Full cycle complete!"
  log_info "Dashboard: scripts/ay-yo-integrate.sh dashboard"
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Daemon Mode: Background continuous improvement
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

daemon_start() {
  local duration_hours="${1:-24}"
  local interval_sec="${2:-3600}"
  
  show_banner
  
  log_info "Starting background daemon..."
  log_info "Duration: ${duration_hours} hours"
  log_info "Interval: ${interval_sec} seconds ($(($interval_sec / 60)) minutes)"
  echo ""
  
  # Start in background
  nohup "${SCRIPT_DIR}/ay-continuous-improve.sh" continuous "$duration_hours" "$interval_sec" \
    > /tmp/ay-production-daemon.log 2>&1 &
  
  local pid=$!
  echo "$pid" > /tmp/ay-production-daemon.pid
  
  log_success "Daemon started (PID: $pid)"
  echo ""
  log_info "Monitor: tail -f /tmp/ay-production-daemon.log"
  log_info "Stop: kill \$(cat /tmp/ay-production-daemon.pid)"
  log_info "Dashboard: watch -n 10 'scripts/ay-yo-integrate.sh dashboard'"
  echo ""
}

daemon_stop() {
  if [[ -f /tmp/ay-production-daemon.pid ]]; then
    local pid=$(cat /tmp/ay-production-daemon.pid)
    log_info "Stopping daemon (PID: $pid)..."
    kill "$pid" 2>/dev/null || log_warning "Process not found"
    rm -f /tmp/ay-production-daemon.pid
    log_success "Daemon stopped"
  else
    log_warning "No daemon PID file found"
  fi
}

daemon_status() {
  if [[ -f /tmp/ay-production-daemon.pid ]]; then
    local pid=$(cat /tmp/ay-production-daemon.pid)
    if ps -p "$pid" > /dev/null 2>&1; then
      log_success "Daemon running (PID: $pid)"
      echo ""
      log_info "Recent log (last 20 lines):"
      tail -20 /tmp/ay-production-daemon.log 2>/dev/null || echo "  No log file"
    else
      log_warning "Daemon PID file exists but process not running"
      rm -f /tmp/ay-production-daemon.pid
    fi
  else
    log_info "Daemon not running"
  fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Dashboard: Real-time monitoring
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

dashboard() {
  show_banner
  
  log_info "WSJF Priorities:"
  echo ""
  "${SCRIPT_DIR}/ay-wsjf-iterate.sh" wsjf
  
  echo ""
  log_info "System Dashboard:"
  echo ""
  "${SCRIPT_DIR}/ay-yo-integrate.sh" dashboard | head -50
  
  echo ""
  log_info "Circle Equity:"
  echo ""
  "${SCRIPT_DIR}/ay-yo-enhanced.sh" equity 2>/dev/null | head -20 || \
    log_warning "Equity command not available"
  
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Help
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_help() {
  cat <<EOF
${BOLD}Production Continuous Improvement Launcher${RESET}

${BOLD}USAGE:${RESET}
  $0 <command> [args]

${BOLD}COMMANDS:${RESET}

  ${CYAN}start${RESET}               Quick start (init + ROAM + WSJF + execute)
                      Perfect for first-time setup

  ${CYAN}cycle${RESET} [N]           Run N WSJF cycles (default: 2)
                      Each cycle executes top 3 priorities
                      Total ceremonies: N × 3

  ${CYAN}daemon start${RESET} [hours] [interval]
                      Start background continuous improvement
                      Default: 24 hours, 1-hour intervals
  
  ${CYAN}daemon stop${RESET}         Stop background daemon
  
  ${CYAN}daemon status${RESET}       Check daemon status and view recent logs

  ${CYAN}dashboard${RESET}           Show WSJF priorities + system dashboard + equity

  ${CYAN}help${RESET}                Show this help

${BOLD}EXAMPLES:${RESET}

  # Quick start (recommended for first time)
  $0 start

  # Run 2 WSJF cycles (6 ceremonies total)
  $0 cycle 2

  # Run 5 WSJF cycles (15 ceremonies total)
  $0 cycle 5

  # Start 24-hour background daemon (checks every hour)
  $0 daemon start 24 3600

  # Start 8-hour daemon (checks every 30 minutes)
  $0 daemon start 8 1800

  # Check daemon status
  $0 daemon status

  # Stop daemon
  $0 daemon stop

  # View dashboard
  $0 dashboard

  # Watch dashboard (auto-refresh every 10 seconds)
  watch -n 10 '$0 dashboard'

${BOLD}WORKFLOW:${RESET}
  1. ROAM Risk Assessment (identify and mitigate risks)
  2. WSJF Prioritization (calculate scores for all circles)
  3. Iterate Top N (execute high-priority circles first)
  4. Run/Build/Measure/Learn (for each ceremony)
  5. Loop back to step 1

${BOLD}MONITORING:${RESET}
  • Logs: /tmp/ay-production-daemon.log
  • PID: /tmp/ay-production-daemon.pid
  • Dashboard: scripts/ay-yo-integrate.sh dashboard
  • Metrics: sqlite3 agentdb.db 'SELECT COUNT(*) FROM episodes;'

${BOLD}CURRENT WSJF PRIORITIES:${RESET}
  1. orchestrator (standup) - 5.00 ⭐ HIGH
  2. innovator (retro) - 2.50 ⭐ HIGH
  3. seeker (replenish) - 1.66 MEDIUM

EOF
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
  local cmd="${1:-help}"
  shift || true
  
  case "$cmd" in
    start|quick)
      quick_start
      ;;
    cycle)
      full_cycle "$@"
      ;;
    daemon)
      local subcmd="${1:-help}"
      shift || true
      case "$subcmd" in
        start) daemon_start "$@" ;;
        stop) daemon_stop ;;
        status) daemon_status ;;
        *)
          echo "Usage: $0 daemon {start|stop|status}"
          exit 1
          ;;
      esac
      ;;
    dashboard|dash)
      dashboard
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      echo "Unknown command: $cmd"
      echo "Run: $0 help"
      exit 1
      ;;
  esac
}

main "$@"
