#!/usr/bin/env bash
# TDD tests for scripts/monitoring/storage_cleanup.sh
#
# Behaviours under test:
#
#  Threshold logic
#   T1  Usage below threshold → action_taken=none, exit 0
#   T2  Usage equal to threshold → action_taken=tmutil_thin (triggers cleanup), exit 0
#   T3  Usage above threshold → action_taken=tmutil_thin, exit 0
#   T4  STORAGE_CLEANUP_THRESHOLD env var overrides default (set to 90, usage=88 → no action)
#   T5  STORAGE_CLEANUP_THRESHOLD env var overrides default (set to 80, usage=88 → action)
#
#  JSONL log format
#   L1  Log file created at expected path after run
#   L2  JSONL record contains all required fields (timestamp, threshold, usage_percent, action_taken, exit_code)
#   L3  JSONL record is valid JSON
#   L4  Multiple runs append multiple records (one per run)
#   L5  bytes_reclaimed field present in log when tmutil outputs byte count
#
#  Mock tmutil (no real tmutil calls in tests)
#   M1  Mock tmutil exit 0 → script exits 0, action_taken=tmutil_thin
#   M2  Mock tmutil exit 1 → script exits 1, action_taken=error
#   M3  STORAGE_CLEANUP_DRY_RUN=1 → action_taken=dry-run, tmutil NOT called, exit 0
#
#  Edge cases
#   E1  Invalid STORAGE_CLEANUP_THRESHOLD (non-integer) → exit 1, action_taken=error logged
#   E2  STORAGE_CLEANUP_LOG_DIR env var redirects log to custom path
#   E3  Idempotency: two runs below threshold produce two log entries, both action_taken=none
#   E4  bytes_reclaimed field present only when tmutil outputs reclaimed bytes

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

CLEANUP_SCRIPT="$ROOT_DIR/scripts/monitoring/storage_cleanup.sh"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

# ─── Helpers ────────────────────────────────────────────────────────────────

# Create a mock `df` that returns a fixed usage percentage.
# Usage: make_mock_df <tmpdir> <percent>
make_mock_df() {
  local dir="$1"
  local pct="$2"
  cat > "$dir/df" <<EOF
#!/usr/bin/env bash
# Mock df — always reports ${pct}% usage on /
echo "Filesystem      Size   Used  Avail Capacity  iused ifree %iused  Mounted on"
echo "/dev/disk1s1   500G   450G    50G    ${pct}%  100000 200000    0%   /"
EOF
  chmod +x "$dir/df"
}

# Create a mock `tmutil` that exits with the given code and optionally prints
# a "Reclaimed X bytes" line.
# Usage: make_mock_tmutil <tmpdir> <exit_code> [bytes_reclaimed]
make_mock_tmutil() {
  local dir="$1"
  local exit_code="$2"
  local bytes="${3:-}"
  cat > "$dir/tmutil" <<EOF
#!/usr/bin/env bash
# Mock tmutil — exits $exit_code
if [[ -n "${bytes}" ]]; then
  echo "Reclaimed ${bytes} bytes of local snapshot storage"
fi
exit $exit_code
EOF
  chmod +x "$dir/tmutil"
  # Write call record so tests can verify invocation
  touch "$dir/tmutil_called"
  # Overwrite the script to also record invocations
  cat > "$dir/tmutil" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$dir/tmutil_calls.log"
if [[ "${bytes}" != "" ]]; then
  echo "Reclaimed ${bytes} bytes of local snapshot storage"
fi
exit $exit_code
EOF
  chmod +x "$dir/tmutil"
}

# Run storage_cleanup.sh with a mocked df + tmutil and custom log dir.
# Sets PATH so mock binaries take precedence.
# Usage: run_cleanup <tmpdir> <extra_env_vars...>
#   Sets: _last_exit (exit code), _last_log (path to jsonl log file)
run_cleanup() {
  local dir="$1"
  shift
  local log_dir="$dir/log"
  _last_log="$log_dir/storage_cleanup.jsonl"

  set +e
  env PATH="$dir:$PATH" \
    STORAGE_CLEANUP_LOG_DIR="$log_dir" \
    TMUTIL_BIN="$dir/tmutil" \
    "$@" \
    bash "$CLEANUP_SCRIPT" > "$dir/stdout.txt" 2>&1
  _last_exit=$?
  set -e
}

