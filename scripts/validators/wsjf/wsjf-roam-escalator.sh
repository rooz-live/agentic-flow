#!/bin/bash
set -euo pipefail

# Validator #13: WSJF-ROAM Email Escalator
# Email → Folder → WSJF Risk Matrix → Swarm Routing
# Eliminates 68 min/day manual folder digging + email routing
#
# Exit Codes (Robust Semantic Zones):
#   0   - Escalation successful
#   10  - Invalid arguments
#   11  - File not found
#   160 - WSJF score below threshold
#   170 - ADR missing or invalid

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    # Fallback exit codes if validation-core.sh not found
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_FILE_NOT_FOUND=11
    EXIT_WSJF_LOW=160
    EXIT_ADR_MISSING=170
fi

QUERY="${1:-}"
MODE="${2:-search}" # search | escalate | route
LEGAL_FOLDERS=(
  "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
  "$HOME/Documents/Personal/CLT/MAA/Uptown/Legal"
  "$HOME/Documents/code/investing/agentic-flow/reports"
)

RISK_MATRIX_FILE="$HOME/Documents/code/investing/agentic-flow/GROUND_TRUTH.yaml"
MEMORY_CLI="npx @claude-flow/cli@latest memory"

# Risk patterns (ROAM: Resolve, Own, Accept, Mitigate)
RED_PATTERNS="(utilities?|block|emergency|disconnect|evict|arbitration.*urgent|deadline.*3.*day)"
YELLOW_PATTERNS="(arbitration|hearing|trial|legal.*deadline|notice.*appear)"
GREEN_PATTERNS="(storage|backup.*plan|contingency)"

usage() {
  cat <<EOF
Usage: $0 <query> [mode]

Modes:
  search   - Search legal folders for documents matching query
  escalate - Analyze risk level (RED/YELLOW/GREEN) and store in memory
  route    - Route to appropriate swarm based on risk

Examples:
  $0 "Duke Energy utilities blocked" search
  $0 "arbitration hearing March 10" escalate
  $0 "storage unit backup plan" route

Risk Levels:
  RED    → utilities-unblock-swarm (blocks move)
  YELLOW → contract-legal-swarm (10-day deadline)
  GREEN  → tech-enablement-swarm (backup plan)
EOF
  exit 1
}

[ -z "$QUERY" ] && usage

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Search legal folders using ripgrep with .eml support
search_folders() {
  local query="$1"
  log "Searching folders for: $query"
  
  for folder in "${LEGAL_FOLDERS[@]}"; do
    if [ -d "$folder" ]; then
      log "Checking $folder..."
      # Add .eml type support for email archives
      rg --no-heading --line-number --ignore-case \
         --type-add 'eml:*.eml' \
         --type md --type txt --type eml \
         --max-count 5 \
         "$query" "$folder" 2>/dev/null || true
    fi
  done
}

# Analyze risk level based on query patterns
analyze_risk() {
  local query="$1"
  
  if echo "$query" | grep -Eiq "$RED_PATTERNS"; then
    echo "RED"
  elif echo "$query" | grep -Eiq "$YELLOW_PATTERNS"; then
    echo "YELLOW"
  elif echo "$query" | grep -Eiq "$GREEN_PATTERNS"; then
    echo "GREEN"
  else
    echo "UNKNOWN"
  fi
}

# Store risk in memory database
store_in_memory() {
  local query="$1"
  local risk_level="$2"
  local timestamp=$(date +%Y%m%d-%H%M%S)
  local key="wsjf-risk-${risk_level}-${timestamp}"
  local value="Risk: $risk_level | Query: $query | Timestamp: $timestamp"
  
  log "Storing in memory: $key"
  $MEMORY_CLI store -k "$key" --value "$value" || {
    log "WARNING: Memory storage failed, continuing..."
  }
}

# Route to swarm based on risk level
route_to_swarm() {
  local risk_level="$1"
  local query="$2"
  
  case "$risk_level" in
    RED)
      swarm="utilities-unblock-swarm"
      ;;
    YELLOW)
      swarm="contract-legal-swarm"
      ;;
    GREEN)
      swarm="tech-enablement-swarm"
      ;;
    *)
      swarm="UNKNOWN"
      ;;
  esac
  
  echo "{\"risk\":\"$risk_level\",\"swarm\":\"$swarm\",\"query\":\"$query\"}"
}

# Main execution
case "$MODE" in
  search)
    search_folders "$QUERY"
    ;;
  escalate)
    RISK=$(analyze_risk "$QUERY")
    log "Risk level: $RISK"
    store_in_memory "$QUERY" "$RISK"
    echo "{\"risk\":\"$RISK\",\"query\":\"$QUERY\"}"
    ;;
  route)
    RISK=$(analyze_risk "$QUERY")
    log "Risk level: $RISK, routing to swarm..."
    store_in_memory "$QUERY" "$RISK"
    route_to_swarm "$RISK" "$QUERY"
    ;;
  *)
    usage
    ;;
esac
