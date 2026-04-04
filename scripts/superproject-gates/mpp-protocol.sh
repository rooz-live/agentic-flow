#!/bin/bash
# ============================================================================
# MPP Protocol Handler
# ============================================================================
# Loads and applies MPP (Method Pattern Protocol) configuration
# Usage: source "$SCRIPT_DIR/lib/mpp-protocol.sh"
# ============================================================================

# Resolve config path relative to this library file
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
MPP_CONFIG_PATH="${MPP_CONFIG_PATH:-$LIB_DIR/../../config/mpp-protocol.yaml}"
MPP_CACHE_FILE="/tmp/mpp-protocol-cache-$$.env"

# ============================================================================
# YAML Parser (bash-compatible subset)
# ============================================================================
parse_mpp_config() {
  local config_file="$1"
  
  if [ ! -f "$config_file" ]; then
    echo "⚠️  MPP config not found: $config_file" >&2
    return 1
  fi
  
  # Extract ceremony timeouts
  export MPP_TIMEOUT_ASSESSOR_REVIEW=$(grep "assessor_review:" "$config_file" | awk '{print $2}')
  export MPP_TIMEOUT_ASSESSOR_WSJF=$(grep "assessor_wsjf:" "$config_file" | awk '{print $2}')
  export MPP_TIMEOUT_ORCHESTRATOR_STANDUP=$(grep "orchestrator_standup:" "$config_file" | awk '{print $2}')
  export MPP_TIMEOUT_SEEKER_REPLENISH=$(grep "seeker_replenish:" "$config_file" | awk '{print $2}')
  export MPP_TIMEOUT_ANALYST_REFINE=$(grep "analyst_refine:" "$config_file" | awk '{print $2}')
  export MPP_TIMEOUT_INNOVATOR_RETRO=$(grep "innovator_retro:" "$config_file" | awk '{print $2}')
  
  # Extract network timeouts
  export MPP_TIMEOUT_SSH_CONNECT=$(grep -A5 "network:" "$config_file" | grep "ssh_connect:" | awk '{print $2}')
  export MPP_TIMEOUT_SSH_COMMAND=$(grep -A5 "network:" "$config_file" | grep "ssh_command:" | awk '{print $2}')
  
  # Extract retry config
  export MPP_RETRY_MAX_ATTEMPTS=$(grep "max_attempts:" "$config_file" | head -1 | awk '{print $2}')
  export MPP_RETRY_BACKOFF=$(grep "backoff_strategy:" "$config_file" | awk '{print $2}' | tr -d '"')
  export MPP_RETRY_INITIAL_DELAY=$(grep "initial_delay_seconds:" "$config_file" | awk '{print $2}')
  
  # Extract feature flags
  export MPP_FEATURE_TIMEOUT_PROTECTION=$(grep "ceremony_timeout_protection:" "$config_file" | awk '{print $2}')
  export MPP_FEATURE_SCOPE_EXPANSION=$(grep "dynamic_scope_expansion:" "$config_file" | awk '{print $2}')
  export MPP_FEATURE_SOURCE_PLUGINS=$(grep "credential_source_plugins:" "$config_file" | awk '{print $2}')
  
  # Cache to file for faster subsequent loads
  cat > "$MPP_CACHE_FILE" <<EOF
export MPP_TIMEOUT_ASSESSOR_REVIEW=$MPP_TIMEOUT_ASSESSOR_REVIEW
export MPP_TIMEOUT_SEEKER_REPLENISH=$MPP_TIMEOUT_SEEKER_REPLENISH
export MPP_TIMEOUT_SSH_CONNECT=$MPP_TIMEOUT_SSH_CONNECT
export MPP_RETRY_MAX_ATTEMPTS=$MPP_RETRY_MAX_ATTEMPTS
export MPP_FEATURE_TIMEOUT_PROTECTION=$MPP_FEATURE_TIMEOUT_PROTECTION
EOF
  
  return 0
}

