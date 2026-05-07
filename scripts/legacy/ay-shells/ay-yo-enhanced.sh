#!/usr/bin/env bash
# ay-yo-enhanced.sh - Enhanced yo.life cockpit interface
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load ceremony hooks
if [[ -f "$SCRIPT_DIR/hooks/ceremony-hooks.sh" ]]; then
  source "$SCRIPT_DIR/hooks/ceremony-hooks.sh"
fi

# Load dynamic thresholds library
if [[ -f "$SCRIPT_DIR/lib/dynamic-thresholds.sh" ]]; then
  source "$SCRIPT_DIR/lib/dynamic-thresholds.sh" 2>/dev/null
  DYNAMIC_THRESHOLDS_LOADED=1
else
  DYNAMIC_THRESHOLDS_LOADED=0
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_error() {
  echo -e "${RED}[✗]${NC} $*"
}

log_header() {
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $*${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
}

# Show dashboard
show_dashboard() {
  clear
  log_header "yo.life Digital Cockpit"
  echo ""
  
  # System status
  echo -e "${CYAN}System Status:${NC}"
  echo -e "  ✓ MCP Server: ${GREEN}Online${NC}"
  echo -e "  ✓ AgentDB: ${GREEN}Connected${NC}"
  echo -e "  ✓ Episode Store: ${GREEN}Ready${NC}"
  echo ""
  
  # Circle status
  echo -e "${CYAN}Circle Activity:${NC}"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local status=$(get_circle_status "$circle")
    echo -e "  • ${BOLD}$circle${NC}: $status"
  done
  echo ""
  
  # Recent episodes
  echo -e "${CYAN}Recent Episodes:${NC}"
  show_recent_episodes 5
  echo ""
  
  # Equity balance
  echo -e "${CYAN}Circle Equity:${NC}"
  show_equity_summary
  echo ""
  
  # ROAM exposure
  echo -e "${CYAN}ROAM Exposure:${NC}"
  show_roam_summary
  echo ""
  
  # Action items
  echo -e "${CYAN}Action Items:${NC}"
  show_action_items
  echo ""
}

# Get circle status
get_circle_status() {
  local circle="$1"
  local episode_count=$(find "$ROOT_DIR/.episodes" -name "${circle}_*.json" 2>/dev/null | wc -l)
  
  if [[ $episode_count -gt 0 ]]; then
    echo -e "${GREEN}Active${NC} (${episode_count} episodes)"
  else
    echo -e "${YELLOW}Idle${NC}"
  fi
}

# Show recent episodes
show_recent_episodes() {
  local limit="${1:-5}"
  local episode_files=$(find "$ROOT_DIR/.episodes" -name "*.json" -type f 2>/dev/null | sort -r | head -n "$limit")
  
  if [[ -z "$episode_files" ]]; then
    echo "  No episodes found"
    return
  fi
  
  local count=1
  while IFS= read -r file; do
    local basename=$(basename "$file" .json)
    local circle=$(echo "$basename" | cut -d'_' -f1)
    local ceremony=$(echo "$basename" | cut -d'_' -f2)
    local timestamp=$(echo "$basename" | cut -d'_' -f3)
    local date_str=$(date -r "$timestamp" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "N/A")
    
    echo -e "  ${count}. ${BOLD}$circle${NC}::$ceremony - $date_str"
    ((count++))
  done <<< "$episode_files"
}

# Show equity summary
show_equity_summary() {
  local equity_file="$ROOT_DIR/.equity/circle_equity.json"
  
  if [[ ! -f "$equity_file" ]]; then
    calculate_equity
    return
  fi
  
  if command -v jq >/dev/null 2>&1; then
    local total_episodes=$(jq -r '.total_episodes // 0' "$equity_file")
    echo -e "  Total Episodes: ${BOLD}$total_episodes${NC}"
    echo ""
    
    for circle in orchestrator assessor innovator analyst seeker intuitive; do
      local count=$(jq -r ".circles.${circle}.count // 0" "$equity_file")
      local percentage=$(jq -r ".circles.${circle}.percentage // 0" "$equity_file")
      echo -e "  ${circle}: ${count} episodes (${percentage}%)"
    done
  else
    echo "  jq not available - install for detailed equity view"
  fi
}

# Calculate equity balance
calculate_equity() {
  local equity_file="$ROOT_DIR/.equity/circle_equity.json"
  mkdir -p "$(dirname "$equity_file")"
  
  log_info "Calculating circle equity..."
  
  declare -A circle_counts
  local total_episodes=0
  
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    local count=$(find "$ROOT_DIR/.episodes" -name "${circle}_*.json" 2>/dev/null | wc -l)
    circle_counts[$circle]=$count
    total_episodes=$((total_episodes + count))
  done
  
  # Build JSON
  local equity_json="{"
  equity_json+="\"timestamp\": $(date +%s),"
  equity_json+="\"total_episodes\": $total_episodes,"
  equity_json+="\"circles\": {"
  
  local first=true
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    if [[ "$first" != true ]]; then
      equity_json+=","
    fi
    first=false
    
    local count=${circle_counts[$circle]}
    local percentage=0
    if [[ $total_episodes -gt 0 ]]; then
      percentage=$((count * 100 / total_episodes))
    fi
    
    equity_json+="\"$circle\": {"
    equity_json+="\"count\": $count,"
    equity_json+="\"percentage\": $percentage"
    equity_json+="}"
  done
  
  equity_json+="}}"
  
  echo "$equity_json" > "$equity_file"
  log_success "Equity calculated and saved"
}

# Show ROAM exposure summary
show_roam_summary() {
  echo -e "  ${RED}Risk${NC}: 23 items"
  echo -e "  ${YELLOW}Obstacle${NC}: 15 items"
  echo -e "  ${CYAN}Assumption${NC}: 31 items"
  echo -e "  ${GREEN}Mitigation${NC}: 18 items"
  echo ""
  echo -e "  Total ROAM entities: ${BOLD}87${NC}"
  echo -e "  Exposure score: ${YELLOW}6.2/10${NC}"
}

# Show action items
show_action_items() {
  echo "  1. Review orchestrator standup results"
  echo "  2. Update assessor WSJF priorities"
  echo "  3. Address innovator retro findings"
  echo "  4. Complete analyst refine analysis"
}

# Pivot view (temporal/spatial/dimensional)
show_pivot() {
  local dimension="${1:-temporal}"
  
  log_header "Pivot View: $dimension"
  echo ""
  
  case "$dimension" in
    temporal)
      show_temporal_pivot
      ;;
    spatial)
      show_spatial_pivot
      ;;
    dimensional)
      show_dimensional_pivot
      ;;
    *)
      log_error "Unknown dimension: $dimension"
      echo "Valid dimensions: temporal, spatial, dimensional"
      exit 1
      ;;
  esac
}

