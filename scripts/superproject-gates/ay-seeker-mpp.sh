#!/bin/bash

# ============================================================================
# MCP/MPP Protocol Handler for Seeker/Replenish
# ============================================================================
# Implements Method Pattern Protocol (MPP) v1.0 for credential acquisition
# Provides: Exit code standardization, config loading, observability
# ============================================================================

set -e

PROTOCOL_VERSION="mpp/1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration paths
SEEKER_CONFIG="${AY_SEEKER_CONFIG:-$PROJECT_ROOT/.ay/seeker-config.yaml}"
PROD_CONFIG="${AY_PROD_CONFIG:-$PROJECT_ROOT/config/prod-cycle.json}"

# ============================================================================
# STANDARDIZED EXIT CODES (0-10 range)
# ============================================================================
readonly EXIT_COMPLETE_SUCCESS=0      # All operations successful
readonly EXIT_NO_ACTION_NEEDED=1      # Nothing to do (also success)
readonly EXIT_PARTIAL_SUCCESS=2       # Some succeeded, some failed
readonly EXIT_PARTIAL_FAILURE=3       # Critical components failed
readonly EXIT_CONFIGURATION_ERROR=4   # Invalid configuration
readonly EXIT_DEPENDENCY_MISSING=5    # Required tool not found
readonly EXIT_PERMISSION_DENIED=6     # Access denied
readonly EXIT_TIMEOUT=7               # Operation timed out
readonly EXIT_RESOURCE_UNAVAILABLE=8  # Required resource unreachable
readonly EXIT_INVALID_INPUT=9         # Bad input parameters
readonly EXIT_UNKNOWN_ERROR=10        # Unexpected failure

# ============================================================================
# MPP PROTOCOL FUNCTIONS
# ============================================================================

mpp_init() {
  local protocol_requested="${1:-mpp/1.0}"
  
  # Protocol version negotiation
  if [ "$protocol_requested" != "$PROTOCOL_VERSION" ]; then
    echo "ERROR: Protocol mismatch - requested: $protocol_requested, supported: $PROTOCOL_VERSION" >&2
    mpp_finalize $EXIT_CONFIGURATION_ERROR "protocol_mismatch" "" "Protocol version incompatible"
  fi
  
  # Validate configurations exist
  if [ ! -f "$SEEKER_CONFIG" ]; then
    echo "WARNING: Seeker config not found: $SEEKER_CONFIG - using defaults" >&2
  fi
  
  if [ ! -f "$PROD_CONFIG" ]; then
    echo "ERROR: Production config not found: $PROD_CONFIG" >&2
    mpp_finalize $EXIT_CONFIGURATION_ERROR "config_missing" "" "Required config file not found"
  fi
  
  # Check required dependencies
  local missing_deps=()
  for cmd in jq sqlite3; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      missing_deps+=("$cmd")
    fi
  done
  
  # yq is optional (fall back to jq for JSON-only configs)
  if ! command -v yq >/dev/null 2>&1; then
    echo "INFO: yq not found - YAML config support disabled" >&2
  fi
  
  if [ ${#missing_deps[@]} -gt 0 ]; then
    echo "ERROR: Missing required dependencies: ${missing_deps[*]}" >&2
    mpp_finalize $EXIT_DEPENDENCY_MISSING "missing_deps" "" "Required tools not installed: ${missing_deps[*]}"
  fi
  
  return 0
}

mpp_load_config() {
  local config_key="$1"
  local config_file="${2:-$PROD_CONFIG}"
  
  # Try JSON first (prod-cycle.json)
  if [ -f "$config_file" ] && [[ "$config_file" == *.json ]]; then
    jq -r "$config_key // empty" "$config_file" 2>/dev/null || echo ""
    return
  fi
  
  # Try YAML if yq available (seeker-config.yaml)
  if [ -f "$config_file" ] && [[ "$config_file" == *.yaml ]] && command -v yq >/dev/null 2>&1; then
    yq eval "$config_key // empty" "$config_file" 2>/dev/null || echo ""
    return
  fi
  
  echo ""
}

mpp_get_timeout() {
  local timeout_key="$1"
  local default_value="${2:-5000}"
  
  # Try to load from config
  local timeout=$(mpp_load_config ".budgets.timeouts.$timeout_key")
  
  if [ -n "$timeout" ] && [ "$timeout" != "null" ]; then
    echo "$timeout"
  else
    echo "$default_value"
  fi
}

mpp_get_exit_code_description() {
  local exit_code="$1"
  mpp_load_config ".exitCodes.standard.\"$exit_code\"" || echo "Unknown exit code"
}

mpp_export_metrics() {
  local total="$1"
  local acquired="$2"
  local failed="$3"
  local duration_ms="$4"
  local exit_code="${5:-0}"
  
  # Ensure metrics directory exists
  mkdir -p "$PROJECT_ROOT/.db"
  
  # Export to JSON (always enabled)
  local metrics_file="$PROJECT_ROOT/.db/seeker-last-run.json"
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg protocol "$PROTOCOL_VERSION" \
    --argjson total "$total" \
    --argjson acquired "$acquired" \
    --argjson failed "$failed" \
    --argjson duration "$duration_ms" \
    --argjson exit_code "$exit_code" \
    '{
      timestamp: $timestamp,
      protocol: $protocol,
      operation: "credential_acquisition",
      metrics: {
        placeholders_found: $total,
        credentials_acquired: $acquired,
        credentials_failed: $failed,
        duration_ms: $duration,
        success_rate: (if $total > 0 then ($acquired / $total * 100) else 100 end),
        exit_code: $exit_code
      }
    }' > "$metrics_file" 2>/dev/null || true
  
  # Export to Prometheus format (if enabled in config)
  local prom_enabled=$(mpp_load_config ".observability.exports[] | select(.type == \"prometheus\") | .enabled" "$SEEKER_CONFIG")
  
  if [ "$prom_enabled" = "true" ]; then
    local prom_file="$PROJECT_ROOT/.db/seeker-metrics.prom"
    cat > "$prom_file" <<EOF
# HELP seeker_placeholders_found_total Total placeholders found in scan
# TYPE seeker_placeholders_found_total counter
seeker_placeholders_found_total $total

# HELP seeker_credentials_acquired_total Total credentials successfully acquired
# TYPE seeker_credentials_acquired_total counter
seeker_credentials_acquired_total $acquired

# HELP seeker_credentials_failed_total Total credentials that failed acquisition
# TYPE seeker_credentials_failed_total counter
seeker_credentials_failed_total $failed

# HELP seeker_duration_ms Duration of last seeker operation in milliseconds
# TYPE seeker_duration_ms gauge
seeker_duration_ms $duration_ms

# HELP seeker_last_exit_code Exit code of last seeker operation
# TYPE seeker_last_exit_code gauge
seeker_last_exit_code $exit_code
EOF
  fi
}

mpp_log_exit() {
  local exit_code="$1"
  local reason="${2:-unknown}"
  local operation="${3:-seeker}"
  local details="${4:-}"
  
  local log_enabled=$(mpp_load_config ".exitCodes.logExitCodes")
  
  if [ "$log_enabled" = "true" ] || [ "$log_enabled" = "1" ]; then
    local log_file=$(mpp_load_config ".exitCodes.exitLogPath" || echo ".db/script-exits.jsonl")
    local log_path="$PROJECT_ROOT/$log_file"
    
    # Ensure directory exists
    mkdir -p "$(dirname "$log_path")"
    
    # Append structured log entry
    jq -n \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg operation "$operation" \
      --argjson exit_code "$exit_code" \
      --arg reason "$reason" \
      --arg details "$details" \
      --arg exit_desc "$(mpp_get_exit_code_description "$exit_code")" \
      '{
        timestamp: $timestamp,
        operation: $operation,
        exit_code: $exit_code,
        exit_description: $exit_desc,
        reason: $reason,
        details: $details
      }' >> "$log_path" 2>/dev/null || true
  fi
}

