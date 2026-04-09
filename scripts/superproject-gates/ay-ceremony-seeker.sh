#!/bin/bash

# ============================================================================
# Credential Seeker / Replenish Ceremony (MCP/MPP v1.0)
# ============================================================================
# Scans .env files for {{placeholders}} and attempts automated acquisition
# Sources: env, cache, SSM, 1Password, Vault (configurable)
# Protocol: Method Pattern Protocol (MPP) v1.0
# Exit Codes: Standardized 0-10 semantic range (see config/prod-cycle.json)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-$HOME/Documents/code/investing/agentic-flow/agentdb.db}"

# ============================================================================
# LOAD MPP PROTOCOL HANDLER
# ============================================================================
source "$SCRIPT_DIR/ay-seeker-mpp.sh" || {
  echo "ERROR: MPP protocol handler not found: $SCRIPT_DIR/ay-seeker-mpp.sh" >&2
  exit 4  # CONFIGURATION_ERROR
}

# Initialize protocol
mpp_init "mpp/1.0"

# Start time in milliseconds (macOS compatible)
START_TIME=$(($(date +%s) * 1000))

# Check if seeker is enabled
if [ "${AY_SEEKER_ENABLED:-1}" != "1" ]; then
  echo "ℹ️  Credential seeker disabled (AY_SEEKER_ENABLED=0)"
  mpp_finalize $EXIT_NO_ACTION_NEEDED "seeker_disabled" "" "Seeker disabled via AY_SEEKER_ENABLED"
fi

# ============================================================================
# BUILD SCAN SCOPE (CONFIG-DRIVEN)
# ============================================================================
build_scan_scope() {
  local expansion_level="${1:-0}"
  local max_files=$(mpp_get_max_files)
  local max_depth=$(mpp_get_max_depth)
  local exclusions=$(mpp_get_exclusion_patterns)
  
  # Get scan paths from config
  local scan_paths=$(mpp_get_scan_paths)
  
  # Build find command with exclusions
  local find_opts=()
  IFS='|' read -ra EXCLUDE_PATTERNS <<< "$exclusions"
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    find_opts+=(-path "$pattern" -prune -o)
  done
  
  # Add expansion (increase depth if needed)
  local effective_depth=$((max_depth + expansion_level))
  
  # Execute find with combined paths
  local all_files=""
  while IFS= read -r path; do
    path=$(eval echo "$path")  # Expand environment variables
    if [ -d "$path" ]; then
      local files=$(find "$path" "${find_opts[@]}" -maxdepth "$effective_depth" -name ".env" -o -name ".env.*" 2>/dev/null | head -n "$max_files")
      all_files="$all_files$files\n"
    fi
  done <<< "$scan_paths"
  
  echo -e "$all_files" | grep -v '^$'
}

# Find all .env files using config-driven scope
ENV_FILES=$(build_scan_scope 0)

if [ -z "$ENV_FILES" ]; then
  echo "ℹ️  No .env files found to scan"
  END_TIME=$(($(date +%s) * 1000))
  DURATION=$((END_TIME - START_TIME))
  METRICS='{"total": 0, "acquired": 0, "failed": 0, "duration_ms": '"$DURATION"'}'
  mpp_finalize $EXIT_NO_ACTION_NEEDED "no_files_found" "$METRICS" "No .env files found in scan scope"
fi

echo "🔍 Credential Seeker Ceremony"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Scan for placeholders
PLACEHOLDERS_FOUND=0
CREDENTIALS_ACQUIRED=0
CREDENTIALS_FAILED=0

# Create temporary list of placeholders
PLACEHOLDER_FILE="/tmp/ay-seeker-placeholders-$$.txt"
trap "rm -f $PLACEHOLDER_FILE" EXIT

# Scan all .env files
while IFS= read -r env_file; do
  if [ ! -f "$env_file" ]; then
    continue
  fi
  
  # Find lines with {{placeholder}} pattern
  grep -E '\{\{[A-Z_]+\}\}' "$env_file" 2>/dev/null | while IFS= read -r line; do
    # Extract variable name and placeholder
    if [[ $line =~ ^([A-Z_]+)=\{\{([A-Z_]+)\}\} ]]; then
      VAR_NAME="${BASH_REMATCH[1]}"
      PLACEHOLDER="${BASH_REMATCH[2]}"
      
      echo "$env_file|$VAR_NAME|$PLACEHOLDER" >> "$PLACEHOLDER_FILE"
      ((PLACEHOLDERS_FOUND++)) || true
    fi
  done
done <<< "$ENV_FILES"