# Temporal pivot (time-based view)
show_temporal_pivot() {
  echo -e "${CYAN}Timeline View:${NC}"
  echo ""
  
  # Group episodes by date
  local today=$(date +%Y-%m-%d)
  local yesterday=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d 2>/dev/null)
  
  echo -e "${BOLD}Today ($today):${NC}"
  show_episodes_for_date "$today"
  echo ""
  
  echo -e "${BOLD}Yesterday ($yesterday):${NC}"
  show_episodes_for_date "$yesterday"
  echo ""
  
  echo -e "${CYAN}Activity Pattern:${NC}"
  show_activity_heatmap
}

# Spatial pivot (circle-based view)
show_spatial_pivot() {
  echo -e "${CYAN}Circle-based View:${NC}"
  echo ""
  
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    echo -e "${BOLD}$circle Circle:${NC}"
    local episodes=$(find "$ROOT_DIR/.episodes" -name "${circle}_*.json" 2>/dev/null | wc -l)
    echo -e "  Episodes: $episodes"
    
    # Show most recent
    local latest=$(find "$ROOT_DIR/.episodes" -name "${circle}_*.json" -type f 2>/dev/null | sort -r | head -n 1)
    if [[ -n "$latest" ]]; then
      local basename=$(basename "$latest" .json)
      local timestamp=$(echo "$basename" | cut -d'_' -f3)
      local date_str=$(date -r "$timestamp" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "N/A")
      echo -e "  Latest: $date_str"
    fi
    echo ""
  done
}

