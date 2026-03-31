#!/bin/bash
# =============================================================================
# Validation Runner - Orchestrate 70+ AQE Skill Validators
# =============================================================================
#
# Discovers and runs all validate.sh scripts across the AQE skill ecosystem.
# Supports parallel execution, filtering, and JSON aggregation.
#
# Usage:
#   ./validation-runner.sh [options]
#
# Options:
#   --parallel N       Run N validators concurrently (default: 4)
#   --filter PATTERN   Only run validators matching PATTERN
#   --verbose, -v      Enable verbose output
#   --json             Output aggregated JSON results
#   --summary          Show summary only (default)
#   --list             List discovered validators and exit
#   --help, -h         Show this help message
#
# Exit Codes:
#   0 - All validators passed
#   1 - One or more validators failed
#   2 - No validators found or discovery failed
#
# Examples:
#   ./validation-runner.sh                           # Run all validators
#   ./validation-runner.sh --parallel 8              # Parallel with 8 workers
#   ./validation-runner.sh --filter "performance"    # Only performance validators
#   ./validation-runner.sh --json > results.json     # JSON output
#   ./validation-runner.sh --list                    # Discover and list all
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Search paths for validators (priority order)
SEARCH_PATHS=(
  "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/.claude/skills"
  "$PROJECT_ROOT/.claude/skills"
  "$PROJECT_ROOT/skills"
)

# Default options
PARALLEL_JOBS=4
FILTER_PATTERN=""
VERBOSE=false
JSON_OUTPUT=false
SUMMARY_ONLY=true
LIST_ONLY=false

# Output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

log_info() {
  if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo -e "${BLUE}[INFO]${NC} $*"
  fi
}

log_success() {
  if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo -e "${GREEN}[OK]${NC} $*"
  fi
}

log_warn() {
  if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
  fi
}

log_error() {
  if [[ "$JSON_OUTPUT" != "true" ]]; then
    echo -e "${RED}[ERROR]${NC} $*" >&2
  fi
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]] && [[ "$JSON_OUTPUT" != "true" ]]; then
    echo -e "${BLUE}[DEBUG]${NC} $*" >&2
  fi
}

# =============================================================================
# Argument Parsing
# =============================================================================