# Load MPP config on first source  
if [ -z "${MPP_LOADED:-}" ]; then
  # Use cached config if available
  if [ -f "$MPP_CACHE_FILE" ] && [ -r "$MPP_CACHE_FILE" ]; then
    source "$MPP_CACHE_FILE" 2>/dev/null || true
  fi
  
  # Set defaults if not loaded from cache
  export MPP_TIMEOUT_SEEKER_REPLENISH=${MPP_TIMEOUT_SEEKER_REPLENISH:-15}
  export MPP_TIMEOUT_ASSESSOR_REVIEW=${MPP_TIMEOUT_ASSESSOR_REVIEW:-30}
  export MPP_TIMEOUT_ORCHESTRATOR_STANDUP=${MPP_TIMEOUT_ORCHESTRATOR_STANDUP:-30}
  export MPP_TIMEOUT_SSH_CONNECT=${MPP_TIMEOUT_SSH_CONNECT:-5}
  export MPP_RETRY_MAX_ATTEMPTS=${MPP_RETRY_MAX_ATTEMPTS:-3}
  export MPP_RETRY_BACKOFF=${MPP_RETRY_BACKOFF:-exponential}
  export MPP_RETRY_INITIAL_DELAY=${MPP_RETRY_INITIAL_DELAY:-2}
  export MPP_FEATURE_TIMEOUT_PROTECTION=${MPP_FEATURE_TIMEOUT_PROTECTION:-true}
  export MPP_FEATURE_SCOPE_EXPANSION=${MPP_FEATURE_SCOPE_EXPANSION:-true}
  export MPP_FEATURE_SOURCE_PLUGINS=${MPP_FEATURE_SOURCE_PLUGINS:-true}
  
  export MPP_LOADED=1
fi

# ============================================================================
# Timeout Management
# ============================================================================

# Get timeout for ceremony (with environment override)
get_ceremony_timeout() {
  local ceremony=$1
  local default_timeout=${2:-30}
  
  # Convert ceremony name to env var format (e.g. "assessor/review" -> "ASSESSOR_REVIEW")
  local ceremony_upper=$(echo "$ceremony" | tr '/' '_' | tr '[:lower:]' '[:upper:]')
  
  # Check environment override first (set -u compatible)
  local env_var="AY_TIMEOUT_${ceremony_upper}"
  local env_val; env_val=$(printenv "$env_var" 2>/dev/null || true)
  if [ -n "$env_val" ]; then
    echo "$env_val"
    return
  fi
  
  # Check MPP config (set -u compatible)
  local mpp_var="MPP_TIMEOUT_${ceremony_upper}"
  local mpp_val; mpp_val=$(printenv "$mpp_var" 2>/dev/null || true)
  if [ -n "$mpp_val" ]; then
    echo "$mpp_val"
    return
  fi
  
  # Fallback to default
  echo "$default_timeout"
}

# Run ceremony with timeout protection
run_ceremony_with_timeout() {
  local ceremony=$1
  local script_path=$2
  shift 2
  # IMPORTANT: Keep as array to preserve quoting
  
  local timeout_seconds=$(get_ceremony_timeout "$ceremony" 30)
  
  if [ "$MPP_FEATURE_TIMEOUT_PROTECTION" = "true" ]; then
    echo "🔒 Timeout protection enabled ($timeout_seconds seconds)" >&2
    timeout "$timeout_seconds" "$script_path" "$@"
    local exit_code=$?
    
    if [ $exit_code -eq 124 ] || [ $exit_code -eq 143 ]; then
      echo "⏱️  Ceremony timeout: $ceremony (${timeout_seconds}s)" >&2
      return $CEREMONY_TIMEOUT  # 40
    fi
    
    return $exit_code
  else
    "$script_path" "$@"
    return $?
  fi
}

# ============================================================================
# Retry Logic
# ============================================================================

# Check if exit code is recoverable
is_exit_code_recoverable() {
  local code=$1
  
  # Recoverable codes: CONFIG_INVALID, CREDENTIALS_MISSING, NETWORK_UNREACHABLE, 
  #                    PORT_CLOSED, SSH_TIMEOUT, CEREMONY_TIMEOUT
  case $code in
    11|12|20|21|23|40)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Calculate backoff delay