# Get the last JSONL record from the log file
last_log_record() {
  tail -1 "$_last_log" 2>/dev/null || echo ""
}

# ─── Tests ──────────────────────────────────────────────────────────────────

# T1: Usage below threshold → action_taken=none, exit 0
test_t1_below_threshold() {
  echo ""
  echo "T1: Usage below threshold → action_taken=none, exit 0"
  local dir="$TMPROOT/t1"
  mkdir -p "$dir"
  make_mock_df "$dir" 70
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_equals 0 "$_last_exit" "T1: exit code is 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"none"' "T1: action_taken=none"
  assert_contains "$record" '"usage_percent":70' "T1: usage_percent logged"
  assert_contains "$record" '"exit_code":0' "T1: exit_code=0 in log"
  # tmutil should NOT have been called
  if [[ -f "$dir/tmutil_calls.log" ]] && [[ -s "$dir/tmutil_calls.log" ]]; then
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m T1: tmutil should NOT have been called"
  else
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m T1: tmutil not called"
  fi
}

# T2: Usage equal to threshold → triggers cleanup
test_t2_equal_threshold() {
  echo ""
  echo "T2: Usage equal to threshold → action_taken=tmutil_thin, exit 0"
  local dir="$TMPROOT/t2"
  mkdir -p "$dir"
  make_mock_df "$dir" 85
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_equals 0 "$_last_exit" "T2: exit code is 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"tmutil_thin"' "T2: action_taken=tmutil_thin"
  assert_contains "$record" '"usage_percent":85' "T2: usage_percent=85 logged"
}

# T3: Usage above threshold → triggers cleanup
test_t3_above_threshold() {
  echo ""
  echo "T3: Usage above threshold → action_taken=tmutil_thin, exit 0"
  local dir="$TMPROOT/t3"
  mkdir -p "$dir"
  make_mock_df "$dir" 92
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_equals 0 "$_last_exit" "T3: exit code is 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"tmutil_thin"' "T3: action_taken=tmutil_thin"
  assert_contains "$record" '"usage_percent":92' "T3: usage_percent=92 logged"
  assert_contains "$record" '"threshold":85' "T3: threshold=85 logged"
}

# T4: Custom threshold (90) — usage 88% → no action
test_t4_custom_threshold_no_action() {
  echo ""
  echo "T4: Custom threshold=90, usage=88 → no action"
  local dir="$TMPROOT/t4"
  mkdir -p "$dir"
  make_mock_df "$dir" 88
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=90

  assert_equals 0 "$_last_exit" "T4: exit code is 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"none"' "T4: action_taken=none"
  assert_contains "$record" '"threshold":90' "T4: threshold=90 in log"
}

# T5: Custom threshold (80) — usage 88% → action
test_t5_custom_threshold_action() {
  echo ""
  echo "T5: Custom threshold=80, usage=88 → action taken"
  local dir="$TMPROOT/t5"
  mkdir -p "$dir"
  make_mock_df "$dir" 88
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=80

  assert_equals 0 "$_last_exit" "T5: exit code is 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"tmutil_thin"' "T5: action_taken=tmutil_thin"
  assert_contains "$record" '"threshold":80' "T5: threshold=80 in log"
}

# L1: Log file created at expected path
test_l1_log_file_created() {
  echo ""
  echo "L1: Log file is created after run"
  local dir="$TMPROOT/l1"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_file_exists "$_last_log" "L1: JSONL log file created"
}

# L2: JSONL record contains all required fields
test_l2_required_fields() {
  echo ""
  echo "L2: JSONL record has all required fields"
  local dir="$TMPROOT/l2"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local record
  record="$(last_log_record)"
  assert_contains "$record" '"timestamp":'       "L2: timestamp field present"
  assert_contains "$record" '"threshold":'       "L2: threshold field present"
  assert_contains "$record" '"usage_percent":'   "L2: usage_percent field present"
  assert_contains "$record" '"action_taken":'    "L2: action_taken field present"
  assert_contains "$record" '"exit_code":'       "L2: exit_code field present"
}