mpp_finalize() {
  local exit_code="$1"
  local reason="${2:-completed}"
  local metrics="${3:-}"
  local details="${4:-}"
  
  # Log exit
  mpp_log_exit "$exit_code" "$reason" "seeker" "$details"
  
  # Export metrics if provided
  if [ -n "$metrics" ]; then
    # Parse metrics JSON and export
    local total=$(echo "$metrics" | jq -r '.total // 0')
    local acquired=$(echo "$metrics" | jq -r '.acquired // 0')
    local failed=$(echo "$metrics" | jq -r '.failed // 0')
    local duration=$(echo "$metrics" | jq -r '.duration_ms // 0')
    
    mpp_export_metrics "$total" "$acquired" "$failed" "$duration" "$exit_code"
  fi
  
  exit "$exit_code"
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

mpp_get_scan_paths() {
  # Load static paths from config
  if [ -f "$SEEKER_CONFIG" ] && command -v yq >/dev/null 2>&1; then
    yq eval '.scan.static_paths[] | select(.enabled == true) | .path' "$SEEKER_CONFIG" 2>/dev/null | envsubst
  else
    # Fallback to hardcoded paths
    echo "$HOME/Documents/code/agentic-flow-core"
    echo "$HOME/Documents/code/investing/agentic-flow"
  fi
}

mpp_get_exclusion_patterns() {
  if [ -f "$SEEKER_CONFIG" ] && command -v yq >/dev/null 2>&1; then
    yq eval '.scan.exclude[]' "$SEEKER_CONFIG" 2>/dev/null | tr '\n' '|' | sed 's/|$//'
  else
    echo "**/node_modules/**|**/.git/**|**/dist/**|**/build/**|**/*.bak"
  fi
}

mpp_get_max_files() {
  local limit=$(mpp_load_config ".resourceLimits.maxFilesPerScan")
  if [ -n "$limit" ] && [ "$limit" != "null" ]; then
    echo "$limit"
  else
    echo "50"
  fi
}

mpp_get_max_depth() {
  local depth=$(mpp_load_config ".resourceLimits.maxScanDepth")
  if [ -n "$depth" ] && [ "$depth" != "null" ]; then
    echo "$depth"
  else
    echo "5"
  fi
}

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================
export -f mpp_init
export -f mpp_load_config
export -f mpp_get_timeout
export -f mpp_get_exit_code_description
export -f mpp_export_metrics
export -f mpp_log_exit
export -f mpp_finalize
export -f mpp_get_scan_paths
export -f mpp_get_exclusion_patterns
export -f mpp_get_max_files
export -f mpp_get_max_depth

# Export exit code constants
export EXIT_COMPLETE_SUCCESS
export EXIT_NO_ACTION_NEEDED
export EXIT_PARTIAL_SUCCESS
export EXIT_PARTIAL_FAILURE
export EXIT_CONFIGURATION_ERROR
export EXIT_DEPENDENCY_MISSING
export EXIT_PERMISSION_DENIED
export EXIT_TIMEOUT
export EXIT_RESOURCE_UNAVAILABLE
export EXIT_INVALID_INPUT
export EXIT_UNKNOWN_ERROR