calculate_backoff() {
  local attempt=$1
  local strategy=${2:-exponential}
  local initial_delay=${3:-2}
  local max_delay=${4:-30}
  
  local delay
  case $strategy in
    exponential)
      delay=$((initial_delay * (2 ** (attempt - 1))))
      ;;
    linear)
      delay=$((initial_delay * attempt))
      ;;
    constant)
      delay=$initial_delay
      ;;
    *)
      delay=$initial_delay
      ;;
  esac
  
  # Cap at max_delay
  if [ $delay -gt $max_delay ]; then
    delay=$max_delay
  fi
  
  echo $delay
}

# Run with retry logic
run_with_retry() {
  local ceremony=$1
  shift
  local command="$@"
  
  local max_attempts=${MPP_RETRY_MAX_ATTEMPTS:-3}
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "🔄 Attempt $attempt/$max_attempts: $ceremony" >&2
    
    eval "$command"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
      echo "✅ Success on attempt $attempt" >&2
      return 0
    fi
    
    if ! is_exit_code_recoverable $exit_code; then
      echo "❌ Non-recoverable error (exit $exit_code)" >&2
      return $exit_code
    fi
    
    if [ $attempt -lt $max_attempts ]; then
      local delay=$(calculate_backoff $attempt "$MPP_RETRY_BACKOFF" "$MPP_RETRY_INITIAL_DELAY")
      echo "⏳ Recoverable error - retrying in ${delay}s..." >&2
      sleep $delay
    fi
    
    ((attempt++))
  done
  
  echo "❌ Max retries exceeded" >&2
  return $exit_code
}

# ============================================================================
# Scope Expansion for Seeker/Replenish
# ============================================================================

# Get seeker scopes based on MPP config
get_seeker_scopes() {
  local scope_type=${1:-base}  # base, expanded, siblings, custom
  
  case $scope_type in
    base)
      # Always scan these
      echo "$HOME/Documents/code/agentic-flow-core"
      echo "$HOME/Documents/code/investing/agentic-flow"
      ;;
    expanded)
      # Opt-in via AY_SEEKER_SCOPE_EXPANSION=1
      if [ "${AY_SEEKER_SCOPE_EXPANSION:-0}" = "1" ] || [ "$MPP_FEATURE_SCOPE_EXPANSION" = "true" ]; then
        echo "$HOME/Documents/code"
        echo "$HOME/.config"
      fi
      ;;
    siblings)
      # Discover via git remotes
      if [ "${AY_SEEKER_SIBLINGS:-0}" = "1" ]; then
        discover_sibling_projects
      fi
      ;;
    custom)
      # From environment variable
      if [ -n "$AY_SEEKER_CUSTOM_SCOPES" ]; then
        echo "$AY_SEEKER_CUSTOM_SCOPES" | jq -r '.[] | .path' 2>/dev/null || true
      fi
      ;;
    all)
      # All scopes combined
      get_seeker_scopes base
      get_seeker_scopes expanded
      get_seeker_scopes siblings
      get_seeker_scopes custom
      ;;
  esac
}

# Discover sibling projects via git remotes
discover_sibling_projects() {
  local current_dir="$PWD"
  
  if [ -d ".git" ]; then
    # Get parent directory from git remote
    local remote_url=$(git remote get-url origin 2>/dev/null || echo "")
    
    if [ -n "$remote_url" ]; then
      # Extract parent path (works for both file:// and https://)
      local parent_path=$(dirname "$(echo "$remote_url" | sed 's|.*://||; s|.*@||; s|:| |' | awk '{print $NF}')")
      
      # List sibling directories
      find "$parent_path" -maxdepth 1 -type d ! -path "$current_dir" 2>/dev/null | head -5
    fi
  fi
}

# ============================================================================
# Credential Source Plugins
# ============================================================================

