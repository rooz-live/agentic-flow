#!/usr/bin/env bash
# mcp-auto-heal.sh - Auto-restart/self-heal MCP providers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CIRCUIT_STATE_FILE="${ROOT_DIR}/.goalie/circuit_breaker_state.json"
RECOVERY_LOG="${ROOT_DIR}/.goalie/recovery_attempts.jsonl"
EVIDENCE_LOG="${ROOT_DIR}/.goalie/mcp_health_evidence.jsonl"

# Ensure directories exist
mkdir -p "$(dirname "$CIRCUIT_STATE_FILE")"
mkdir -p "$(dirname "$RECOVERY_LOG")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

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

# Log recovery attempt to JSONL
log_recovery_attempt() {
  local provider="$1"
  local action="$2"
  local result="$3"
  local details="${4:-}"
  
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  cat >> "$RECOVERY_LOG" <<EOF
{"timestamp":"$timestamp","provider":"$provider","action":"$action","result":"$result","details":"$details"}
EOF
}

# Get circuit breaker state for provider
get_circuit_state() {
  local provider="$1"
  
  if [[ ! -f "$CIRCUIT_STATE_FILE" ]]; then
    echo "CLOSED"
    return
  fi
  
  if command -v jq >/dev/null 2>&1; then
    local state=$(jq -r ".\"$provider\".state // \"CLOSED\"" "$CIRCUIT_STATE_FILE" 2>/dev/null || echo "CLOSED")
    echo "$state"
  else
    echo "CLOSED"
  fi
}

# Get time since circuit opened
get_circuit_open_duration() {
  local provider="$1"
  
  if [[ ! -f "$CIRCUIT_STATE_FILE" ]]; then
    echo "0"
    return
  fi
  
  if command -v jq >/dev/null 2>&1; then
    local open_time=$(jq -r ".\"$provider\".last_failure_time // \"\"" "$CIRCUIT_STATE_FILE" 2>/dev/null || echo "")
    
    if [[ -z "$open_time" ]]; then
      echo "0"
      return
    fi
    
    local now=$(date +%s)
    local then=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$open_time" +%s 2>/dev/null || echo "$now")
    local duration=$((now - then))
    
    echo "$duration"
  else
    echo "0"
  fi
}

# Update circuit breaker state
update_circuit_state() {
  local provider="$1"
  local new_state="$2"
  
  if command -v jq >/dev/null 2>&1; then
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create or update state file
    if [[ -f "$CIRCUIT_STATE_FILE" ]]; then
      jq --arg provider "$provider" \
         --arg state "$new_state" \
         --arg time "$timestamp" \
         '.[$provider] = {state: $state, last_transition: $time}' \
         "$CIRCUIT_STATE_FILE" > "${CIRCUIT_STATE_FILE}.tmp"
      mv "${CIRCUIT_STATE_FILE}.tmp" "$CIRCUIT_STATE_FILE"
    else
      echo "{\"$provider\": {\"state\": \"$new_state\", \"last_transition\": \"$timestamp\"}}" > "$CIRCUIT_STATE_FILE"
    fi
  fi
}

# Check provider health
check_provider() {
  local provider="$1"
  local command="$2"
  
  if timeout 3 $command &>/dev/null; then
    return 0
  else
    return 1
  fi
}

# Attempt to heal provider
heal_provider() {
  local provider="$1"
  local command="$2"
  
  log_info "Attempting to heal $provider..."
  log_recovery_attempt "$provider" "heal_start" "in_progress" "Circuit breaker OPEN for >10 minutes"
  
  # Step 1: Clear npm cache
  log_info "Clearing npm cache..."
  if npm cache clean --force &>/dev/null; then
    log_success "Cache cleared"
  else
    log_warn "Cache clear failed, continuing anyway"
  fi
  
  # Step 2: Try reinstall
  log_info "Attempting package reinstall..."
  local install_result=0
  if npx --yes "$provider" --version &>/dev/null; then
    log_success "Package reinstalled successfully"
    install_result=0
  else
    log_error "Package reinstall failed"
    install_result=1
  fi
  
  # Step 3: Update circuit to HALF_OPEN
  if [[ $install_result -eq 0 ]]; then
    log_info "Transitioning circuit to HALF_OPEN..."
    update_circuit_state "$provider" "HALF_OPEN"
    log_recovery_attempt "$provider" "transition" "success" "Circuit moved to HALF_OPEN"
  else
    log_recovery_attempt "$provider" "heal_failed" "failure" "Package reinstall failed"
    return 1
  fi
  
  # Step 4: Verify with 2 health checks
  log_info "Verifying recovery with health checks..."
  local success_count=0
  
  for i in {1..2}; do
    sleep 2
    if check_provider "$provider" "$command"; then
      ((success_count++))
      log_success "Health check $i/2 passed"
    else
      log_warn "Health check $i/2 failed"
      break
    fi
  done
  
  # Step 5: Transition to CLOSED if successful
  if [[ $success_count -eq 2 ]]; then
    update_circuit_state "$provider" "CLOSED"
    log_success "Auto-heal successful for $provider - circuit CLOSED"
    log_recovery_attempt "$provider" "heal_complete" "success" "Provider recovered and verified"
    return 0
  else
    log_error "Auto-heal failed for $provider - verification failed"
    log_recovery_attempt "$provider" "heal_failed" "failure" "Health check verification failed ($success_count/2)"
    return 1
  fi
}

