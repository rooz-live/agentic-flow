#!/usr/bin/env bash
# ay-prod-cycle.sh - Run a Production Ceremony (single Circle × Ceremony)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${ROOT_DIR}/.cache/skills"

# Colors (define early)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log functions (define early)
log_info() {
  echo -e "${CYAN}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[⚠]${NC} $*"
}

log_error() {
  echo -e "${RED}[✗]${NC} $*"
}

# Load ceremony hooks
if [[ -f "$SCRIPT_DIR/hooks/ceremony-hooks.sh" ]]; then
  source "$SCRIPT_DIR/hooks/ceremony-hooks.sh"
fi
AGENTDB_PATH="${ROOT_DIR}/packages/agentdb"

# Check MCP health and set offline mode
export MCP_OFFLINE_MODE=0
if ! "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
    log_warn "MCP unavailable - using offline fallback"
    export MCP_OFFLINE_MODE=1
fi

# Circle to Ceremony to Skills mapping
declare -A CIRCLE_CEREMONIES=(
  [orchestrator]="standup"
  [assessor]="wsjf review"
  [innovator]="retro"
  [analyst]="refine"
  [seeker]="replenish"
  [intuitive]="synthesis"
)

declare -A CEREMONY_SKILLS=(
  [standup]="chaotic_workflow minimal_cycle retro_driven"
  [wsjf]="planning_heavy assessment_focused full_cycle"
  [review]="planning_heavy assessment_focused full_cycle"
  [retro]="retro_driven high_failure_cycle"
  [refine]="planning_heavy full_cycle chaotic_workflow"
  [replenish]="full_sprint_cycle skip_heavy_cycle"
  [synthesis]="full_cycle"
)


# Show usage
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  learn <runs>              Run learning cycles (default: 5)
  <circle> <ceremony> [adr] Execute ceremony for specified circle
  status                    Show current cycle status
  list-circles              List all circles and their ceremonies
  list-skills <ceremony>    List skills for a ceremony

Circles:
  orchestrator, assessor, innovator, analyst, seeker, intuitive

Ceremonies:
  standup, wsjf, review, retro, refine, replenish, synthesis

Examples:
  $0 learn 10
  $0 orchestrator standup advisory
  $0 assessor wsjf
  $0 status

EOF
  exit 1
}

# List all circles and ceremonies
list_circles() {
  echo -e "${BLUE}=== Circle to Ceremony Mapping ===${NC}\n"
  for circle in orchestrator assessor innovator analyst seeker intuitive; do
    ceremonies="${CIRCLE_CEREMONIES[$circle]}"
    echo -e "  ${GREEN}${circle}${NC} → ${CYAN}${ceremonies}${NC}"
  done
  echo ""
}

# List skills for a ceremony
list_skills() {
  local ceremony="$1"
  if [[ -z "${CEREMONY_SKILLS[$ceremony]:-}" ]]; then
    log_error "Unknown ceremony: $ceremony"
    exit 1
  fi

  echo -e "${BLUE}=== Skills for $ceremony ===${NC}\n"
  for skill in ${CEREMONY_SKILLS[$ceremony]}; do
    echo -e "  • ${GREEN}$skill${NC}"
  done
  echo ""
}

# Query skills from AgentDB before execution
query_skills() {
  local circle="$1"
  local ceremony="$2"

  log_info "Querying skills for ${circle}::${ceremony}..." >&2

  # Check cache first if MCP is offline
  if [[ "$MCP_OFFLINE_MODE" == "1" ]] && [[ -f "$CACHE_DIR/${circle}.json" ]]; then
      log_info "Using cached skills (offline mode)" >&2
      local skills=$(jq -r '.skills[]' "$CACHE_DIR/${circle}.json" 2>/dev/null || echo "")
      if [[ -n "$skills" ]]; then
          echo "$skills"
          return 0
      fi
  fi

  # Call skill lookup script (tries MCP first)
  if [[ -x "$SCRIPT_DIR/ay-prod-skill-lookup.sh" ]]; then
    # Redirect stderr to keep only skill output
    "$SCRIPT_DIR/ay-prod-skill-lookup.sh" "$circle" "$ceremony" 2>&2
  else
    # Fallback to local mapping
    local skills="${CEREMONY_SKILLS[$ceremony]:-}"
    if [[ -n "$skills" ]]; then
      log_info "Skills: $skills" >&2
      echo "$skills"
    else
      log_warn "No skills found for $ceremony" >&2
      echo ""
    fi
  fi
}