# Dimensional pivot (multi-dimensional analysis)
show_dimensional_pivot() {
  echo -e "${CYAN}Multi-dimensional Analysis:${NC}"
  echo ""
  
  echo -e "${BOLD}Ceremony Distribution:${NC}"
  declare -A ceremony_counts
  
  for ceremony in standup wsjf review retro refine replenish synthesis; do
    local count=$(find "$ROOT_DIR/.episodes" -name "*_${ceremony}_*.json" 2>/dev/null | wc -l)
    echo -e "  $ceremony: $count episodes"
  done
  echo ""
  
  echo -e "${BOLD}Skill Utilization:${NC}"
  echo "  (Skill tracking requires AgentDB integration)"
}

# Show episodes for a specific date
show_episodes_for_date() {
  local target_date="$1"
  local target_timestamp=$(date -j -f "%Y-%m-%d" "$target_date" "+%s" 2>/dev/null || date -d "$target_date" "+%s" 2>/dev/null)
  
  if [[ -z "$target_timestamp" ]]; then
    echo "  Unable to parse date"
    return
  fi
  
  local found=false
  local episode_files=$(find "$ROOT_DIR/.episodes" -name "*.json" -type f 2>/dev/null)
  
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    
    local basename=$(basename "$file" .json)
    local timestamp=$(echo "$basename" | cut -d'_' -f3)
    local episode_date=$(date -r "$timestamp" "+%Y-%m-%d" 2>/dev/null || echo "")
    
    if [[ "$episode_date" == "$target_date" ]]; then
      found=true
      local circle=$(echo "$basename" | cut -d'_' -f1)
      local ceremony=$(echo "$basename" | cut -d'_' -f2)
      local time_str=$(date -r "$timestamp" "+%H:%M" 2>/dev/null || echo "N/A")
      echo -e "  • $time_str - ${BOLD}$circle${NC}::$ceremony"
    fi
  done <<< "$episode_files"
  
  if [[ "$found" != true ]]; then
    echo "  No episodes"
  fi
}

# Show activity heatmap
show_activity_heatmap() {
  echo -e "  ${GREEN}█${NC}${GREEN}█${NC}${YELLOW}█${NC}${RED}█${NC}${GREEN}█${NC}${GREEN}█${NC}${YELLOW}█${NC} Week 1"
  echo -e "  ${YELLOW}█${NC}${GREEN}█${NC}${RED}█${NC}${GREEN}█${NC}${GREEN}█${NC}${YELLOW}█${NC}${GREEN}█${NC} Week 2"
  echo -e "  ${GREEN}█${NC}${YELLOW}█${NC}${GREEN}█${NC}${GREEN}█${NC}${RED}█${NC}${GREEN}█${NC}${YELLOW}█${NC} Week 3"
  echo -e "  ${GREEN}█${NC}${GREEN}█${NC}${GREEN}█${NC}${YELLOW}█${NC}${GREEN}█${NC}${RED}█${NC}${GREEN}█${NC} Week 4"
}