# Main healing loop
main() {
  local mode="${1:-check}"
  
  log_info "Starting MCP auto-heal (mode: $mode)"
  echo ""
  
  # Define providers and their commands
  declare -A PROVIDERS=(
    ["agentdb"]="npx agentdb --version"
    ["claude-flow"]="npx claude-flow --version"
    ["context7"]="npx context7 --version"
  )
  
  local healed_count=0
  local failed_count=0
  
  for provider in "${!PROVIDERS[@]}"; do
    local command="${PROVIDERS[$provider]}"
    local state=$(get_circuit_state "$provider")
    
    log_info "Checking $provider (current state: $state)"
    
    # Check if circuit is OPEN
    if [[ "$state" == "OPEN" ]]; then
      local duration=$(get_circuit_open_duration "$provider")
      local duration_min=$((duration / 60))
      
      log_warn "$provider circuit OPEN for ${duration_min} minutes"
      
      # Auto-heal if OPEN for >10 minutes
      if [[ $duration -ge 600 ]]; then  # 10 minutes
        if [[ "$mode" == "heal" ]]; then
          if heal_provider "$provider" "$command"; then
            ((healed_count++))
          else
            ((failed_count++))
          fi
        else
          log_info "Would attempt auto-heal (run with 'heal' to execute)"
        fi
      else
        log_info "Waiting for circuit to remain open longer before auto-heal"
      fi
    elif [[ "$state" == "HALF_OPEN" ]]; then
      log_info "$provider in HALF_OPEN state - monitoring"
      
      # Verify current health
      if check_provider "$provider" "$command"; then
        log_success "$provider responding - transitioning to CLOSED"
        update_circuit_state "$provider" "CLOSED"
        ((healed_count++))
      else
        log_warn "$provider still failing - keeping HALF_OPEN"
      fi
    else
      # CLOSED - verify health
      if check_provider "$provider" "$command"; then
        log_success "$provider healthy"
      else
        log_warn "$provider failed health check but circuit is CLOSED"
      fi
    fi
    
    echo ""
  done
  
  # Summary
  echo ""
  log_info "Auto-heal summary:"
  echo "  Providers healed: $healed_count"
  echo "  Heal attempts failed: $failed_count"
  echo ""
  
  if [[ "$mode" == "check" ]] && [[ $healed_count -gt 0 || $failed_count -gt 0 ]]; then
    log_info "Run with 'heal' mode to execute recovery: $0 heal"
  fi
}

# Show usage
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  cat << EOF
Usage: $0 [mode]

Modes:
  check  - Check for circuits that need healing (default)
  heal   - Attempt auto-heal for OPEN circuits >10 minutes
  
Examples:
  $0             # Check mode (dry run)
  $0 heal        # Execute healing

Auto-heal process:
  1. Detect circuit breaker OPEN state for >10 minutes
  2. Clear npm cache
  3. Attempt package reinstall
  4. Transition circuit to HALF_OPEN
  5. Verify with 2 consecutive health checks
  6. Transition to CLOSED on success

Logs:
  Circuit state: .goalie/circuit_breaker_state.json
  Recovery log:  .goalie/recovery_attempts.jsonl
  Evidence:      .goalie/mcp_health_evidence.jsonl
  
EOF
  exit 0
fi

main "${1:-check}"
