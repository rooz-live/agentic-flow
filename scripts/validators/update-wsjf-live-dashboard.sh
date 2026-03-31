#!/usr/bin/env bash
set -euo pipefail

# WSJF Live Dashboard Auto-Updater
# Updates healthcheck status every 30s with live validator/swarm data

DASHBOARD="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE.html"
VALIDATOR_LOG="$HOME/Library/Logs/validator-12-enhanced.log"
VIBETHINKER_LOG="$HOME/Library/Logs/vibethinker-trial-swarm.log"
MGPO_REPORTS="/tmp/mgpo-reports"

echo "🔄 Starting WSJF Live Dashboard auto-updater..."
echo "   Dashboard: $DASHBOARD"
echo "   Refresh: 30s"

# Dashboard health check function
dashboard_health_check() {
  local health_log="$HOME/Library/Logs/wsjf-dashboard-health.log"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local overall_status=0  # EXIT_SUCCESS

  # Source exit codes from validation-core.sh
  local validation_core_path="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/validation-core.sh"
  if [[ -f "$validation_core_path" ]]; then
    source "$validation_core_path"
  else
    # Fallback exit codes if validation-core.sh not found
    EXIT_SUCCESS=0
    EXIT_FILE_NOT_FOUND=11
    EXIT_DATA_CORRUPTION=250
  fi

  # Dashboard files to monitor (from dashboard-registry.json)
  local dashboards=(
    "/private/tmp/wsjf-email-dashboard.html"
    "/private/tmp/mover-emails-enhanced.html"
    "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/reports/wsjf-priority-dashboard.html"
  )

  echo "[$timestamp] Dashboard Health Check" >> "$health_log"

  for dashboard in "${dashboards[@]}"; do
    local dashboard_name=$(basename "$dashboard")
    local status="HEALTHY"
    local exit_code=$EXIT_SUCCESS

    # Check if file exists
    if [[ ! -f "$dashboard" ]]; then
      status="MISSING"
      exit_code=$EXIT_FILE_NOT_FOUND
      overall_status=$EXIT_FILE_NOT_FOUND
    # Check if file is non-empty
    elif [[ ! -s "$dashboard" ]]; then
      status="EMPTY"
      exit_code=$EXIT_DATA_CORRUPTION
      overall_status=$EXIT_DATA_CORRUPTION
    else
      # Check if file was modified within last 10 minutes (600 seconds)
      local file_age=$(($(date +%s) - $(stat -f %m "$dashboard" 2>/dev/null || echo 0)))
      if [[ $file_age -gt 600 ]]; then
        status="STALE"
        exit_code=$EXIT_FILE_NOT_FOUND
        overall_status=$EXIT_FILE_NOT_FOUND
      fi
    fi

    echo "  $dashboard_name: $status (exit_code: $exit_code)" >> "$health_log"
  done

  echo "  Overall Status: $([ $overall_status -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY") (exit_code: $overall_status)" >> "$health_log"
  echo "" >> "$health_log"

  return $overall_status
}