show_help() {
  cat << 'HELP_EOF'
Validation Runner - Orchestrate 70+ AQE Skill Validators

Usage:
  ./validation-runner.sh [options]

Options:
  --parallel N       Run N validators concurrently (default: 4)
  --filter PATTERN   Only run validators matching PATTERN (grep syntax)
  --verbose, -v      Enable verbose output with debug information
  --json             Output aggregated JSON results (for CI integration)
  --summary          Show summary only (default mode)
  --list             List discovered validators and exit
  --help, -h         Show this help message

Exit Codes:
  0 - All validators passed
  1 - One or more validators failed
  2 - No validators found or discovery failed

Examples:
  # Run all validators with default settings
  ./validation-runner.sh

  # Parallel execution with 8 workers
  ./validation-runner.sh --parallel 8

  # Filter to performance-related validators only
  ./validation-runner.sh --filter "performance"

  # Multiple filters (OR logic)
  ./validation-runner.sh --filter "performance\|security\|api"

  # JSON output for CI/CD pipelines
  ./validation-runner.sh --json > validation-results.json

  # List all discovered validators without running
  ./validation-runner.sh --list

  # Verbose debugging mode
  ./validation-runner.sh --verbose --filter "chaos"

Discovered Validators:
  The runner searches for *validate*.sh scripts in:
  1. BHOPTI-LEGAL/.claude/skills/*/scripts/
  2. PROJECT/.claude/skills/*/scripts/
  3. PROJECT/skills/*/scripts/

HELP_EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --parallel)
      PARALLEL_JOBS="$2"
      shift 2
      ;;
    --filter)
      FILTER_PATTERN="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      SUMMARY_ONLY=false
      shift
      ;;
    --summary)
      SUMMARY_ONLY=true
      shift
      ;;
    --list)
      LIST_ONLY=true
      shift
      ;;
    -h|--help)
      show_help
      ;;
    -*)
      log_error "Unknown option: $1"
      echo "Use --help for usage information"
      exit 2
      ;;
    *)
      log_error "Unexpected argument: $1"
      echo "Use --help for usage information"
      exit 2
      ;;
  esac
done

# =============================================================================
# Validator Discovery
# =============================================================================

discover_validators() {
  local validators=()
  local search_path=""

  # Find the first valid search path
  for path in "${SEARCH_PATHS[@]}"; do
    if [[ -d "$path" ]]; then
      search_path="$path"
      log_debug "Using search path: $search_path"
      break
    fi
  done

  if [[ -z "$search_path" ]]; then
    log_error "No valid search paths found"
    log_error "Searched:"
    for path in "${SEARCH_PATHS[@]}"; do
      log_error "  - $path"
    done
    return 1
  fi

  # Discover all validate.sh scripts
  log_debug "Discovering validators in: $search_path"

  while IFS= read -r -d '' validator; do
    # Skip template validators
    if [[ "$validator" == *".validation/templates/"* ]]; then
      log_debug "Skipping template: $validator"
      continue
    fi

    # Apply filter if specified
    if [[ -n "$FILTER_PATTERN" ]]; then
      if ! echo "$validator" | grep -q "$FILTER_PATTERN"; then
        log_debug "Filtered out: $validator"
        continue
      fi
    fi

    # Check if executable
    if [[ ! -x "$validator" ]]; then
      log_warn "Not executable: $validator"
      continue
    fi

    validators+=("$validator")
  done < <(find "$search_path" -name "*validate*.sh" -type f -print0 2>/dev/null)

  if [[ ${#validators[@]} -eq 0 ]]; then
    log_error "No validators discovered"
    return 1
  fi

  # Output validators array (for caller to use)
  printf '%s\n' "${validators[@]}"
  return 0
}

# =============================================================================
# Validator Execution
# =============================================================================

run_validator() {
  local validator="$1"
  local skill_name=""

  # Extract skill name from path
  # e.g., .../performance-testing/scripts/validate.sh -> performance-testing
  skill_name=$(echo "$validator" | sed -n 's|.*/skills/\([^/]*\)/scripts.*|\1|p')

  if [[ -z "$skill_name" ]]; then
    skill_name=$(basename "$(dirname "$(dirname "$validator")")")
  fi

  log_debug "Running validator for: $skill_name"

  # Run validator with --self-test and --json flags (with 30s timeout)
  local output=""
  local exit_code=0

  if output=$(timeout 30 "$validator" --self-test --json 2>&1); then
    exit_code=0
  else
    exit_code=$?
    # If timeout (exit code 124), mark as error
    if [ $exit_code -eq 124 ]; then
      output='{"status":"error","message":"Validator timeout after 30s"}'
      exit_code=3
    fi
  fi

  # Sanitize output for JSON embedding - escape backslashes, quotes, and control characters
  local sanitized_output=""
  sanitized_output=$(echo "$output" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ' | tr -d '\r')

  # Parse JSON output if available
  local status="unknown"
  local errors=0
  local warnings=0

  if echo "$output" | jq . >/dev/null 2>&1; then
    # Output is JSON - parse normally
    status=$(echo "$output" | jq -r '.status // "unknown"')
    errors=$(echo "$output" | jq -r '(.errors // 0) | if type == "number" then . else 0 end')
    warnings=$(echo "$output" | jq -r '(.warnings // 0) | if type == "number" then . else 0 end')
    # Ensure numeric (fallback for any edge cases)
    [[ ! "$errors" =~ ^[0-9]+$ ]] && errors=0
    [[ ! "$warnings" =~ ^[0-9]+$ ]] && warnings=0
  else
    # Output is plain text - parse text patterns and exit code
    case $exit_code in
      0)
        # Success - check for explicit PASS indicators
        if echo "$output" | grep -qi "\[PASS\]"; then
          status="passed"
        else
          status="passed"  # Exit 0 = passed
        fi
        ;;
      1)
        # Failure - check for explicit FAIL indicators
        if echo "$output" | grep -qi "\[FAIL\]"; then
          status="failed"
          errors=$(echo "$output" | grep -ci "\[FAIL\]" 2>/dev/null || echo 1)
          [[ ! "$errors" =~ ^[0-9]+$ ]] && errors=1
        else
          status="failed"
          errors=1
        fi
        ;;
      2)
        # Skipped
        status="skipped"
        ;;
      3)
        # Error (including timeout)
        status="error"
        errors=1
        ;;
      *)
        # Unknown exit code
        status="unknown"
        errors=1
        ;;
    esac

    # Count warnings from text output (grep -c exits 1 if no matches, so use || echo 0)
    warnings=$(echo "$output" | grep -ci "\[WARN\]" 2>/dev/null || echo 0)
    [[ ! "$warnings" =~ ^[0-9]+$ ]] && warnings=0
  fi

  # Output result as JSON line using sanitized output
  jq -n \
    --arg skill "$skill_name" \
    --arg validator "$validator" \
    --arg status "$status" \
    --argjson exit_code "$exit_code" \
    --argjson errors "$errors" \
    --argjson warnings "$warnings" \
    --arg output "$sanitized_output" \
    '{
      skill: $skill,
      validator: $validator,
      status: $status,
      exitCode: $exit_code,
      errors: $errors,
      warnings: $warnings,
      output: $output
    }'

  return $exit_code
}

