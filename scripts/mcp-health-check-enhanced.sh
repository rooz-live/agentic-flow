#!/usr/bin/env bash
# mcp-health-check-enhanced.sh - NOW Tier: Evidence-first MCP health with observability
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMEOUT="${MCP_TIMEOUT:-3}"
EVIDENCE_LOG="${ROOT_DIR}/.goalie/mcp_health_evidence.jsonl"

# Ensure evidence log directory exists
mkdir -p "$(dirname "$EVIDENCE_LOG")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
  echo -e "${CYAN}[INFO]${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*" >&2
}

log_warn() {
  echo -e "${YELLOW}[⚠]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[✗]${NC} $*" >&2
}

# Log evidence to JSONL
log_evidence() {
  local provider="$1"
  local error_type="$2"
  local command="$3"
  local exit_code="$4"
  local stderr_output="$5"
  local duration_ms="${6:-0}"
  
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Escape JSON strings
  local escaped_stderr=$(echo "$stderr_output" | jq -Rs .)
  local escaped_command=$(echo "$command" | jq -Rs .)
  
  cat >> "$EVIDENCE_LOG" <<EOF
{"timestamp":"$timestamp","provider":"$provider","error_type":"$error_type","command":$escaped_command,"exit_code":$exit_code,"stderr":$escaped_stderr,"duration_ms":$duration_ms,"retry_count":0,"network_reachable":true}
EOF
}

# Classify error from exit code and stderr
classify_error() {
  local exit_code="$1"
  local stderr="$2"
  
  if [[ $exit_code -eq 124 ]] || [[ "$stderr" =~ timeout|"timed out" ]]; then
    echo "provider_timeout"
  elif [[ "$stderr" =~ ECONNREFUSED|"connection refused"|unreachable ]] || [[ $exit_code -eq 111 ]]; then
    echo "provider_unreachable"
  elif [[ "$stderr" =~ TLS|SSL|certificate|CERT_ ]]; then
    echo "provider_tls_error"
  elif [[ "$stderr" =~ "command not found"|"No such file"|ENOENT ]]; then
    echo "provider_misconfigured"
  elif [[ "$stderr" =~ "authentication failed"|unauthorized|"invalid token" ]] || [[ $exit_code -eq 401 ]]; then
    echo "provider_auth_failure"
  elif [[ "$stderr" =~ "rate limit"|"too many requests" ]] || [[ $exit_code -eq 429 ]]; then
    echo "provider_rate_limited"
  elif [[ "$stderr" =~ ENETUNREACH|EHOSTUNREACH|network ]]; then
    echo "network_error"
  elif [[ $exit_code -ne 0 ]]; then
    echo "internal_error"
  else
    echo "success"
  fi
}

# Check provider with evidence collection
check_provider() {
  local provider="$1"
  local command="$2"
  
  log_info "Checking $provider..."
  
  local start_ms=$(date +%s%3N)
  local stderr_file=$(mktemp)
  local exit_code=0
  
  # Execute with timeout and capture stderr
  if timeout "$TIMEOUT" $command &> "$stderr_file"; then
    exit_code=0
  else
    exit_code=$?
  fi
  
  local end_ms=$(date +%s%3N)
  local duration_ms=$((end_ms - start_ms))
  local stderr_output=$(cat "$stderr_file")
  rm -f "$stderr_file"
  
  # Classify error
  local error_type=$(classify_error "$exit_code" "$stderr_output")
  
  # Log evidence
  log_evidence "$provider" "$error_type" "$command" "$exit_code" "$stderr_output" "$duration_ms"
  
  if [[ "$error_type" == "success" ]]; then
    log_success "$provider available (${duration_ms}ms)"
    return 0
  else
    case "$error_type" in
      provider_timeout)
        log_warn "$provider timed out after ${TIMEOUT}s - using offline fallback"
        ;;
      provider_unreachable)
        log_error "$provider unreachable - circuit breaker triggered"
        ;;
      provider_tls_error)
        log_error "$provider TLS error - check certificates"
        ;;
      provider_misconfigured)
        log_error "$provider misconfigured - check installation"
        ;;
      *)
        log_warn "$provider unavailable ($error_type) - degrading gracefully"
        ;;
    esac
    return 1
  fi
}

# Main health check
main() {
  local agentdb_ok=0
  local claude_flow_ok=0
  local context7_ok=0
  
  log_info "Starting MCP health check (timeout: ${TIMEOUT}s)"
  echo ""
  
  # Check AgentDB
  if check_provider "agentdb" "npx agentdb --version"; then
    agentdb_ok=1
    export AGENTDB_AVAILABLE=1
  else
    export AGENTDB_AVAILABLE=0
  fi
  
  # Check Claude Flow
  if check_provider "claude-flow" "npx claude-flow --version"; then
    claude_flow_ok=1
    export CLAUDE_FLOW_AVAILABLE=1
  else
    export CLAUDE_FLOW_AVAILABLE=0
  fi
  
  # Check Context7 (optional)
  if check_provider "context7" "npx context7 --version"; then
    context7_ok=1
    export CONTEXT7_AVAILABLE=1
  else
    export CONTEXT7_AVAILABLE=0
  fi
  
  echo ""
  
  # Summary
  local total_available=$((agentdb_ok + claude_flow_ok + context7_ok))
  local total_providers=3
  
  if [[ $total_available -eq $total_providers ]]; then
    log_success "All MCP providers available ($total_available/$total_providers)"
    export MCP_OFFLINE_MODE=0
    return 0
  elif [[ $total_available -gt 0 ]]; then
    log_warn "Partial MCP availability ($total_available/$total_providers) - safe degradation enabled"
    export MCP_OFFLINE_MODE=0
    return 0
  else
    log_error "No MCP providers available - entering offline mode"
    export MCP_OFFLINE_MODE=1
    return 1
  fi
}

main "$@"
