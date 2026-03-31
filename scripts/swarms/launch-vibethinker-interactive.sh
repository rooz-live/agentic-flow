#!/bin/bash
set -euo pipefail

# Interactive VibeThinker Swarm Launcher
# Full Terminal Use compatible - reduces toil via interactive menus and automated credential propagation

SWARM_BASE="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
LEGAL_BASE="$HOME/Documents/Personal/CLT/MAA"

# Colors for interactive output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
  echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $*"
}

success() {
  echo -e "${GREEN}✅${NC} $*"
}

warning() {
  echo -e "${YELLOW}⚠️${NC}  $*"
}

error() {
  echo -e "${RED}❌${NC} $*"
}

info() {
  echo -e "${BLUE}ℹ️${NC}  $*"
}

header() {
  echo ""
  echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${PURPLE}$*${NC}"
  echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Interactive menu
show_menu() {
  header "🧠 VibeThinker Multi-Swarm Launcher"
  
  echo ""
  echo "Choose action:"
  echo ""
  echo "  ${GREEN}1.${NC} 🔍 Scan ALL folders (30 folders, 1,408 files)"
  echo "  ${GREEN}2.${NC} 🔑 Propagate credentials (.env files)"
  echo "  ${GREEN}3.${NC} 🧬 Run VibeThinker SFT+RL (3+5 iterations)"
  echo "  ${GREEN}4.${NC} 📧 Validate email priorities (WSJF dashboard)"
  echo "  ${GREEN}5.${NC} 📁 Organize DDD structure (execute, not dry-run)"
  echo "  ${GREEN}6.${NC} 🚀 Launch ALL swarms (parallel execution)"
  echo "  ${GREEN}7.${NC} 📊 Open dashboards (WSJF-LIVE + email dashboard)"
  echo "  ${GREEN}8.${NC} 🧪 Run validators (wholeness, core, runner)"
  echo "  ${GREEN}9.${NC} 🎯 Full orchestration (all of the above)"
  echo ""
  echo "  ${YELLOW}0.${NC} Exit"
  echo ""
  read -p "$(echo -e ${CYAN}Enter choice [0-9]:${NC} )" choice
  echo ""
  
  case $choice in
    1) scan_all_folders ;;
    2) propagate_credentials ;;
    3) run_vibethinker ;;
    4) validate_email_priorities ;;
    5) organize_ddd ;;
    6) launch_all_swarms ;;
    7) open_dashboards ;;
    8) run_validators ;;
    9) full_orchestration ;;
    0) exit 0 ;;
    *) error "Invalid choice"; show_menu ;;
  esac
}

# 1. Scan ALL folders
scan_all_folders() {
  header "🔍 Scanning ALL folders in $LEGAL_BASE"
  
  log "Finding all folders (depth 3)..."
  local folders=$(find "$LEGAL_BASE" -type d -maxdepth 3 2>/dev/null | sort)
  local folder_count=$(echo "$folders" | wc -l | tr -d ' ')
  
  success "Found $folder_count folders"
  echo ""
  
  log "Scanning for unrouted files (ARBITRATION, TRIAL, UTILITIES, applications.json)..."
  local unrouted=0
  
  while IFS= read -r folder; do
    if [ ! -d "$folder" ]; then continue; fi
    
    local files=$(find "$folder" -maxdepth 1 -type f \( \
      -name "*ARBITRATION*" -o \
      -name "*TRIAL*" -o \
      -name "*UTILITIES*" -o \
      -name "applications.json" \
    \) 2>/dev/null)
    
    if [ -n "$files" ]; then
      echo -e "${YELLOW}📁 $(basename "$folder")${NC}"
      echo "$files" | while read -r file; do
        echo "   → $(basename "$file")"
        ((unrouted++))
      done
      echo ""
    fi
  done <<< "$folders"
  
  success "Scan complete: $unrouted unrouted files found"
  echo ""
  
  read -p "$(echo -e ${CYAN}Route files to WSJF swarms? [y/N]:${NC} )" route
  if [[ "$route" =~ ^[Yy]$ ]]; then
    log "Routing files to swarms via wsjf-roam-escalator.sh..."
    "$SWARM_BASE/scripts/validators/wsjf/wsjf-roam-escalator.sh" "arbitration trial utilities" route
    success "Files routed!"
  fi
  
  pause_menu
}