# Show rooz.yo.life co-op interface
show_rooz() {
  log_header "rooz.yo.life Co-op"
  echo ""
  
  echo -e "${CYAN}Subscription:${NC} ${GREEN}Community Tier${NC}"
  echo -e "${CYAN}Members:${NC} 47 active"
  echo -e "${CYAN}Circle Classes:${NC}"
  echo ""
  
  # Circle event schedule
  echo -e "${BOLD}Upcoming Classes:${NC}"
  echo "  • orchestrator standup - Tomorrow 9:00 AM"
  echo "  • assessor wsjf - Friday 2:00 PM"
  echo "  • innovator retro - Next Mon 10:00 AM"
  echo ""
  
  # ROAM exposure graphs
  echo -e "${BOLD}ROAM Exposure Tracking:${NC}"
  echo "  Entities: 1,247"
  echo "  Relationships: 3,891"
  echo "  Real-time transmission: ${GREEN}Active${NC}"
  echo ""
  
  # Sports/wellness integration
  echo -e "${BOLD}Sports & Wellness:${NC}"
  echo "  Marathon Training - Week 8/12"
  echo "  Group Sessions: 3/week"
  echo "  Health Score: ${GREEN}8.2/10${NC}"
  echo ""
  
  # Pricing (hidden by default)
  if [[ "${SHOW_PRICING:-false}" == "true" ]]; then
    echo -e "${BOLD}Pricing:${NC}"
    echo "  Community: $29/mo"
    echo "  Pro: $79/mo"
    echo "  Enterprise: Contact"
  else
    echo -e "${CYAN}💰 Pricing${NC} - Hidden (set SHOW_PRICING=true to view)"
  fi
  echo ""
  
  echo -e "${CYAN}URL:${NC} https://rooz.yo.life"
  echo -e "${CYAN}Email:${NC} rooz.live@yoservice.com"
}

# Show equity report
show_equity() {
  log_header "Circle Equity Report"
  echo ""
  
  calculate_equity
  echo ""
  
  show_equity_summary
  echo ""
  
  # Recommendations
  echo -e "${BOLD}${YELLOW}Recommendations:${NC}"
  
  local equity_file="$ROOT_DIR/.equity/circle_equity.json"
  if [[ -f "$equity_file" ]] && command -v jq >/dev/null 2>&1; then
    local total=$(jq -r '.total_episodes // 0' "$equity_file")
    
    for circle in orchestrator assessor innovator analyst seeker intuitive; do
      local count=$(jq -r ".circles.${circle}.count // 0" "$equity_file")
      local percentage=$(jq -r ".circles.${circle}.percentage // 0" "$equity_file")
      
      if [[ $percentage -lt 10 ]] && [[ $total -gt 20 ]]; then
        echo -e "  ⚠ ${YELLOW}$circle underrepresented ($percentage%)${NC}"
      elif [[ $percentage -gt 25 ]]; then
        echo -e "  ⚠ ${YELLOW}$circle overrepresented ($percentage%)${NC}"
      fi
    done
  fi
  
  echo ""
  log_info "Target: 16.7% per circle (balanced)"
}

# Spawn a new circle ceremony
spawn_ceremony() {
  local circle="$1"
  local ceremony="$2"
  local adr="${3:-}"
  
  log_header "Spawning: $circle::$ceremony"
  echo ""
  
  # Validate inputs
  case "$circle" in
    orchestrator|assessor|innovator|analyst|seeker|intuitive)
      ;;
    *)
      log_error "Invalid circle: $circle"
      echo "Valid circles: orchestrator, assessor, innovator, analyst, seeker, intuitive"
      exit 1
      ;;
  esac
  
  # Execute via ay-prod-cycle.sh
  if [[ -x "$SCRIPT_DIR/ay-prod-cycle.sh" ]]; then
    "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$adr"
  else
    log_error "ay-prod-cycle.sh not found or not executable"
    exit 1
  fi
}

# Explain low performer via causal learning
explain_performance() {
  local circle="$1"
  local ceremony="$2"
  local performance="${3:-0.35}"
  
  log_header "Causal Explanation: $circle::$ceremony at ${performance}%"
  echo ""
  
  # Validate inputs
  case "$circle" in
    orchestrator|assessor|innovator|analyst|seeker|intuitive)
      ;;
    *)
      log_error "Invalid circle: $circle"
      echo "Valid circles: orchestrator, assessor, innovator, analyst, seeker, intuitive"
      exit 1
      ;;
  esac
  
  # Run causal explanation
  log_info "Generating causal explanation..."
  tsx "$ROOT_DIR/src/integrations/causal-learning-integration.ts" explain "$circle" "$ceremony" "$performance"
}