# Get enabled credential sources in priority order
get_credential_sources() {
  local sources=""
  
  # Always check cache first (priority 1)
  if [ "$MPP_FEATURE_SOURCE_PLUGINS" = "true" ]; then
    sources="cache"
  fi
  
  # Bitwarden (priority 2)
  if command -v bw >/dev/null 2>&1; then
    sources="$sources bitwarden"
  fi
  
  # AWS SSM (priority 3)
  if command -v aws >/dev/null 2>&1 && [ -n "$AWS_REGION" ]; then
    sources="$sources aws_ssm"
  fi
  
  # Vault (priority 4)
  if command -v vault >/dev/null 2>&1 && [ -n "$VAULT_ADDR" ]; then
    sources="$sources vault"
  fi
  
  # 1Password (priority 5)
  if command -v op >/dev/null 2>&1; then
    sources="$sources onepassword"
  fi
  
  # Manual fallback (priority 99)
  sources="$sources manual"
  
  echo "$sources"
}

# Search credential in specific source
search_credential_in_source() {
  local key_name=$1
  local source=$2
  local timeout=${3:-10}
  
  case $source in
    cache)
      # Check local encrypted cache
      local cache_file="./.cache/credentials.enc"
      if [ -f "$cache_file" ]; then
        grep "^$key_name=" "$cache_file" 2>/dev/null | cut -d'=' -f2-
      fi
      ;;
    bitwarden)
      # Search Bitwarden
      timeout $timeout bw get item "agentic-flow/$key_name" --session "$BW_SESSION" 2>/dev/null | jq -r '.login.password' 2>/dev/null || true
      ;;
    aws_ssm)
      # Query AWS SSM Parameter Store
      timeout $timeout aws ssm get-parameter --name "/agentic-flow/${key_name,,}" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || true
      ;;
    vault)
      # Query HashiCorp Vault
      timeout $timeout vault kv get -field=value "secret/agentic-flow/${key_name,,}" 2>/dev/null || true
      ;;
    onepassword)
      # Query 1Password
      timeout $timeout op item get "$key_name" --fields password 2>/dev/null || true
      ;;
    manual)
      # Fallback to interactive
      echo "INTERACTIVE_REQUIRED"
      ;;
  esac
}

# ============================================================================
# Observability Integration
# ============================================================================

# Log exit code to observability database
log_exit_code() {
  local script_name=$1
  local exit_code=$2
  local exit_name=$3
  local message=${4:-""}
  local context_json=${5:-"{}"}
  
  if [ -z "$AGENTDB_PATH" ] || [ ! -f "$AGENTDB_PATH" ]; then
    return
  fi
  
  sqlite3 "$AGENTDB_PATH" <<EOF 2>/dev/null || true
INSERT OR IGNORE INTO exit_code_metrics (
  script, exit_code, exit_name, message, context, occurred_at
) VALUES (
  '$script_name', $exit_code, '$exit_name', '$message', '$context_json', strftime('%s', 'now')
);
EOF
}

# Log ceremony metrics
log_ceremony_metrics() {
  local ceremony_name=$1
  local started_at=$2
  local completed_at=$3
  local exit_code=$4
  local timeout_triggered=${5:-false}
  
  if [ -z "$AGENTDB_PATH" ] || [ ! -f "$AGENTDB_PATH" ]; then
    return
  fi
  
  local duration=$((completed_at - started_at))
  
  sqlite3 "$AGENTDB_PATH" <<EOF 2>/dev/null || true
INSERT INTO ceremony_metrics (
  ceremony_name, started_at, completed_at, duration_seconds, exit_code, timeout_triggered
) VALUES (
  '$ceremony_name', $started_at, $completed_at, $duration, $exit_code, $timeout_triggered
);
EOF
}

# ============================================================================
# Cleanup
# ============================================================================
cleanup_mpp_cache() {
  rm -f "$MPP_CACHE_FILE" 2>/dev/null || true
}

trap cleanup_mpp_cache EXIT