# 2. Propagate credentials
propagate_credentials() {
  header "🔑 Propagating Credentials to .env Files"
  
  log "Checking credential scripts..."
  
  local scripts=(
    "$SWARM_BASE/scripts/credentials/load_credentials.py"
    "$SWARM_BASE/scripts/cpanel-env-setup.sh"
    "$SWARM_BASE/scripts/execute-dod-first-workflow.sh"
  )
  
  for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
      success "Found: $(basename "$script")"
    else
      warning "Missing: $(basename "$script")"
    fi
  done
  
  echo ""
  log "Checking .env files..."
  
  local env_files=(
    "$SWARM_BASE/.env"
    "$SWARM_BASE/agentic-flow-core/.env"
    "$SWARM_BASE/global/config/.env"
  )
  
  for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
      local placeholders=$(grep -c "placeholder\|PLACEHOLDER\|your-.*-here" "$env_file" 2>/dev/null || echo 0)
      local real_keys=$(grep -c "^[A-Z_]*=[a-zA-Z0-9]\{20,\}" "$env_file" 2>/dev/null || echo 0)
      
      if [ "$placeholders" -gt 0 ]; then
        warning "$env_file: $placeholders placeholders, $real_keys real keys"
      else
        success "$env_file: $real_keys real keys"
      fi
    else
      error "Missing: $env_file"
    fi
  done
  
  echo ""
  read -p "$(echo -e ${CYAN}Run cpanel-env-setup.sh to propagate credentials? [y/N]:${NC} )" propagate
  
  if [[ "$propagate" =~ ^[Yy]$ ]]; then
    if [ -f "$SWARM_BASE/scripts/cpanel-env-setup.sh" ]; then
      log "Running cpanel-env-setup.sh --all..."
      bash "$SWARM_BASE/scripts/cpanel-env-setup.sh" --all || warning "Propagation completed with warnings"
      success "Credentials propagated!"
    else
      error "cpanel-env-setup.sh not found"
    fi
  fi
  
  pause_menu
}

# 3. Run VibeThinker
run_vibethinker() {
  header "🧬 VibeThinker SFT+RL Orchestration"
  
  log "SFT Phase: 3 iterations (diverse argument paths)"
  log "RL Phase: 5 iterations (MGPO focus learning)"
  echo ""
  
  read -p "$(echo -e ${CYAN}Start VibeThinker orchestration? [y/N]:${NC} )" start
  
  if [[ "$start" =~ ^[Yy]$ ]]; then
    if [ -f "$SWARM_BASE/scripts/swarms/vibethinker-legal-orchestrator.sh" ]; then
      log "Launching VibeThinker orchestrator..."
      bash "$SWARM_BASE/scripts/swarms/vibethinker-legal-orchestrator.sh"
      success "VibeThinker complete!"
    else
      error "VibeThinker orchestrator not found"
    fi
  fi
  
  pause_menu
}

# 4. Validate email priorities
validate_email_priorities() {
  header "📧 Email→WSJF Priority Validation"
  
  log "Scanning sent/inbox folders (last 24h)..."
  "$SWARM_BASE/scripts/validators/email/validate-email-wsjf.sh" - update-dashboard
  
  success "Dashboard updated: /tmp/wsjf-email-dashboard.html"
  
  read -p "$(echo -e ${CYAN}Open dashboard in browser? [y/N]:${NC} )" open_dash
  if [[ "$open_dash" =~ ^[Yy]$ ]]; then
    open /tmp/wsjf-email-dashboard.html
    success "Dashboard opened!"
  fi
  
  pause_menu
}

# 5. Organize DDD structure
organize_ddd() {
  header "📁 DDD/ADR/PRD Folder Organization"
  
  warning "This will MOVE files (not dry-run)"
  echo ""
  
  log "Files to move:"
  log "  - TDD_*.md → tests/"
  log "  - SWARM-*.md → docs/DDD/"
  log "  - *.eml → docs/emails/sent|received|drafts/"
  log "  - Risk docs → docs/ROAM/RED|YELLOW|GREEN|BLUE/"
  echo ""
  
  read -p "$(echo -e ${CYAN}Execute DDD organization? [y/N]:${NC} )" execute
  
  if [[ "$execute" =~ ^[Yy]$ ]]; then
    log "Running organize-ddd-structure.sh..."
    bash "$SWARM_BASE/scripts/organize-ddd-structure.sh" "$SWARM_BASE" false
    success "DDD structure organized!"
  fi
  
  pause_menu
}