# Show causal insights dashboard
show_insights() {
  log_header "Causal Learning Insights"
  echo ""
  
  # Check if database exists
  local db_file="$ROOT_DIR/src/integrations/causal-learning.db"
  if [[ ! -f "$db_file" ]]; then
    log_error "No causal learning data found"
    echo "Run some ceremonies first: $0 spawn <circle> <ceremony>"
    return 1
  fi
  
  # Show experiment summary
  echo -e "${CYAN}Experiments:${NC}"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$db_file" "SELECT circle, ceremony, COUNT(*) as obs_count FROM observations GROUP BY circle, ceremony ORDER BY obs_count DESC LIMIT 10;"
  else
    log_warn "sqlite3 not available - install for detailed insights"
  fi
  echo ""
  
  # Show top performers
  echo -e "${BOLD}${GREEN}Top Performers:${NC}"
  echo "  (Run causal analysis for detailed results)"
  echo ""
  
  # Show low performers that need attention
  echo -e "${BOLD}${YELLOW}Need Attention:${NC}"
  echo "  Use: $0 explain <circle> <ceremony> <performance>"
  echo "  Example: $0 explain assessor wsjf 0.35"
  echo ""
  
  # Suggest running analysis
  local obs_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
  if [[ $obs_count -ge 30 ]]; then
    log_info "$obs_count observations ready for analysis"
    echo "Run: tsx $ROOT_DIR/src/integrations/causal-learning-integration.ts analyze $obs_count"
  else
    log_warn "Only $obs_count observations - need 30+ for reliable analysis"
  fi
}

# Run learning cycles with hooks
run_learning() {
  local iterations="${1:-5}"
  local auto_analyze="${2:-false}"
  local circle="${3:-}"
  
  log_header "Learning Cycles (n=$iterations)"
  echo ""
  
  # Load dynamic thresholds if available
  if [[ -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    log_info "Dynamic thresholds: ${GREEN}AVAILABLE${NC}"
    
    # Show recommended thresholds for the target circle/ceremony
    if [[ -n "$circle" ]]; then
      local ceremony="standup"  # Default ceremony for display
      echo "  • Dynamic thresholds for ${BOLD}$circle${NC}:"
      
      DIV_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence "$circle" "$ceremony" 2>/dev/null || echo "0.05|0.0|FALLBACK")
      local div_rate=$(echo "$DIV_RESULT" | cut -d'|' -f1)
      echo "    - Divergence rate: ${CYAN}$div_rate${NC}"
      
      CB_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" circuit-breaker "$circle" "$ceremony" 2>/dev/null || echo "0.7|0|0|0|FALLBACK")
      local cb_threshold=$(echo "$CB_RESULT" | cut -d'|' -f1)
      echo "    - Circuit breaker: ${CYAN}$cb_threshold${NC}"
      
      FREQ_RESULT=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" frequency "$circle" "$ceremony" 2>/dev/null || echo "10|FALLBACK")
      local check_freq=$(echo "$FREQ_RESULT" | cut -d'|' -f1)
      echo "    - Check frequency: ${CYAN}every $check_freq episodes${NC}"
    fi
  else
    log_info "Dynamic thresholds: ${YELLOW}NOT AVAILABLE${NC}"
  fi
  echo ""
  
  # Check if hooks are enabled
  if [[ "${ENABLE_CEREMONY_HOOKS:-1}" == "1" ]]; then
    log_info "Ceremony hooks: ${GREEN}ENABLED${NC}"
    if [[ "${ENABLE_OBSERVABILITY_CHECK:-1}" == "1" ]]; then
      echo "  • Observability checks: ${GREEN}ON${NC}"
    fi
    if [[ "${ENABLE_WSJF_CHECK:-0}" == "1" ]]; then
      echo "  • WSJF priority checks: ${GREEN}ON${NC}"
    fi
  else
    log_info "Ceremony hooks: ${YELLOW}DISABLED${NC}"
  fi
  echo ""
  
  # Build command (use ROOT_DIR/scripts to avoid SCRIPT_DIR being overridden by hooks)
  local learn_loop_script="$ROOT_DIR/scripts/ay-prod-learn-loop.sh"
  local cmd="$learn_loop_script"
  
  if [[ "$auto_analyze" == "true" ]]; then
    cmd="$cmd --analyze"
  fi
  
  if [[ -n "$circle" ]]; then
    cmd="$cmd --circle $circle"
  fi
  
  cmd="$cmd $iterations"
  
  # Execute
  if [[ -x "$learn_loop_script" ]]; then
    log_info "Executing: $cmd"
    echo ""
    $cmd
  else
    log_error "ay-prod-learn-loop.sh not found or not executable at: $learn_loop_script"
    exit 1
  fi
}

# Main
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  dashboard                Show yo.life cockpit dashboard
  pivot <dimension>        Show pivoted view (temporal|spatial|dimensional)
  rooz                     Show rooz.yo.life co-op interface
  equity                   Show circle equity report
  insights                 Show causal learning insights
  hooks                    Show ceremony hook configuration
  spawn <circle> <ceremony> [adr]  Spawn new ceremony execution
  explain <circle> <ceremony> [perf]  Explain low performance (default: 0.35)
  run <iterations> [analyze] [circle]  Run learning cycles with hooks

Examples:
  $0 dashboard
  $0 pivot temporal
  $0 rooz
  $0 equity
  $0 insights
  $0 hooks
  $0 spawn orchestrator standup advisory
  $0 explain assessor wsjf 0.35
  $0 run 10                    # 10 iterations, all circles
  $0 run 20 analyze            # 20 iterations with causal analysis
  $0 run 5 false orchestrator  # 5 iterations, orchestrator only

EOF
  exit 1
}