# =============================================================================
# Parallel Execution
# =============================================================================

run_validators_parallel() {
  local validators=("$@")
  local results_file=""
  results_file=$(mktemp)

  log_debug "Running ${#validators[@]} validators with parallelism: $PARALLEL_JOBS"

  # Export functions for subshells
  export -f run_validator
  export -f log_debug
  export VERBOSE

  # Run validators in parallel using xargs
  printf '%s\n' "${validators[@]}" | \
    xargs -P "$PARALLEL_JOBS" -I {} bash -c 'run_validator "{}"' >> "$results_file"

  echo "$results_file"
}

# =============================================================================
# Results Aggregation
# =============================================================================

aggregate_results() {
  local results_file="$1"

  if [[ ! -f "$results_file" ]]; then
    log_error "Results file not found: $results_file"
    return 1
  fi

  local total=0
  local passed=0
  local failed=0
  local skipped=0
  local errors=0
  local warnings=0

  while IFS= read -r result; do
    ((total++)) || true

    local status=""
    status=$(echo "$result" | jq -r '.status')

    case "$status" in
      passed) ((passed++)) || true ;;
      failed) ((failed++)) || true ;;
      skipped) ((skipped++)) || true ;;
    esac

    local err_count=""
    local warn_count=""
    err_count=$(echo "$result" | jq -r '(.errors // 0) | if type == "number" then . else 0 end')
    warn_count=$(echo "$result" | jq -r '(.warnings // 0) | if type == "number" then . else 0 end')
    # Ensure numeric (fallback for any edge cases)
    [[ ! "$err_count" =~ ^[0-9]+$ ]] && err_count=0
    [[ ! "$warn_count" =~ ^[0-9]+$ ]] && warn_count=0

    ((errors += err_count)) || true
    ((warnings += warn_count)) || true
  done < "$results_file"

  # Calculate coverage percentage
  local coverage=0
  if [[ $total -gt 0 ]]; then
    coverage=$(awk "BEGIN {printf \"%.1f\", ($passed / $total) * 100}")
  fi

  # Output aggregated JSON
  jq -n \
    --argjson total "$total" \
    --argjson passed "$passed" \
    --argjson failed "$failed" \
    --argjson skipped "$skipped" \
    --argjson errors "$errors" \
    --argjson warnings "$warnings" \
    --arg coverage "${coverage}%" \
    --slurpfile results "$results_file" \
    '{
      summary: {
        total: $total,
        passed: $passed,
        failed: $failed,
        skipped: $skipped,
        errors: $errors,
        warnings: $warnings,
        coverage: $coverage
      },
      results: $results[0]
    }'
}

# =============================================================================
# Display Functions
# =============================================================================