if [ "$PLACEHOLDERS_FOUND" -eq 0 ]; then
  echo "✅ No credential placeholders found - all credentials acquired!"
  END_TIME=$(($(date +%s) * 1000))
  DURATION=$((END_TIME - START_TIME))
  METRICS='{"total": 0, "acquired": 0, "failed": 0, "duration_ms": '"$DURATION"'}'
  mpp_finalize $EXIT_NO_ACTION_NEEDED "no_placeholders" "$METRICS" "No credential placeholders found"
fi

echo "📋 Found $PLACEHOLDERS_FOUND credential placeholder(s)"
echo ""

# Process each placeholder
if [ -f "$PLACEHOLDER_FILE" ]; then
  while IFS='|' read -r env_file var_name placeholder; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔑 $var_name (placeholder: {{$placeholder}})"
    echo "   File: $env_file"
    
    # Check if already in credential_requests table
    EXISTING=$(sqlite3 "$AGENTDB_PATH" "SELECT status FROM credential_requests WHERE credential_key='$var_name' ORDER BY requested_at DESC LIMIT 1;" 2>/dev/null || echo "")
    
    if [ "$EXISTING" = "acquired" ]; then
      echo "   ✅ Already acquired (status: acquired)"
      ((CREDENTIALS_ACQUIRED++)) || true
      continue
    fi
    
    # Determine credential type
    CRED_TYPE="unknown"
    case "$var_name" in
      *_API_KEY|*_KEY)
        CRED_TYPE="api_key"
        ;;
      *_TOKEN)
        CRED_TYPE="token"
        ;;
      *_PASSWORD|*_PASS)
        CRED_TYPE="password"
        ;;
      *_IP|*_HOST)
        CRED_TYPE="ip_address"
        ;;
      *_CERT|*_CERTIFICATE)
        CRED_TYPE="certificate"
        ;;
      *_SSH_KEY)
        CRED_TYPE="ssh_key"
        ;;
    esac
    
    # Create credential request entry
    sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO credential_requests (
  credential_key,
  credential_type,
  required_by,
  placeholder_value,
  status,
  requested_at
) VALUES (
  '$var_name',
  '$CRED_TYPE',
  'ay-ceremony-seeker',
  '{{$placeholder}}',
  'pending',
  strftime('%s', 'now')
)
ON CONFLICT(credential_key) DO UPDATE SET
  status = 'pending',
  requested_at = strftime('%s', 'now');
EOF
    
    # Attempt acquisition from multiple sources
    ACQUIRED_VALUE=""
    SOURCE=""
    
    # Source 1: Check environment variable
    if [ -n "${!var_name}" ] && [ "${!var_name}" != "{{$placeholder}}" ]; then
      ACQUIRED_VALUE="${!var_name}"
      SOURCE="env"
      echo "   ✅ Found in environment variable"
    fi
    
    # Source 2: AWS SSM Parameter Store
    if [ -z "$ACQUIRED_VALUE" ] && command -v aws >/dev/null 2>&1; then
      echo "   🔍 Checking AWS SSM Parameter Store..."
      SSM_PATH="/agentic-flow/${var_name,,}"  # lowercase
      
      if SSM_VALUE=$(aws ssm get-parameter --name "$SSM_PATH" --with-decryption --query "Parameter.Value" --output text 2>/dev/null); then
        ACQUIRED_VALUE="$SSM_VALUE"
        SOURCE="ssm"
        echo "   ✅ Found in AWS SSM: $SSM_PATH"
      else
        echo "   ⚠️  Not found in SSM: $SSM_PATH"
      fi
    fi
    
    # Source 3: 1Password CLI
    if [ -z "$ACQUIRED_VALUE" ] && command -v op >/dev/null 2>&1; then
      echo "   🔍 Checking 1Password..."
      
      # Attempt to get from 1Password (requires logged in session)
      if OP_VALUE=$(op item get "$var_name" --fields password 2>/dev/null); then
        ACQUIRED_VALUE="$OP_VALUE"
        SOURCE="1password"
        echo "   ✅ Found in 1Password"
      else
        echo "   ⚠️  Not found in 1Password (or not logged in)"
      fi
    fi
    
    # Source 4: HashiCorp Vault (if configured)
    if [ -z "$ACQUIRED_VALUE" ] && command -v vault >/dev/null 2>&1 && [ -n "$VAULT_ADDR" ]; then
      echo "   🔍 Checking HashiCorp Vault..."
      VAULT_PATH="secret/agentic-flow/${var_name,,}"
      
      if VAULT_VALUE=$(vault kv get -field=value "$VAULT_PATH" 2>/dev/null); then
        ACQUIRED_VALUE="$VAULT_VALUE"
        SOURCE="vault"
        echo "   ✅ Found in Vault: $VAULT_PATH"
      else
        echo "   ⚠️  Not found in Vault: $VAULT_PATH"
      fi
    fi
    
    # If acquired, update .env file and database
    if [ -n "$ACQUIRED_VALUE" ]; then
      echo "   💾 Updating $env_file..."
      
      # Update .env file (replace placeholder with actual value)
      sed -i.bak "s|^${var_name}={{${placeholder}}}|${var_name}=${ACQUIRED_VALUE}|" "$env_file"
      
      # Update credential_requests table
      sqlite3 "$AGENTDB_PATH" <<EOF
