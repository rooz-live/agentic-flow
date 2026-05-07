#!/bin/bash
# ay-yo-monitor-roam.sh - ROAM Risk Monitoring
# Early warning detection for R1-R4 risks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
METRICS_DIR="$PROJECT_ROOT/.dor-metrics"
AGENTDB="$PROJECT_ROOT/agentdb.db"

# Thresholds
DISK_WARNING_PCT=80
DISK_CRITICAL_PCT=90
MEMORY_WARNING_MB=500
COMPLIANCE_VARIANCE_THRESHOLD=30
EQUITY_LOW_PCT=5
EQUITY_HIGH_PCT=40
MIN_CEREMONIES=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[🔴]${NC} $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# R1: Resource Exhaustion Check
check_resources() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  R1: Resource Exhaustion"
  echo "═══════════════════════════════════════════"
  echo
  
  # Disk usage
  local disk_pct
  disk_pct=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
  
  if [[ $disk_pct -ge $DISK_CRITICAL_PCT ]]; then
    error "CRITICAL: Disk usage at ${disk_pct}% (>=${DISK_CRITICAL_PCT}%)"
    echo "  Action: Run scripts/ay-yo-cleanup.sh immediately"
  elif [[ $disk_pct -ge $DISK_WARNING_PCT ]]; then
    warn "WARNING: Disk usage at ${disk_pct}% (>=${DISK_WARNING_PCT}%)"
    echo "  Action: Schedule cleanup soon"
  else
    log "Disk usage healthy: ${disk_pct}%"
  fi
  
  # Memory available (MacOS specific)
  local pages_free
  pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
  local page_size=4096
  local mem_free_mb=$((pages_free * page_size / 1024 / 1024))
  
  if [[ $mem_free_mb -lt $MEMORY_WARNING_MB ]]; then
    warn "Low memory: ${mem_free_mb}MB free (<${MEMORY_WARNING_MB}MB)"
    echo "  Action: Consider reducing daemon frequency"
  else
    log "Memory available: ${mem_free_mb}MB"
  fi
  
  # Directory sizes
  if [[ -d "$METRICS_DIR" ]]; then
    local metrics_count
    metrics_count=$(find "$METRICS_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Metric files: $metrics_count"
    
    if [[ $metrics_count -gt 1000 ]]; then
      warn "Large metrics directory: $metrics_count files"
    fi
  fi
  
  # Database size
  if [[ -f "$AGENTDB" ]]; then
    local db_size_mb
    db_size_mb=$(du -m "$AGENTDB" | cut -f1)
    echo "  Database size: ${db_size_mb}MB"
    
    if [[ $db_size_mb -gt 100 ]]; then
      warn "Large database: ${db_size_mb}MB (consider vacuum)"
    fi
  fi
}