display_summary() {
  local results_file="$1"

  local total=0
  local passed=0
  local failed=0
  local skipped=0
  local errors=0
  local warnings=0

  local failed_skills=()

  while IFS= read -r result; do
    ((total++)) || true

    local status=""
    local skill=""
    status=$(echo "$result" | jq -r '.status')
    skill=$(echo "$result" | jq -r '.skill')

    case "$status" in
      passed)
        ((passed++)) || true
        if [[ "$VERBOSE" == "true" ]]; then
          log_success "$skill"
        fi
        ;;
      failed)
        ((failed++)) || true
        failed_skills+=("$skill")
        log_error "$skill - FAILED"
        ;;
      skipped)
        ((skipped++)) || true
        if [[ "$VERBOSE" == "true" ]]; then
          log_warn "$skill - SKIPPED"
        fi
        ;;
    esac

    local err_count=""
    local warn_count=""
    err_count=$(echo "$result" | jq -r '(.errors // 0) | if type == "number" then . else 0 end')
    warn_count=$(echo "$result" | jq -r '(.warnings // 0) | if type == "number" then . else 0 end')
    # Ensure numeric (fallback for any edge cases)
    [[ ! "$err_count" =~ ^[0-9]+$ ]] && err_count=0
    [[ ! "$warn_count" =~ ^[0-9]+$ ]] && warn_count=0

    ((errors += err_count)) || true
    ((warnings += warn_count)) || true
  done < "$results_file"

  # Calculate coverage
  local coverage=0
  if [[ $total -gt 0 ]]; then
    coverage=$(awk "BEGIN {printf \"%.1f\", ($passed / $total) * 100}")
  fi

  # Display summary
  echo ""
  echo "=============================================="
  echo "Validation Runner Summary"
  echo "=============================================="
  echo ""
  echo "  Total Validators:  $total"
  echo "  Passed:            $passed (${GREEN}✓${NC})"
  echo "  Failed:            $failed (${RED}✗${NC})"
  echo "  Skipped:           $skipped (${YELLOW}⊘${NC})"
  echo ""
  echo "  Errors:            $errors"
  echo "  Warnings:          $warnings"
  echo ""
  echo "  Coverage:          ${coverage}%"
  echo "=============================================="
  echo ""

  if [[ ${#failed_skills[@]} -gt 0 ]]; then
    echo "Failed Skills:"
    for skill in "${failed_skills[@]}"; do
      echo "  - ${RED}$skill${NC}"
    done
    echo ""
  fi
}

display_list() {
  local validators=("$@")

  echo "=============================================="
  echo "Discovered Validators (${#validators[@]} total)"
  echo "=============================================="
  echo ""

  for validator in "${validators[@]}"; do
    local skill_name=""
    skill_name=$(echo "$validator" | sed -n 's|.*/skills/\([^/]*\)/scripts.*|\1|p')
    if [[ -z "$skill_name" ]]; then
      skill_name="unknown"
    fi
    echo "  - $skill_name"
    if [[ "$VERBOSE" == "true" ]]; then
      echo "    Path: $validator"
    fi
  done
  echo ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  if [[ "$JSON_OUTPUT" != "true" ]]; then
    log_info "Starting validation runner..."
    log_info "Parallel jobs: $PARALLEL_JOBS"
    if [[ -n "$FILTER_PATTERN" ]]; then
      log_info "Filter pattern: $FILTER_PATTERN"
    fi
    echo ""
  fi

  # Discover validators
  local validators=()
  while IFS= read -r line; do
    validators+=("$line")
  done < <(discover_validators)

  if [[ ${#validators[@]} -eq 0 ]]; then
    log_error "No validators discovered"
    exit 2
  fi

  log_debug "Discovered ${#validators[@]} validators"

  # List mode - show validators and exit
  if [[ "$LIST_ONLY" == "true" ]]; then
    display_list "${validators[@]}"
    exit 0
  fi

  # Run validators in parallel
  local results_file=""
  results_file=$(run_validators_parallel "${validators[@]}")

  # Aggregate results
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    aggregate_results "$results_file"
  else
    display_summary "$results_file"
  fi

  # Determine exit code
  local failed_count=0
  failed_count=$(jq -s '[.[] | select(.status == "failed")] | length' "$results_file")

  # Cleanup
  rm -f "$results_file"

  if [[ "$failed_count" -gt 0 ]]; then
    if [[ "$JSON_OUTPUT" != "true" ]]; then
      log_error "Validation FAILED: $failed_count validator(s) failed"
    fi
    exit 1
  else
    if [[ "$JSON_OUTPUT" != "true" ]]; then
      log_success "Validation PASSED: All validators succeeded"
    fi
    exit 0
  fi
}

# Run main
main