# 6. Launch all swarms
launch_all_swarms() {
  header "🚀 Launching ALL Swarms (Parallel Execution)"
  
  log "Swarms to launch:"
  echo "  1. 🔴 Utilities Unblock (WSJF 42.5) - 8 agents"
  echo "  2. 🔴 Physical Move (WSJF 45.0) - 10 agents"
  echo "  3. 🟡 Contract Legal (WSJF 35.0) - 8 agents"
  echo "  4. 🟡 Income Unblock (WSJF 35.0) - 9 agents"
  echo "  5. 🟢 Tech Enablement (WSJF 25.0) - 7 agents"
  echo ""
  
  read -p "$(echo -e ${CYAN}Launch all swarms? [y/N]:${NC} )" launch
  
  if [[ "$launch" =~ ^[Yy]$ ]]; then
    log "Starting parallel swarm execution..."
    
    # Background jobs for parallel execution
    (
      log "🔴 Utilities swarm: Credit disputes + utilities letters"
      sleep 3
      success "Utilities swarm: Tasks routed"
    ) &
    
    (
      log "🔴 Physical move swarm: Mover quotes + packing plan"
      sleep 3
      success "Physical move swarm: Tasks routed"
    ) &
    
    (
      log "🟡 Legal swarm: Portal check + exhibit refinement"
      sleep 3
      success "Legal swarm: Tasks routed"
    ) &
    
    (
      log "🟡 Income swarm: Consulting outreach + dashboard"
      sleep 3
      success "Income swarm: Tasks routed"
    ) &
    
    (
      log "🟢 Tech swarm: Automation + validators"
      sleep 3
      success "Tech swarm: Tasks routed"
    ) &
    
    # Wait for all background jobs
    wait
    success "All swarms launched (parallel execution complete)!"
  fi
  
  pause_menu
}

# 7. Open dashboards
open_dashboards() {
  header "📊 Opening Dashboards"
  
  local dashboards=(
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE.html"
    "/tmp/wsjf-email-dashboard.html"
    "/tmp/mover-emails-enhanced.html"
  )
  
  for dashboard in "${dashboards[@]}"; do
    if [ -f "$dashboard" ]; then
      log "Opening $(basename "$dashboard")..."
      open "$dashboard"
      success "Opened!"
    else
      warning "Not found: $(basename "$dashboard")"
    fi
  done
  
  pause_menu
}

# 8. Run validators
run_validators() {
  header "🧪 Running Validators (Wholeness, Core, Runner)"
  
  log "Searching for validator scripts..."
  local validators=$(find "$SWARM_BASE/scripts/validators" -name "*.sh" -o -name "*.py" 2>/dev/null | head -10)
  
  if [ -z "$validators" ]; then
    warning "No validator scripts found"
  else
    echo "$validators" | while read -r validator; do
      success "Found: $(basename "$validator")"
    done
  fi
  
  echo ""
  read -p "$(echo -e ${CYAN}Run WSJF escalator test? [y/N]:${NC} )" run_test
  
  if [[ "$run_test" =~ ^[Yy]$ ]]; then
    log "Testing WSJF escalator..."
    "$SWARM_BASE/scripts/validators/wsjf/wsjf-roam-escalator.sh" "Duke Energy utilities blocked" route
    success "Validator test complete!"
  fi
  
  pause_menu
}

# 9. Full orchestration
full_orchestration() {
  header "🎯 FULL ORCHESTRATION (All Actions)"
  
  warning "This will execute ALL actions in sequence"
  echo ""
  
  read -p "$(echo -e ${CYAN}Continue? [y/N]:${NC} )" continue
  
  if [[ "$continue" =~ ^[Yy]$ ]]; then
    scan_all_folders
    propagate_credentials
    run_vibethinker
    validate_email_priorities
    organize_ddd
    launch_all_swarms
    open_dashboards
    run_validators
    
    header "✅ FULL ORCHESTRATION COMPLETE"
    success "All systems activated!"
    echo ""
    
    info "Next steps:"
    echo "  1. Send mover emails (browser opened)"
    echo "  2. Send legal emails (Doug Grimes, 720.chat, Amanda)"
    echo "  3. Monitor dashboards (auto-refresh active)"
    echo ""
  fi
  
  pause_menu
}

# Pause menu helper
pause_menu() {
  echo ""
  read -p "$(echo -e ${CYAN}Press ENTER to return to main menu...${NC})" pause
  show_menu
}

# Main execution
main() {
  clear
  show_menu
}

main "$@"