# R2: Learning Loop Instability Check
check_learning_stability() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  R2: Learning Loop Instability"
  echo "═══════════════════════════════════════════"
  echo
  
  if [[ ! -d "$METRICS_DIR" ]] || [[ -z "$(ls -A "$METRICS_DIR" 2>/dev/null)" ]]; then
    info "No metrics yet - insufficient data"
    return
  fi
  
  # Calculate compliance variance using bc for floating point
  local variance
  variance=$(cat "$METRICS_DIR"/*.json 2>/dev/null | jq -r '.compliance_percentage // 0' | awk '
    BEGIN { sum=0; sumsq=0; n=0 }
    { sum+=$1; sumsq+=$1*$1; n++ }
    END { 
      if(n>0) {
        mean=sum/n; 
        variance=sqrt(sumsq/n - mean*mean); 
        print int(variance)
      } else {
        print 0
      }
    }
  ')
  
  echo "  Compliance variance: ${variance}%"
  
  if [[ $variance -gt $COMPLIANCE_VARIANCE_THRESHOLD ]]; then
    error "HIGH VARIANCE: Learning unstable (variance=${variance}% >${COMPLIANCE_VARIANCE_THRESHOLD}%)"
    echo "  Action: Check for oscillating DoR budgets"
    echo "  Run: cat .dor-metrics/*.json | jq -r '[.circle, .dor_budget_minutes] | @csv'"
  else
    log "Learning stability acceptable: ${variance}%"
  fi
  
  # Check for budget oscillation patterns
  if [[ -f "$AGENTDB" ]]; then
    local obs_count
    obs_count=$(sqlite3 "$AGENTDB" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
    
    echo "  Total observations: $obs_count"
    
    if [[ $obs_count -lt 30 ]]; then
      warn "Insufficient observations for reliable learning ($obs_count < 30)"
      echo "  Action: Accumulate more data before optimizing budgets"
    fi
  fi
}

# R3: Circle Equity Imbalance Check
check_equity() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  R3: Circle Equity Imbalance"
  echo "═══════════════════════════════════════════"
  echo
  
  if [[ ! -d "$METRICS_DIR" ]]; then
    info "No metrics directory"
    return
  fi
  
  local total
  total=$(find "$METRICS_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  
  if [[ $total -lt $MIN_CEREMONIES ]]; then
    info "Too few ceremonies for equity analysis ($total < $MIN_CEREMONIES)"
    return
  fi
  
  echo "  Total ceremonies: $total"
  echo
  
  local has_imbalance=false
  
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count
    count=$(find "$METRICS_DIR" -name "${circle}_*.json" 2>/dev/null | wc -l | tr -d ' ')
    
    local pct
    pct=$((count * 100 / total))
    
    if [[ $pct -ge $EQUITY_HIGH_PCT ]]; then
      error "Circle overused: $circle at ${pct}% (>=${EQUITY_HIGH_PCT}%)"
      has_imbalance=true
    elif [[ $pct -le $EQUITY_LOW_PCT ]] && [[ $count -gt 0 ]]; then
      error "Circle underused: $circle at ${pct}% (<=${EQUITY_LOW_PCT}%)"
      has_imbalance=true
    elif [[ $count -eq 0 ]]; then
      warn "Circle unused: $circle (0 ceremonies)"
      has_imbalance=true
    else
      log "Circle balanced: $circle at ${pct}%"
    fi
  done
  
  if [[ "$has_imbalance" == "true" ]]; then
    echo
    echo "  Action: Run scripts/ay-yo-continuous-improvement.sh run 5 deep"
    echo "  Or: Balance manually with exec commands"
  fi
}

# R4: Daemon Runaway Check
check_daemons() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  R4: Daemon Runaway"
  echo "═══════════════════════════════════════════"
  echo
  
  # Check for daemon processes
  local daemon_count
  daemon_count=$(pgrep -f "ay-yo-continuous-improvement.sh daemon" 2>/dev/null | wc -l | tr -d ' ')
  
  if [[ $daemon_count -gt 1 ]]; then
    error "CRITICAL: Multiple daemons running ($daemon_count)"
    echo "  Action: Kill extra daemons immediately"
    echo "  Run: pkill -f 'ay-yo-continuous-improvement.sh daemon'"
    pgrep -f "ay-yo-continuous-improvement.sh daemon" | while read -r pid; do
      echo "    PID: $pid"
    done
  elif [[ $daemon_count -eq 1 ]]; then
    log "Daemon running normally (1 instance)"
    local pid
    pid=$(pgrep -f "ay-yo-continuous-improvement.sh daemon" 2>/dev/null | head -1)
    echo "  PID: $pid"
  else
    info "No daemon running"
  fi
  
  # Check total ay-yo processes
  local total_processes
  total_processes=$(pgrep -f "ay-yo" 2>/dev/null | wc -l | tr -d ' ')
  
  echo "  Total ay-yo processes: $total_processes"
  
  if [[ $total_processes -gt 10 ]]; then
    error "Too many ay-yo processes: $total_processes (>10)"
    echo "  Action: Investigate process leak"
    echo "  Run: ps aux | grep ay-yo"
  fi
  
  # Check system load
  local load_avg
  load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
  echo "  System load: $load_avg"
}

# Overall Risk Summary
show_risk_summary() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  Risk Summary"
  echo "═══════════════════════════════════════════"
  echo
  
  # Count warnings/errors from checks
  local warnings=0
  local errors=0
  
  # Simple heuristic check
  if [[ -f "$AGENTDB" ]]; then
    local db_size_mb
    db_size_mb=$(du -m "$AGENTDB" | cut -f1)
    [[ $db_size_mb -gt 100 ]] && ((warnings++))
  fi
  
  local disk_pct
  disk_pct=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
  [[ $disk_pct -ge $DISK_CRITICAL_PCT ]] && ((errors++))
  [[ $disk_pct -ge $DISK_WARNING_PCT ]] && [[ $disk_pct -lt $DISK_CRITICAL_PCT ]] && ((warnings++))
  
  local daemon_count
  daemon_count=$(pgrep -f "ay-yo-continuous-improvement.sh daemon" 2>/dev/null | wc -l | tr -d ' ')
  [[ $daemon_count -gt 1 ]] && ((errors++))
  
  echo "  Errors: $errors"
  echo "  Warnings: $warnings"
  echo
  
  if [[ $errors -gt 0 ]]; then
    error "IMMEDIATE ACTION REQUIRED"
  elif [[ $warnings -gt 0 ]]; then
    warn "Proactive mitigation recommended"
  else
    log "All risks within acceptable levels"
  fi
}

main() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  ROAM Risk Monitor"
  echo "  Continuous Improvement Risk Assessment"
  echo "═══════════════════════════════════════════"
  
  check_resources
  check_learning_stability
  check_equity
  check_daemons
  show_risk_summary
  
  echo
  log "Monitoring complete"
  echo
}

main "$@"