# L3: JSONL record is valid JSON
test_l3_valid_json() {
  echo ""
  echo "L3: JSONL record is valid JSON"
  local dir="$TMPROOT/l3"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local record
  record="$(last_log_record)"
  TESTS_RUN=$((TESTS_RUN + 1))
  if echo "$record" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m L3: JSONL record is valid JSON"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m L3: JSONL record is not valid JSON: $record"
  fi
}

# L4: Multiple runs append multiple records
test_l4_multiple_runs_append() {
  echo ""
  echo "L4: Multiple runs append multiple log records"
  local dir="$TMPROOT/l4"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85
  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85
  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local line_count
  line_count=$(wc -l < "$_last_log" | tr -d ' ')
  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ "$line_count" -eq 3 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m L4: 3 log records for 3 runs (got $line_count)"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m L4: Expected 3 log records, got $line_count"
  fi
}

# L5: bytes_reclaimed field present when tmutil outputs byte count
test_l5_bytes_reclaimed_field() {
  echo ""
  echo "L5: bytes_reclaimed field present when tmutil reports reclaimed bytes"
  local dir="$TMPROOT/l5"
  mkdir -p "$dir"
  make_mock_df "$dir" 92
  make_mock_tmutil "$dir" 0 "12345678"

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local record
  record="$(last_log_record)"
  assert_contains "$record" '"bytes_reclaimed":' "L5: bytes_reclaimed field present"
  assert_contains "$record" '12345678' "L5: bytes_reclaimed value correct"
}

# M1: Mock tmutil exit 0 → script exits 0, action_taken=tmutil_thin
test_m1_tmutil_success() {
  echo ""
  echo "M1: tmutil exit 0 → script exits 0, action_taken=tmutil_thin"
  local dir="$TMPROOT/m1"
  mkdir -p "$dir"
  make_mock_df "$dir" 90
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_equals 0 "$_last_exit" "M1: exit code 0"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"tmutil_thin"' "M1: action_taken=tmutil_thin"
  assert_contains "$record" '"exit_code":0' "M1: exit_code=0 in log"
}

# M2: Mock tmutil exit 1 → script exits 1, action_taken=error
test_m2_tmutil_failure() {
  echo ""
  echo "M2: tmutil exit 1 → script exits 1, action_taken=error"
  local dir="$TMPROOT/m2"
  mkdir -p "$dir"
  make_mock_df "$dir" 90
  make_mock_tmutil "$dir" 1

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  assert_equals 1 "$_last_exit" "M2: exit code 1 on tmutil failure"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"error"' "M2: action_taken=error"
  assert_contains "$record" '"exit_code":1' "M2: exit_code=1 in log"
}

# M3: STORAGE_CLEANUP_DRY_RUN=1 → action_taken=dry-run, tmutil NOT called, exit 0
test_m3_dry_run() {
  echo ""
  echo "M3: STORAGE_CLEANUP_DRY_RUN=1 → action_taken=dry-run, tmutil not called"
  local dir="$TMPROOT/m3"
  mkdir -p "$dir"
  make_mock_df "$dir" 95
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85 STORAGE_CLEANUP_DRY_RUN=1

  assert_equals 0 "$_last_exit" "M3: exit code 0 in dry-run"
  local record
  record="$(last_log_record)"
  assert_contains "$record" '"action_taken":"dry-run"' "M3: action_taken=dry-run"
  # tmutil should NOT have been invoked (no calls log, or empty calls log)
  if [[ -f "$dir/tmutil_calls.log" ]] && [[ -s "$dir/tmutil_calls.log" ]]; then
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m M3: tmutil was called in dry-run mode (should not be)"
  else
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m M3: tmutil not called in dry-run mode"
  fi
}

# E1: Invalid threshold → exit 1, error logged
test_e1_invalid_threshold() {
  echo ""
  echo "E1: Invalid STORAGE_CLEANUP_THRESHOLD (non-integer) → exit 1"
  local dir="$TMPROOT/e1"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD="notanumber"

  assert_equals 1 "$_last_exit" "E1: exit code 1 for invalid threshold"
}