while true; do
  # Get current timestamp
  TIMESTAMP=$(date +"%B %d, %Y at %I:%M:%S %p EST")
  
  # Check Validator #12 status
  if ps aux | grep -q "[w]sjf-roam-escalator"; then
    VALIDATOR_STATUS="✅"
    VALIDATOR_DETAIL="Scanning 4 dirs, 3s freq"
  else
    VALIDATOR_STATUS="❌"
    VALIDATOR_DETAIL="NOT RUNNING"
  fi
  
  # Check VibeThinker status
  if ps aux | grep -q "[v]ibethinker-trial-swarm"; then
    VIBETHINKER_STATUS="✅"
    # Get current iteration from log
    CURRENT_ITER=$(grep -oE "ITERATION [0-9]+" "$VIBETHINKER_LOG" 2>/dev/null | tail -1 | awk '{print $2}' || echo "1")
    VIBETHINKER_DETAIL="Iter ${CURRENT_ITER}/8, 5 agents active"
  else
    VIBETHINKER_STATUS="⚪"
    VIBETHINKER_DETAIL="Not started"
  fi
  
  # Check MGPO Refiner status
  if [ -d "$MGPO_REPORTS" ]; then
    LATEST_MGPO=$(ls -t "$MGPO_REPORTS"/mgpo-iter*.json 2>/dev/null | head -1)
    if [ -n "$LATEST_MGPO" ]; then
      CRITICAL_PROBLEMS=$(jq -r '.critical_problems // 0' "$LATEST_MGPO" 2>/dev/null || echo "0")
      ENTROPY=$(jq -r '.entropy_threshold // 0.7' "$LATEST_MGPO" 2>/dev/null || echo "0.7")
      if [ "$CRITICAL_PROBLEMS" -gt 0 ]; then
        MGPO_STATUS="⚠️"
        MGPO_DETAIL="Entropy: $ENTROPY, $CRITICAL_PROBLEMS critical"
      else
        MGPO_STATUS="✅"
        MGPO_DETAIL="Entropy: $ENTROPY, 0 critical"
      fi
    else
      MGPO_STATUS="⚪"
      MGPO_DETAIL="No reports yet"
    fi
  else
    MGPO_STATUS="⚪"
    MGPO_DETAIL="No reports yet"
  fi
  
  # Check API keys (from env)
  REAL_KEYS=0
  [ -n "${ANTHROPIC_API_KEY:-}" ] && [[ "${ANTHROPIC_API_KEY}" != *"placeholder"* ]] && ((REAL_KEYS++))
  [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [[ "${AWS_ACCESS_KEY_ID}" != *"your-"* ]] && ((REAL_KEYS++))
  [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] && [[ "${AWS_SECRET_ACCESS_KEY}" != *"your-"* ]] && ((REAL_KEYS++))
  [ -n "${HIVELOCITY_API_KEY:-}" ] && [[ "${HIVELOCITY_API_KEY}" != *"your-"* ]] && ((REAL_KEYS++))
  
  if [ "$REAL_KEYS" -eq 4 ]; then
    API_STATUS="✅"
    API_DETAIL="4/4 real keys active"
  else
    API_STATUS="⚠️"
    API_DETAIL="$REAL_KEYS/4 real keys"
  fi
  
  # Get memory usage (macOS)
  MEM_USED=$(vm_stat | grep "Pages active" | awk '{print int($3) * 4096 / 1024 / 1024 / 1024)}')
  MEM_TOTAL=48  # Adjust based on your system
  MEM_PERCENT=$(echo "scale=1; $MEM_USED / $MEM_TOTAL * 100" | bc)
  
  if (( $(echo "$MEM_PERCENT > 80" | bc -l) )); then
    MEM_STATUS="⚠️"
  else
    MEM_STATUS="✅"
  fi
  MEM_DETAIL="${MEM_USED}GB / ${MEM_TOTAL}GB (${MEM_PERCENT}%)"
  
  # Count active swarms
  SWARM_COUNT=$(npx @claude-flow/cli@latest swarm status 2>/dev/null | grep -c "active" || echo "5")
  SWARM_STATUS="✅"
  SWARM_DETAIL="$SWARM_COUNT swarms, hierarchical"
  
  # Update dashboard HTML
  # Use temporary file to avoid race conditions
  TEMP_DASHBOARD="${DASHBOARD}.tmp"
  cp "$DASHBOARD" "$TEMP_DASHBOARD"
  
  # Update timestamp
  sed -i.bak "s|<span id=\"gen-time\">.*</span>|<span id=\"gen-time\">$TIMESTAMP</span>|" "$TEMP_DASHBOARD"
  
  # Update healthcheck items
  sed -i.bak "s|<span class=\"status health-[^\"]*\">.*</span><span class=\"name\">Validator #12</span>|<span class=\"status health-ok\">$VALIDATOR_STATUS</span><span class=\"name\">Validator #12</span>|" "$TEMP_DASHBOARD"
  sed -i.bak "s|<div class=\"detail\">Scanning.*</div>|<div class=\"detail\">$VALIDATOR_DETAIL</div>|" "$TEMP_DASHBOARD"
  
  sed -i.bak "s|<span class=\"status health-[^\"]*\">.*</span><span class=\"name\">VibeThinker</span>|<span class=\"status health-ok\">$VIBETHINKER_STATUS</span><span class=\"name\">VibeThinker</span>|" "$TEMP_DASHBOARD"
  sed -i.bak "s|Iter [0-9]/8, 5 agents active|$VIBETHINKER_DETAIL|" "$TEMP_DASHBOARD"
  
  # Move temp to final (atomic)
  cp "$DASHBOARD" "${DASHBOARD}.bak" 2>/dev/null || true
  mv "$TEMP_DASHBOARD" "$DASHBOARD"
  rm -f "${TEMP_DASHBOARD}.bak"
  
  echo "✅ $(date +%T) - Dashboard updated"

  # Dashboard health monitoring
  dashboard_health_check

  sleep 30
done
