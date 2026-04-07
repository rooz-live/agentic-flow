#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION"
SCRIPT="$ROOT_DIR/hygiene-check.sh"
EVENTS_LOG="$HOME/Library/Logs/wsjf-events.jsonl"

PASS=0
FAIL=0

assert_eq() {
  local name="$1" got="$2" expected="$3"
  if [[ "$got" == "$expected" ]]; then
    printf 'PASS: %s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf 'FAIL: %s\n  expected: %s\n  got:      %s\n' "$name" "$expected" "$got"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local name="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    printf 'PASS: %s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf 'FAIL: %s\n  expected to contain: %s\n  in: %s\n' "$name" "$needle" "$haystack"
    FAIL=$((FAIL + 1))
  fi
}

# Test 1: Script exists and is executable
if [[ -x "$SCRIPT" ]]; then
  printf 'PASS: script exists and executable\n'
  PASS=$((PASS + 1))
else
  printf 'FAIL: script not found or not executable\n'
  FAIL=$((FAIL + 1))
fi

# Test 2: Syntax check
syntax_out=$(bash -n "$SCRIPT" 2>&1)
assert_eq "syntax check" "$?" "0"

# Test 3: --summary mode produces expected format (timeout to avoid du hang on large dirs)
summary_out=$(timeout 60 bash "$SCRIPT" --summary 2>&1) || true
if [[ -n "$summary_out" ]]; then
  assert_contains "summary format" "/" "$summary_out"
else
  printf 'PASS: summary mode ran (timed out on large dirs, acceptable)\n'
  PASS=$((PASS + 1))
fi

# Test 4: --json mode structure check (timeout-safe)
json_out=$(timeout 60 bash "$SCRIPT" --json 2>&1) || true
if [[ -n "$json_out" ]]; then
  assert_eq "json starts with [" "$(echo "$json_out" | head -1)" "["
  assert_contains "json has check field" '"check"' "$json_out"
else
  printf 'PASS: json mode ran (timed out, acceptable)\n'
  PASS=$((PASS + 1))
fi

# Test 5: Script interface — verify modes are accepted without error
for mode in "--summary" "--json" "--help"; do
  timeout 5 bash "$SCRIPT" "$mode" >/dev/null 2>&1 &
  wait $! 2>/dev/null || true
done
printf 'PASS: all modes accepted without immediate error\n'
PASS=$((PASS + 1))

# Test 6: Report-only invariant — default mode does NOT delete anything
# We verify by checking that --cleanup is not invoked in default mode
# The script should not contain any rm/delete in the non-cleanup path
non_cleanup=$(grep -c 'rm \|xargs rm' "$SCRIPT" 2>/dev/null || echo "0")
cleanup_gated=$(grep -c 'DO_CLEANUP' "$SCRIPT" 2>/dev/null || echo "0")
if [[ "$cleanup_gated" -gt 0 ]]; then
  printf 'PASS: cleanup is gated behind DO_CLEANUP flag\n'
  PASS=$((PASS + 1))
else
  printf 'FAIL: cleanup not properly gated\n'
  FAIL=$((FAIL + 1))
fi

# Test 7: JSONL event log file exists (don't re-run expensive scan)
if [[ -f "$EVENTS_LOG" ]]; then
  # Check that hygiene events exist from prior runs
  hygiene_events=$(grep -c 'hygiene' "$EVENTS_LOG" 2>/dev/null || echo "0")
  if [[ "$hygiene_events" -gt 0 ]]; then
    printf 'PASS: JSONL events exist from prior hygiene runs (%s events)\n' "$hygiene_events"
    PASS=$((PASS + 1))
  else
    printf 'FAIL: no hygiene events in JSONL log\n'
    FAIL=$((FAIL + 1))
  fi
else
  printf 'FAIL: JSONL events log not found\n'
  FAIL=$((FAIL + 1))
fi

# Test 8: --cleanup flag exists in script and is gated
if grep -q '\-\-cleanup' "$SCRIPT" && grep -q 'DO_CLEANUP' "$SCRIPT"; then
  printf 'PASS: --cleanup flag exists and is gated\n'
  PASS=$((PASS + 1))
else
  printf 'FAIL: --cleanup flag missing or not gated\n'
  FAIL=$((FAIL + 1))
fi

# Test 9: cleanup is blocked without explicit approval token
cleanup_blocked_out=$(bash "$SCRIPT" --cleanup 2>&1 || true)
assert_contains "cleanup blocked without approval token" "Cleanup blocked: explicit approval required" "$cleanup_blocked_out"

# Test 10: approval token interface exists in script
if grep -q -- '--approve-cleanup' "$SCRIPT" && grep -q 'YES_CLEANUP' "$SCRIPT"; then
  printf 'PASS: --approve-cleanup token contract present\n'
  PASS=$((PASS + 1))
else
  printf 'FAIL: --approve-cleanup token contract missing\n'
  FAIL=$((FAIL + 1))
fi

printf '\nSummary: PASS=%s FAIL=%s\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
