#!/bin/bash
# ============================================================================
# Exit Code Library - MCP/MPP Pattern Protocol Compliant
# ============================================================================
# Provides semantic exit codes for ay-yo ecosystem
# Usage: source "$SCRIPT_DIR/lib/exit-codes.sh"
# ============================================================================

# Success States
export SUCCESS=0
export PARTIAL_SUCCESS=1

# Configuration Errors (10-19)
export CONFIG_MISSING=10
export CONFIG_INVALID=11
export CREDENTIALS_MISSING=12
export PERMISSIONS_ERROR=13

# Network/Infrastructure Errors (20-29)
export NETWORK_UNREACHABLE=20
export PORT_CLOSED=21
export SSH_AUTH_FAILED=22
export SSH_TIMEOUT=23
export SERVICE_UNAVAILABLE=24

# Resource Errors (30-39)
export DISK_FULL=30
export MEMORY_EXHAUSTED=31
export CPU_OVERLOAD=32
export QUOTA_EXCEEDED=33

# Ceremony-Specific Errors (40-49)
export CEREMONY_TIMEOUT=40
export CEREMONY_DEPENDENCY_FAILED=41
export CEREMONY_CONFLICT=42
export CEREMONY_INCOMPLETE=43

# Validation Errors (50-59)
export VALIDATION_FAILED=50
export SCHEMA_ERROR=51
export DATA_CORRUPTION=52

# Credential Acquisition (60-69)
export NO_SOURCES=60
export AUTH_REQUIRED=61

# System Errors (100+)
export UNKNOWN_ERROR=100
export COMMAND_NOT_FOUND=127
export SIGINT=130
export SIGTERM=143

# Helper: Get exit code name (bash 3.x compatible)
get_exit_code_name() {
  local code=$1
  
  case $code in
    0) echo "SUCCESS" ;;
    1) echo "PARTIAL_SUCCESS" ;;
    10) echo "CONFIG_MISSING" ;;
    11) echo "CONFIG_INVALID" ;;
    12) echo "CREDENTIALS_MISSING" ;;
    13) echo "PERMISSIONS_ERROR" ;;
    20) echo "NETWORK_UNREACHABLE" ;;
    21) echo "PORT_CLOSED" ;;
    22) echo "SSH_AUTH_FAILED" ;;
    23) echo "SSH_TIMEOUT" ;;
    24) echo "SERVICE_UNAVAILABLE" ;;
    30) echo "DISK_FULL" ;;
    31) echo "MEMORY_EXHAUSTED" ;;
    32) echo "CPU_OVERLOAD" ;;
    33) echo "QUOTA_EXCEEDED" ;;
    40) echo "CEREMONY_TIMEOUT" ;;
    41) echo "CEREMONY_DEPENDENCY_FAILED" ;;
    42) echo "CEREMONY_CONFLICT" ;;
    43) echo "CEREMONY_INCOMPLETE" ;;
    50) echo "VALIDATION_FAILED" ;;
    51) echo "SCHEMA_ERROR" ;;
    52) echo "DATA_CORRUPTION" ;;
    60) echo "NO_SOURCES" ;;
    61) echo "AUTH_REQUIRED" ;;
    100) echo "UNKNOWN_ERROR" ;;
    127) echo "COMMAND_NOT_FOUND" ;;
    130) echo "SIGINT" ;;
    143) echo "SIGTERM" ;;
    *) echo "UNKNOWN_$code" ;;
  esac
}

# Helper: Exit with semantic code and message
exit_with_code() {
  local code=$1
  local message=$2
  local script_name="${3:-$(basename "$0")}"
  
  local code_name=$(get_exit_code_name $code)
  
  echo "$message" >&2
  
  # Optional: Log to AgentDB if available
  if [ -n "$AGENTDB_PATH" ] && [ -f "$AGENTDB_PATH" ]; then
    sqlite3 "$AGENTDB_PATH" "INSERT OR IGNORE INTO exit_code_metrics (script, exit_code, exit_name, message, occurred_at) VALUES ('$script_name', $code, '$code_name', '$message', strftime('%s', 'now'));" 2>/dev/null || true
  fi
  
  exit $code
}

# Helper: Is error code recoverable?
is_recoverable() {
  local code=$1
  
  case $code in
    $SUCCESS|$PARTIAL_SUCCESS)
      return 0  # Not an error
      ;;
    $CONFIG_MISSING|$CONFIG_INVALID|$CREDENTIALS_MISSING|$PERMISSIONS_ERROR)
      return 0  # Recoverable via seeker/replenish
      ;;
    $NETWORK_UNREACHABLE|$PORT_CLOSED|$SSH_TIMEOUT)
      return 0  # Recoverable via retry
      ;;
    $CEREMONY_TIMEOUT)
      return 0  # Recoverable via process kill + restart
      ;;
    *)
      return 1  # Not automatically recoverable
      ;;
  esac
}

# Helper: Exit with JSON context
exit_with_context() {
  local code=$1
  local message=$2
  local context_json=$3
  local script_name="${4:-$(basename "$0")}"
  
  local code_name=$(get_exit_code_name $code)
  local timestamp=$(date +%s)
  
  # Write JSON to stderr for parseable output
  cat >&2 <<EOF
{
  "exit_code": $code,
  "exit_name": "$code_name",
  "message": "$message",
  "context": $context_json,
  "script": "$script_name",
  "timestamp": $timestamp
}
EOF
  
  # Log to AgentDB if available
  if [ -n "$AGENTDB_PATH" ] && [ -f "$AGENTDB_PATH" ]; then
    sqlite3 "$AGENTDB_PATH" <<EOF_SQL 2>/dev/null || true
INSERT OR IGNORE INTO exit_code_metrics (
  script, exit_code, exit_name, message, context, occurred_at
) VALUES (
  '$script_name', $code, '$code_name', '$message', '$context_json', $timestamp
);
EOF_SQL
  fi
  
  exit $code
}