# E2: STORAGE_CLEANUP_LOG_DIR env var redirects log
test_e2_custom_log_dir() {
  echo ""
  echo "E2: STORAGE_CLEANUP_LOG_DIR redirects log to custom path"
  local dir="$TMPROOT/e2"
  local custom_log_dir="$TMPROOT/e2-custom-logs"
  mkdir -p "$dir"
  make_mock_df "$dir" 50
  make_mock_tmutil "$dir" 0

  env PATH="$dir:$PATH" \
    STORAGE_CLEANUP_LOG_DIR="$custom_log_dir" \
    TMUTIL_BIN="$dir/tmutil" \
    STORAGE_CLEANUP_THRESHOLD=85 \
    bash "$CLEANUP_SCRIPT" > "$dir/stdout.txt" 2>&1 || true

  assert_file_exists "$custom_log_dir/storage_cleanup.jsonl" "E2: log created at custom path"
}

# E3: Idempotency — two runs below threshold → two action_taken=none records
test_e3_idempotent_below_threshold() {
  echo ""
  echo "E3: Idempotency — two below-threshold runs produce two action_taken=none records"
  local dir="$TMPROOT/e3"
  mkdir -p "$dir"
  make_mock_df "$dir" 40
  make_mock_tmutil "$dir" 0

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85
  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local none_count
  none_count=$(grep -c '"action_taken":"none"' "$_last_log" 2>/dev/null || echo 0)
  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ "$none_count" -eq 2 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m E3: 2 action_taken=none records for 2 no-op runs"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m E3: Expected 2 none records, got $none_count"
  fi
}

# E4: bytes_reclaimed field absent when tmutil produces no byte count
test_e4_no_bytes_reclaimed_when_absent() {
  echo ""
  echo "E4: bytes_reclaimed field absent when tmutil does not report bytes"
  local dir="$TMPROOT/e4"
  mkdir -p "$dir"
  make_mock_df "$dir" 90
  # tmutil exits 0 but emits no "Reclaimed X bytes" line
  make_mock_tmutil "$dir" 0 ""

  run_cleanup "$dir" STORAGE_CLEANUP_THRESHOLD=85

  local record
  record="$(last_log_record)"
  # bytes_reclaimed should NOT be present (or should not have a value)
  TESTS_RUN=$((TESTS_RUN + 1))
  # The field should be absent entirely (no ",\"bytes_reclaimed\":" in record)
  if echo "$record" | grep -q '"bytes_reclaimed":'; then
    # If present, value must be empty string or truly empty — anything non-empty is a fail
    local br_value
    br_value="$(echo "$record" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_reclaimed','ABSENT'))" 2>/dev/null || echo "PARSE_ERROR")"
    if [[ "$br_value" == "" ]] || [[ "$br_value" == "ABSENT" ]]; then
      TESTS_PASSED=$((TESTS_PASSED + 1))
      echo -e "\033[32m✓\033[0m E4: bytes_reclaimed absent or empty when tmutil reports nothing"
    else
      TESTS_FAILED=$((TESTS_FAILED + 1))
      echo -e "\033[31m✗\033[0m E4: bytes_reclaimed=$br_value (expected absent/empty)"
    fi
  else
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m E4: bytes_reclaimed field absent when tmutil reports nothing"
  fi
}

# ─── Run all tests ───────────────────────────────────────────────────────────
echo "================================================="
echo "  storage_cleanup.sh — TDD gate tests"
echo "================================================="

test_t1_below_threshold
test_t2_equal_threshold
test_t3_above_threshold
test_t4_custom_threshold_no_action
test_t5_custom_threshold_action
test_l1_log_file_created
test_l2_required_fields
test_l3_valid_json
test_l4_multiple_runs_append
test_l5_bytes_reclaimed_field
test_m1_tmutil_success
test_m2_tmutil_failure
test_m3_dry_run
test_e1_invalid_threshold
test_e2_custom_log_dir
test_e3_idempotent_below_threshold
test_e4_no_bytes_reclaimed_when_absent

print_test_summary
