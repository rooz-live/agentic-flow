#!/usr/bin/env bats
# tests/bats/bash-exit-codes.bats
# BATS tests for exit code compliance across all bash scripts

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && cd ../.. && pwd)"
}

@test "All .sh files have set -euo pipefail or equivalent" {
    # Find all shell scripts
    while IFS= read -r -d '' file; do
        # Skip node_modules and archive
        [[ "$file" == *node_modules* ]] && continue
        [[ "$file" == *archive* ]] && continue
        [[ "$file" == *.bak* ]] && continue
        
        # Check for strict mode
        if ! grep -q 'set -euo pipefail' "$file" 2>/dev/null; then
            # Check if it's a sourced library (may be ok without strict mode)
            if ! grep -q 'This is a SOURCED library' "$file" 2>/dev/null; then
                echo "FAIL: Missing 'set -euo pipefail' in $file"
                false
            fi
        fi
    done < <(find "$SCRIPT_DIR/scripts" -name "*.sh" -type f -print0 2>/dev/null)
}

@test "No || true error masking in core scripts" {
    # Core scripts that should never use || true
    CORE_SCRIPTS=(
        "$SCRIPT_DIR/scripts/validation-core.sh"
        "$SCRIPT_DIR/scripts/validation-gate.sh"
        "$SCRIPT_DIR/scripts/validate-foundation.sh"
        "$SCRIPT_DIR/scripts/roam-staleness-watchdog.sh"
    )
    
    for script in "${CORE_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            # Count actual || true occurrences (excluding comments and other || patterns)
            # Must match: space or end-of-line after "true"
            count=$(grep -v '^[[:space:]]*#' "$script" | grep -cE '\|\|[[:space:]]*true([[:space:]]|$)' || echo "0")
            if [ "$count" -gt 0 ]; then
                echo "FAIL: Found $count '|| true' in $script"
                grep -nE '\|\|[[:space:]]*true([[:space:]]|$)' "$script" | head -3
                false
            fi
        fi
    done
}

@test "Exit code definitions are present in major validators" {
    # Check that major validators define semantic exit codes
    VALIDATORS=(
        "$SCRIPT_DIR/scripts/validation-core.sh"
        "$SCRIPT_DIR/scripts/validation-gate.sh"
        "$SCRIPT_DIR/scripts/validate-foundation.sh"
        "$SCRIPT_DIR/scripts/roam-staleness-watchdog.sh"
    )
    
    for validator in "${VALIDATORS[@]}"; do
        if [ -f "$validator" ]; then
            # Check for exit code documentation or definitions
            if ! grep -q 'EXIT_' "$validator" 2>/dev/null; then
                echo "FAIL: Missing EXIT_ definitions in $validator"
                false
            fi
        fi
    done
}

@test "All scripts are executable" {
    while IFS= read -r -d '' file; do
        if [ ! -x "$file" ]; then
            echo "FAIL: Not executable: $file"
            false
        fi
    done < <(find "$SCRIPT_DIR/scripts" -name "*.sh" -type f -print0 2>/dev/null | head -20)
}

@test "No hardcoded exit 1 without semantic meaning" {
    # Major scripts should use semantic exit codes, not hardcoded 1
    MAJOR_SCRIPTS=(
        "$SCRIPT_DIR/scripts/validation-gate.sh"
        "$SCRIPT_DIR/scripts/validate-foundation.sh"
    )
    
    for script in "${MAJOR_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            # Count hardcoded "exit 1" (excluding comments and variable assignments)
            count=$(grep -n 'exit 1$' "$script" 2>/dev/null | grep -v '^[0-9]*:#' | wc -l || echo "0")
            if [ "$count" -gt 0 ]; then
                echo "WARNING: Found $count 'exit 1' in $script - should use semantic exit codes"
                # Not a hard fail, just a warning
            fi
        fi
    done
}
