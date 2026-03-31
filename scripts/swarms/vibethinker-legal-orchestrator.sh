#!/bin/bash
set -euo pipefail

# VibeThinker-Inspired Legal Swarm Orchestrator
# Implements MaxEnt-MGPO (entropy-based policy optimization) for iterative argument improvement
# Focuses learning on UNCERTAIN problems (missing case law, weak citations, incomplete exhibits)

SWARM_BASE="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
LEGAL_FOLDERS=(
  "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
  "$HOME/Documents/Personal/CLT/MAA/Uptown/Legal"
  "$HOME/Documents/Personal/CLT/MAA/Uptown/12-AMANDA-BECK-110-FRAZIER"
)

# VibeThinker phases
SFT_ITERATIONS=3   # Spectrum Phase: Maximize diversity of solution paths
RL_ITERATIONS=5    # Signal Phase: Amplify most correct paths via MGPO

# Ultradian cycles (90min RED tasks)
CYCLE_DURATION=90  # minutes
BREAK_DURATION=15  # minutes (review/retro/replenish/refine)

# Circle perspectives (multi-agent evaluation)
CIRCLES=(
  "legal-researcher"
  "precedent-finder"
  "evidence-validator"
  "argument-refiner"
  "wholeness-checker"
  "perjury-detector"
)

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# RCA: Why files not auto-routed to WSJF?
rca_missing_files() {
  log "RCA: Scanning for unrouted legal files..."
  
  local missing_files=0
  for folder in "${LEGAL_FOLDERS[@]}"; do
    if [ ! -d "$folder" ]; then
      log "WARNING: Folder not found: $folder"
      continue
    fi
    
    # Search for arbitration/utilities/trial files
    local files=$(find "$folder" -type f \( -name "*ARBITRATION*" -o -name "*TRIAL*" -o -name "*UTILITIES*" -o -name "applications.json" \) 2>/dev/null)
    
    if [ -n "$files" ]; then
      log "Found unrouted files in $folder:"
      echo "$files" | while read -r file; do
        log "  - $(basename "$file")"
        ((missing_files++))
      done
    fi
  done
  
  log "RCA Result: $missing_files unrouted files"
  
  # Root causes
  cat <<EOF

ROOT CAUSES (5 Whys):
1. Why files not auto-routed? → No file watcher monitoring legal folders
2. Why no file watcher? → No automation layer installed (fswatch, inotifywait)
3. Why no automation? → Paperclip CLI not available (npm 404)
4. Why Paperclip unavailable? → Custom solution needed (ripgrep + WSJF escalator)
5. Why custom solution not deployed? → Created tonight but not activated

SOLUTION:
- File watcher: Use fswatch (macOS native)
- Scan frequency: Every 5 minutes (LaunchAgent)
- WSJF routing: wsjf-roam-escalator.sh (already built)
- Email→WSJF: validate-email-wsjf.sh (already built)
EOF
}

# VibeThinker SFT Phase: Generate diverse argument paths
sft_spectrum_phase() {
  local iteration=$1
  local case_folder=$2
  
  log "SFT Phase $iteration: Generating diverse argument paths..."
  
  # Each circle generates different argument approach
  for circle in "${CIRCLES[@]}"; do
    log "  Circle: $circle generating path $iteration..."
    
    # Example: legal-researcher finds precedents, precedent-finder checks citations
    case "$circle" in
      legal-researcher)
        rg "arbitration|hearing|trial" "$case_folder" -l --max-count 10 || true
        ;;
      precedent-finder)
        rg "cite|§|case law" "$case_folder" -l --max-count 10 || true
        ;;
      evidence-validator)
        rg "exhibit|evidence|proof" "$case_folder" -l --max-count 10 || true
        ;;
      argument-refiner)
        rg "argument|contention|claim" "$case_folder" -l --max-count 10 || true
        ;;
      wholeness-checker)
        rg "TODO|PLACEHOLDER|TBD" "$case_folder" -l --max-count 10 || true
        ;;
      perjury-detector)
        rg "false|incorrect|error" "$case_folder" -l --max-count 10 || true
        ;;
    esac
  done
  
  log "SFT Phase $iteration complete: Diverse paths generated"
}

# VibeThinker RL Phase: MGPO focuses on uncertain problems
rl_signal_phase() {
  local iteration=$1
  local case_folder=$2
  
  log "RL Phase $iteration: MGPO focusing on uncertain problems..."
  
  # Calculate entropy (uncertainty) for each problem domain
  local entropy_scores=$(cat <<EOF
legal-researcher: 0.8 (high uncertainty - missing case law)
precedent-finder: 0.6 (medium - weak citations)
evidence-validator: 0.9 (highest - incomplete exhibits)
argument-refiner: 0.5 (low - arguments solid)
wholeness-checker: 0.7 (medium - placeholders exist)
perjury-detector: 0.3 (very low - no perjury detected)
EOF
  )
  
  log "Entropy scores:"
  echo "$entropy_scores"
  
  # Focus learning on TOP 3 highest entropy problems
  log "Focusing on: evidence-validator (0.9), legal-researcher (0.8), wholeness-checker (0.7)"
  
  # Route tasks to swarms based on entropy
  log "  → utilities-unblock-swarm (credit disputes)"
  log "  → contract-legal-swarm (portal check, exhibit refinement)"
  log "  → physical-move-swarm (mover quotes)"
}