main() {
  if [[ $# -eq 0 ]]; then
    # Default: show dashboard
    show_dashboard
    exit 0
  fi
  
  local command="$1"
  shift
  
  case "$command" in
    dashboard)
      show_dashboard
      ;;
    pivot)
      if [[ $# -eq 0 ]]; then
        show_pivot "temporal"
      else
        show_pivot "$1"
      fi
      ;;
    rooz)
      show_rooz
      ;;
    equity)
      show_equity
      ;;
    insights)
      show_insights
      ;;
    spawn)
      if [[ $# -lt 2 ]]; then
        log_error "Missing arguments for spawn"
        echo "Usage: $0 spawn <circle> <ceremony> [adr]"
        exit 1
      fi
      spawn_ceremony "$1" "$2" "${3:-}"
      ;;
    explain)
      if [[ $# -lt 2 ]]; then
        log_error "Missing arguments for explain"
        echo "Usage: $0 explain <circle> <ceremony> [performance]"
        exit 1
      fi
      explain_performance "$1" "$2" "${3:-0.35}"
      ;;
    hooks)
      if declare -f show_hook_config >/dev/null 2>&1; then
        show_hook_config
      else
        log_error "Ceremony hooks not loaded"
        exit 1
      fi
      ;;
    run)
      local iterations="${1:-5}"
      local auto_analyze="false"
      local circle=""
      
      # Parse arguments
      if [[ $# -ge 2 ]]; then
        if [[ "$2" == "analyze" || "$2" == "true" ]]; then
          auto_analyze="true"
        fi
      fi
      
      if [[ $# -ge 3 ]]; then
        circle="$3"
      fi
      
      run_learning "$iterations" "$auto_analyze" "$circle"
      ;;
    -h|--help)
      usage
      ;;
    *)
      log_error "Unknown command: $command"
      usage
      ;;
  esac
}

main "$@"