# Get dynamic thresholds (replaces hardcoded values)
get_dynamic_thresholds() {
  local circle="$1"
  local ceremony="$2"

  # Load from ay-dynamic-thresholds.sh if available
  if [[ -x "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]]; then
    # Source the functions
    source "$SCRIPT_DIR/ay-dynamic-thresholds.sh"

    # Calculate circuit breaker threshold
    local cb_result=$(calculate_circuit_breaker_threshold "$circle" 30)
    local circuit_breaker=$(echo "$cb_result" | cut -d'|' -f1)
    local cb_confidence=$(echo "$cb_result" | cut -d'|' -f5)

    # Calculate divergence rate
    local div_result=$(calculate_divergence_rate "$circle" 7)
    local divergence_rate=$(echo "$div_result" | cut -d'|' -f1)
    local div_confidence=$(echo "$div_result" | cut -d'|' -f3)

    # Calculate check frequency
    local check_result=$(calculate_check_frequency "$circle" "$ceremony")
    local check_frequency=$(echo "$check_result" | cut -d'|' -f1)

    # Export for use
    export CIRCUIT_BREAKER_THRESHOLD="${circuit_breaker:-0.7}"
    export DIVERGENCE_RATE="${divergence_rate:-0.1}"
    export CHECK_EVERY_N="${check_frequency:-10}"

    log_info "Dynamic thresholds loaded:"
    log_info "  Circuit Breaker: $CIRCUIT_BREAKER_THRESHOLD (${cb_confidence:-FALLBACK})"
    log_info "  Divergence Rate: $DIVERGENCE_RATE (${div_confidence:-FALLBACK})"
    log_info "  Check Frequency: Every $CHECK_EVERY_N episodes"
  else
    # Fallback to defaults
    export CIRCUIT_BREAKER_THRESHOLD="${CIRCUIT_BREAKER_THRESHOLD:-0.7}"
    export DIVERGENCE_RATE="${DIVERGENCE_RATE:-0.1}"
    export CHECK_EVERY_N="${CHECK_EVERY_N:-10}"

    log_warn "Dynamic thresholds not available, using defaults"
  fi
}

# Store episode with circle metadata
store_episode() {
  local circle="$1"
  local ceremony="$2"
  local episode_data="$3"

  log_info "Storing episode for ${circle}::${ceremony}..."

  if [[ -x "$SCRIPT_DIR/ay-prod-store-episode.sh" ]]; then
    echo "$episode_data" | "$SCRIPT_DIR/ay-prod-store-episode.sh" "$circle" "$ceremony"
  else
    log_warn "Episode storage script not found, skipping"
  fi
}

# Execute ceremony for a circle
execute_ceremony() {
  local circle="$1"
  local ceremony="$2"
  local adr="${3:-}"

  log_info "Executing ${CYAN}${ceremony}${NC} ceremony for ${GREEN}${circle}${NC} circle"

  # Load dynamic thresholds if enabled
  if [[ "${USE_DYNAMIC_THRESHOLDS:-0}" == "1" ]]; then
    get_dynamic_thresholds "$circle" "$ceremony"
  fi

  # PRE-CEREMONY HOOKS
  if declare -f run_pre_ceremony_hooks >/dev/null 2>&1; then
    run_pre_ceremony_hooks "$circle" "$ceremony"
  fi

  # Pre-execution: Query skills
  local skills=$(query_skills "$circle" "$ceremony")

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # REAL CEREMONY EXECUTION (v2 - Measured Outputs)
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  log_info "Executing $ceremony ceremony for $circle circle"

  local start_time=$(date +%s)
  local episode_file="/tmp/episode_${circle}_${ceremony}_${start_time}.json"

  # Execute real ceremony with measurable outputs
  local ceremony_output=""
  local ceremony_executor="$SCRIPT_DIR/ay-ceremony-executor.sh"
  if [[ -x "$ceremony_executor" ]]; then
    ceremony_output=$("$ceremony_executor" "$ceremony" "$circle" "$skills" 2>&1 || echo "ceremony execution failed")
    log_info "Ceremony output captured: ${#ceremony_output} chars"
  else
    log_warn "Ceremony executor not found, using fallback metadata"
    ceremony_output="ceremony=$ceremony circle=$circle skills=$skills"
  fi

  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  # DYNAMIC REWARD CALCULATION (MCP/MPP Pattern Integration)
  # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  local episode_status="success"
  local reward=1.0

  # Use dynamic reward calculator if available (v2 - measured rewards)
  local reward_calculated=false
  local reward_calculator="$ROOT_DIR/scripts/ay-reward-calculator.sh"
  if [[ -x "$reward_calculator" ]]; then
    # Pass real ceremony output to reward calculator

    # Calculate dynamic reward based on ceremony outcome
    local calc_result
    calc_result=$("$reward_calculator" "$ceremony" "$ceremony_output" 2>&1 | tail -1 | tr -d '\n' | xargs)

    # Parse result format: reward|confidence|method
    if [[ -n "$calc_result" ]] && [[ "$calc_result" =~ \| ]]; then
      reward=$(echo "$calc_result" | cut -d'|' -f1)
      local confidence=$(echo "$calc_result" | cut -d'|' -f2)
      local method=$(echo "$calc_result" | cut -d'|' -f3)
      reward_calculated=true
      log_info "✓ Dynamic reward: $reward (confidence=$confidence, method=$method)"
    elif [[ -n "$calc_result" ]] && [[ "$calc_result" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
      # Fallback: plain number format
      reward="$calc_result"
      reward_calculated=true
      log_info "✓ Dynamic reward: $reward (v2 - measured from ceremony)"
    else
      log_warn "Dynamic reward calculation failed (got: '$calc_result'), using fallback"
    fi
  fi

  # Apply divergence override ONLY if reward not calculated (v1 - simulated fallback)
  if [[ "$reward_calculated" == "false" ]] && [[ "${DIVERGENCE_RATE:-0}" != "0" ]] && [[ "${ALLOW_VARIANCE:-0}" == "1" ]]; then
    local random_pct=$((RANDOM % 100))
    local divergence_threshold=$(echo "$DIVERGENCE_RATE * 100" | bc | cut -d. -f1)

    if (( random_pct < divergence_threshold )); then
      episode_status="failed"
      reward=$(printf "%.2f" $(echo "scale=4; 0.3 + ($RANDOM % 40) / 100.0" | bc))
      log_warn "🎲 Divergence injected (v1 - simulated): ${YELLOW}FAILURE${NC} (reward=$reward)"
    else
      reward=$(printf "%.2f" $(echo "scale=4; 0.85 + ($RANDOM % 15) / 100.0" | bc))
      log_info "✓ Episode successful (v1 - simulated reward=$reward)"
    fi
  elif [[ "$reward_calculated" == "false" ]]; then
    # No calculator, no divergence - use default
    reward=1.0
    log_warn "Using default reward (no measurement available)"
  fi

  # Generate episode JSON with divergence-aware status
  cat > "$episode_file" <<EOF
{
  "status": "$episode_status",
  "ceremony": "CEREMONY_PLACEHOLDER",
  "circle": "CIRCLE_PLACEHOLDER",
  "timestamp": "TIMESTAMP_PLACEHOLDER",
  "reward": $reward,
  "divergence_mode": ${ALLOW_VARIANCE:-0}
}
EOF

  # Replace placeholders
  sed -i.bak "s/CEREMONY_PLACEHOLDER/$ceremony/g" "$episode_file"
  sed -i.bak "s/CIRCLE_PLACEHOLDER/$circle/g" "$episode_file"
  sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" "$episode_file"
  rm -f "$episode_file.bak"

  # Check if episode was created
  if [ -f "$episode_file" ] && [ -s "$episode_file" ]; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Augment episode with circle metadata
    if command -v jq >/dev/null 2>&1; then
      local augmented=$(jq -n \
        --arg circle "$circle" \
        --arg ceremony "$ceremony" \
        --arg skills "$skills" \
        --argjson duration "$duration" \
        --slurpfile episode "$episode_file" \
        '{
          circle: $circle,
          ceremony: $ceremony,
          skills: ($skills | split(" ")),
          duration: $duration,
          episode: $episode[0]
        }')
      echo "$augmented" > "$episode_file"
    fi

    # Post-execution: Store episode
    store_episode "$circle" "$ceremony" "$(cat "$episode_file")"

    # DoD Validation Phase
    log_info "Executing Definition of Done (DoD) Contract Enforcement Gate..."
    if [[ -x "$ROOT_DIR/scripts/contract-enforcement-gate.sh" ]]; then
      if "$ROOT_DIR/scripts/contract-enforcement-gate.sh" verify; then
        log_success "Contract Enforcement Gate passed."
      else
        log_warn "Contract Enforcement Gate failed. Review ENFORCEMENT_REPORT.json."
        # Could decide to fail the episode here, but for now we warn
      fi
    else
      log_warn "Contract Enforcement Gate script not found."
    fi

    # Step 7.6: Record causal observation
    if command -v tsx >/dev/null 2>&1; then
      log_info "Recording causal observation..."
      tsx "$ROOT_DIR/src/integrations/causal-learning-integration.ts" record "$episode_file" 2>/dev/null || true
    fi

    log_success "Ceremony completed in ${duration}s"
    log_info "Episode saved to: $episode_file"

    # POST-CEREMONY HOOKS (success)
    if declare -f run_post_ceremony_hooks >/dev/null 2>&1; then
      run_post_ceremony_hooks "$circle" "$ceremony" 0 "$episode_file" "$duration" ""
    fi
  else
    local exit_code=$?
    log_error "Ceremony failed with exit code $exit_code"

    # POST-CEREMONY HOOKS (failure)
    if declare -f run_post_ceremony_hooks >/dev/null 2>&1; then
      run_post_ceremony_hooks "$circle" "$ceremony" "$exit_code" "" 0 "ceremony execution failed"
    fi

    return $exit_code
  fi
}

# Run learning cycles
run_learning() {
  local runs="${1:-5}"

  log_info "Starting ${runs} learning cycles..."

  if [[ -x "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]]; then
    "$SCRIPT_DIR/ay-prod-learn-loop.sh" "$runs"
  else
    log_warn "Learning loop script not found, using fallback"

    # Fallback: Run basic cycles
    for ((i=1; i<=runs; i++)); do
      log_info "Learning cycle $i/$runs"

      # Cycle through circles
      for circle in orchestrator assessor analyst; do
        local ceremonies="${CIRCLE_CEREMONIES[$circle]}"
        for ceremony in $ceremonies; do
          execute_ceremony "$circle" "$ceremony" "" || true
        done
      done
    done
  fi

  log_success "Learning cycles completed"
}

# Show cycle status
show_status() {
  echo -e "${BLUE}=== Production Cycle Status ===${NC}\n"

  # Check for calibration data
  local calibration_file="$ROOT_DIR/.goalie/prod_cycle_calibration.json"
  if [[ -f "$calibration_file" ]]; then
    if command -v jq >/dev/null 2>&1; then
      local dod_met=$(jq -r '.dod_met // false' "$calibration_file")
      local ok_rate=$(jq -r '.post_calibration_metrics.ok_rate // 0' "$calibration_file")
      local efficiency=$(jq -r '.post_calibration_metrics.efficiency // 0' "$calibration_file")

      echo -e "  DoD Met: ${GREEN}${dod_met}${NC}"
      echo -e "  OK Rate: ${GREEN}${ok_rate}%${NC}"
      echo -e "  Efficiency: ${GREEN}${efficiency}%${NC}"
    else
      cat "$calibration_file"
    fi
  else
    log_warn "No calibration data found"
  fi

  echo ""
}

# Main entry point
main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi

  local command="$1"
  shift

  case "$command" in
    learn)
      run_learning "${1:-5}"
      ;;
    status)
      show_status
      ;;
    list-circles)
      list_circles
      ;;
    list-skills)
      if [[ $# -eq 0 ]]; then
        log_error "Missing ceremony argument"
        usage
      fi
      list_skills "$1"
      ;;
    orchestrator|assessor|innovator|analyst|seeker|intuitive)
      if [[ $# -eq 0 ]]; then
        log_error "Missing ceremony argument"
        usage
      fi
      local ceremony="$1"
      local adr="${2:-}"

      # Validate ceremony for circle
      local valid_ceremonies="${CIRCLE_CEREMONIES[$command]}"
      if [[ ! " $valid_ceremonies " =~ " $ceremony " ]]; then
        log_error "Invalid ceremony '$ceremony' for circle '$command'"
        log_info "Valid ceremonies: $valid_ceremonies"
        exit 1
      fi

      execute_ceremony "$command" "$ceremony" "$adr"
      ;;
    *)
      log_error "Unknown command: $command"
      usage
      ;;
  esac
}

main "$@"
