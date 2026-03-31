#!/usr/bin/env bash
# Mock utilities for test isolation

MOCK_DIR="${MOCK_DIR:-/tmp/ay-test-mocks}"
MOCK_CALLS_LOG="$MOCK_DIR/calls.log"

# Initialize mock environment
init_mocks() {
  rm -rf "$MOCK_DIR"
  mkdir -p "$MOCK_DIR"
  touch "$MOCK_CALLS_LOG"
}

# Clean up mocks
cleanup_mocks() {
  rm -rf "$MOCK_DIR"
}

# Mock a script/command
mock_script() {
  local script_name="$1"
  local return_code="${2:-0}"
  local output="${3:-}"
  
  local mock_path="$MOCK_DIR/$(basename "$script_name")"
  
  cat > "$mock_path" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$MOCK_CALLS_LOG"
echo "$output"
exit $return_code
EOF
  
  chmod +x "$mock_path"
  export PATH="$MOCK_DIR:$PATH"
  
  echo "Mocked: $script_name -> $mock_path"
}

# Check if a script was called
assert_script_called() {
  local script_name="$1"
  local expected_arg="${2:-}"
  
  if [[ -z "$expected_arg" ]]; then
    # Just check if script was called
    if grep -q "$(basename "$script_name")" "$MOCK_CALLS_LOG" 2>/dev/null; then
      return 0
    else
      echo "Script not called: $script_name"
      return 1
    fi
  else
    # Check if script was called with specific arg
    if grep -q "$expected_arg" "$MOCK_CALLS_LOG" 2>/dev/null; then
      return 0
    else
      echo "Script not called with arg: $expected_arg"
      return 1
    fi
  fi
}

# Get number of times script was called
get_call_count() {
  local script_name="$1"
  grep -c "$(basename "$script_name")" "$MOCK_CALLS_LOG" 2>/dev/null || echo "0"
}

# Mock environment variable
mock_env() {
  local var_name="$1"
  local var_value="$2"
  export "$var_name"="$var_value"
}

# Restore environment variable
restore_env() {
  local var_name="$1"
  unset "$var_name"
}

# Mock database (SQLite)
mock_database() {
  local db_path="$1"
  local schema_sql="${2:-}"
  
  # Create empty database
  mkdir -p "$(dirname "$db_path")"
  sqlite3 "$db_path" "SELECT 1;" >/dev/null 2>&1
  
  # Apply schema if provided
  if [[ -n "$schema_sql" ]]; then
    sqlite3 "$db_path" < "$schema_sql"
  fi
  
  echo "Mocked database: $db_path"
}

# Mock file with content
mock_file() {
  local file_path="$1"
  local content="$2"
  
  mkdir -p "$(dirname "$file_path")"
  echo "$content" > "$file_path"
  
  echo "Mocked file: $file_path"
}

# Mock JSON file
mock_json() {
  local file_path="$1"
  local json_content="$2"
  
  mkdir -p "$(dirname "$file_path")"
  echo "$json_content" > "$file_path"
  
  # Validate JSON if jq available
  if command -v jq >/dev/null 2>&1; then
    if ! jq empty "$file_path" 2>/dev/null; then
      echo "Warning: Mocked JSON is invalid: $file_path"
    fi
  fi
  
  echo "Mocked JSON: $file_path"
}

# Mock ceremony execution (for ay-prod-cycle tests)
mock_ceremony() {
  local circle="$1"
  local ceremony="$2"
  local success="${3:-true}"
  
  local episode_file="$MOCK_DIR/episode_${circle}_${ceremony}.json"
  
  if [[ "$success" == "true" ]]; then
    cat > "$episode_file" <<EOF
{
  "circle": "$circle",
  "ceremony": "$ceremony",
  "status": "success",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
  else
    cat > "$episode_file" <<EOF
{
  "circle": "$circle",
  "ceremony": "$ceremony",
  "status": "failure",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
  fi
  
  echo "$episode_file"
}

# Setup test environment with common mocks
setup_test_env() {
  init_mocks
  
  # Mock common directories
  mkdir -p "$MOCK_DIR/.goalie"
  mkdir -p "$MOCK_DIR/.db"
  mkdir -p "$MOCK_DIR/config"
  
  # Mock DoR budget config
  cat > "$MOCK_DIR/config/dor-budgets.json" <<'EOF'
{
  "orchestrator": { "dor_minutes": 5, "ceremony": "standup" },
  "assessor": { "dor_minutes": 15, "ceremony": "wsjf" },
  "analyst": { "dor_minutes": 30, "ceremony": "refine" },
  "innovator": { "dor_minutes": 10, "ceremony": "retro" },
  "seeker": { "dor_minutes": 20, "ceremony": "replenish" },
  "intuitive": { "dor_minutes": 25, "ceremony": "synthesis" }
}
EOF
  
  echo "Test environment ready: $MOCK_DIR"
}

# Teardown test environment
teardown_test_env() {
  cleanup_mocks
}