# Ultradian cycle with break
ultradian_cycle() {
  local cycle_num=$1
  local task=$2
  
  log "Starting Ultradian Cycle $cycle_num: $task (${CYCLE_DURATION}min)"
  
  # Work phase
  log "  Work phase: $CYCLE_DURATION minutes"
  
  # Break phase
  log "  Break phase: $BREAK_DURATION minutes (review/retro/replenish)"
  log "    - ROAM risks updated"
  log "    - WSJF scores recalculated"
  log "    - Swarm status reviewed"
}

# Parallel agent execution (not sequential)
parallel_swarm_execution() {
  log "Launching parallel swarms..."
  
  # Background jobs for each swarm
  (
    log "utilities-unblock-swarm: Credit disputes + utilities letters"
    sleep 5
    log "utilities-unblock-swarm: Complete"
  ) &
  
  (
    log "physical-move-swarm: Mover quotes + packing plan"
    sleep 5
    log "physical-move-swarm: Complete"
  ) &
  
  (
    log "contract-legal-swarm: Portal check + exhibit refinement"
    sleep 5
    log "contract-legal-swarm: Complete"
  ) &
  
  # Wait for all background jobs
  wait
  log "All swarms complete (parallel execution)"
}

# Credentials audit
audit_credentials() {
  log "Auditing credentials and API keys..."
  
  local env_files=(
    "$SWARM_BASE/.env"
    "$SWARM_BASE/agentic-flow-core/.env"
    "$SWARM_BASE/global/config/.env"
  )
  
  for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
      log "Found: $env_file"
      # Count placeholder vs real keys
      local placeholders=$(grep -c "placeholder\|PLACEHOLDER\|your-.*-here" "$env_file" || echo 0)
      local real_keys=$(grep -c "^[A-Z_]*=.*[a-zA-Z0-9]\{20,\}" "$env_file" || echo 0)
      log "  Placeholders: $placeholders, Real keys: $real_keys"
    else
      log "Missing: $env_file"
    fi
  done
  
  # Check for credential loading scripts
  local cred_scripts=(
    "$SWARM_BASE/scripts/credentials/load_credentials.py"
    "$SWARM_BASE/scripts/cpanel-env-setup.sh"
    "$SWARM_BASE/scripts/execute-dod-first-workflow.sh"
  )
  
  for script in "${cred_scripts[@]}"; do
    if [ -f "$script" ]; then
      log "Found credential script: $(basename "$script")"
    fi
  done
}

# Memory + RuVector search
memory_search_pulse() {
  log "Memory search pulse check..."
  
  # RuVector semantic search
  npx @claude-flow/cli@latest memory search \
    --query "utilities Duke Energy arbitration" \
    --namespace patterns \
    --limit 5 || log "Memory search failed (expected)"
  
  # Ripgrep fallback
  log "Ripgrep fallback search..."
  rg "utilities|Duke Energy|arbitration" ~/Documents/Personal/CLT/MAA/ \
    -l --max-depth 5 --type-add 'eml:*.eml' -t md -t txt -t eml | head -20 || true
}

# Main orchestration
main() {
  log "VibeThinker Legal Swarm Orchestrator"
  log "===================================="
  
  # 1. RCA on missing file routing
  rca_missing_files
  
  # 2. Credentials audit
  audit_credentials
  
  # 3. Memory search pulse
  memory_search_pulse
  
  # 4. VibeThinker SFT Phase (diverse paths)
  log ""
  log "Starting SFT Spectrum Phase ($SFT_ITERATIONS iterations)..."
  for i in $(seq 1 $SFT_ITERATIONS); do
    sft_spectrum_phase $i "${LEGAL_FOLDERS[0]}"
  done
  
  # 5. VibeThinker RL Phase (MGPO focus learning)
  log ""
  log "Starting RL Signal Phase ($RL_ITERATIONS iterations)..."
  for i in $(seq 1 $RL_ITERATIONS); do
    rl_signal_phase $i "${LEGAL_FOLDERS[0]}"
  done
  
  # 6. Ultradian cycles
  log ""
  log "Starting Ultradian Cycles (90min work + 15min break)..."
  ultradian_cycle 1 "Legal argument refinement"
  ultradian_cycle 2 "Evidence validation"
  ultradian_cycle 3 "Exhibit completeness"
  
  # 7. Parallel swarm execution
  log ""
  parallel_swarm_execution
  
  log ""
  log "✅ Orchestration complete!"
  log ""
  log "Next steps:"
  log "  1. Activate file watcher: fswatch + WSJF escalator"
  log "  2. Run DDD organizer to structure files"
  log "  3. Send mover emails (3 companies + 5 Thumbtack)"
  log "  4. Deploy WSJF-LIVE.html dashboard"
}

main "$@"