UPDATE credential_requests 
SET 
  actual_value = '$ACQUIRED_VALUE',
  source = '$SOURCE',
  status = 'acquired',
  acquired_at = strftime('%s', 'now')
WHERE credential_key = '$var_name';
EOF
      
      echo "   ✅ Credential acquired from $SOURCE"
      ((CREDENTIALS_ACQUIRED++)) || true
    else
      echo "   ❌ Could not acquire credential automatically"
      echo "   💡 Manual acquisition required - use: ay env"
      
      # Update status to failed
      sqlite3 "$AGENTDB_PATH" "UPDATE credential_requests SET status='failed' WHERE credential_key='$var_name';"
      ((CREDENTIALS_FAILED++)) || true
    fi
    
    echo ""
  done < "$PLACEHOLDER_FILE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Seeker Summary:"
echo "   Placeholders found: $PLACEHOLDERS_FOUND"
echo "   Credentials acquired: $CREDENTIALS_ACQUIRED"
echo "   Failed acquisitions: $CREDENTIALS_FAILED"
echo ""

if [ "$CREDENTIALS_FAILED" -gt 0 ]; then
  echo "⚠️  Some credentials require manual acquisition"
  echo "   Run: ay env (interactive editor)"
  echo ""
fi

# Calculate duration
END_TIME=$(($(date +%s) * 1000))
DURATION=$((END_TIME - START_TIME))

# Record ceremony audit with MPP protocol metadata
sqlite3 "$AGENTDB_PATH" <<EOF
INSERT INTO ceremony_audit (
  ceremony_name,
  input_params,
  output_results,
  duration_ms,
  status,
  executed_at
) VALUES (
  'seeker/replenish',
  json_object(
    'protocol', 'mpp/1.0',
    'placeholders_found', $PLACEHOLDERS_FOUND,
    'scope_mode', 'expandable'
  ),
  json_object(
    'credentials_acquired', $CREDENTIALS_ACQUIRED,
    'credentials_failed', $CREDENTIALS_FAILED,
    'sources', json_array('env', 'ssm', '1password', 'vault'),
    'exit_code', CASE 
      WHEN $CREDENTIALS_FAILED = 0 THEN 0
      WHEN $CREDENTIALS_ACQUIRED > 0 THEN 2
      ELSE 3
    END
  ),
  $DURATION,
  CASE WHEN $CREDENTIALS_FAILED = 0 THEN 'success' ELSE 'partial' END,
  strftime('%s', 'now')
);
EOF

# Build metrics JSON
METRICS='{"total": '"$PLACEHOLDERS_FOUND"', "acquired": '"$CREDENTIALS_ACQUIRED"', "failed": '"$CREDENTIALS_FAILED"', "duration_ms": '"$DURATION"'}'

# Exit with semantic code based on results using MPP finalize
if [ "$CREDENTIALS_FAILED" -eq 0 ]; then
  echo "✅ All credentials acquired successfully"
  mpp_finalize $EXIT_COMPLETE_SUCCESS "all_acquired" "$METRICS" "All $CREDENTIALS_ACQUIRED credentials acquired"
elif [ "$CREDENTIALS_ACQUIRED" -gt 0 ]; then
  echo "⚠️  Partial success: $CREDENTIALS_ACQUIRED acquired, $CREDENTIALS_FAILED failed"
  mpp_finalize $EXIT_PARTIAL_SUCCESS "partial_acquisition" "$METRICS" "$CREDENTIALS_ACQUIRED acquired, $CREDENTIALS_FAILED failed"
else
  echo "❌ No credentials acquired - manual intervention required"
  mpp_finalize $EXIT_PARTIAL_FAILURE "acquisition_failed" "$METRICS" "All $CREDENTIALS_FAILED acquisition attempts failed"
fi
