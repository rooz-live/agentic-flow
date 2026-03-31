#!/usr/bin/env bats
# tests/bats/validation-gate.bats
# BATS unit tests for validation-gate.sh

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && cd ../.. && pwd)"
    GATE_SCRIPT="$SCRIPT_DIR/scripts/validation-gate.sh"
}

@test "validation-gate.sh exists and is executable" {
    [ -f "$GATE_SCRIPT" ]
    [ -x "$GATE_SCRIPT" ]
}

@test "validation-gate.sh --help returns exit 0" {
    run bash "$GATE_SCRIPT" --help
    [ "$status" -eq 0 ]
}

@test "validation-gate.sh has correct exit code definitions" {
    grep -q 'EXIT_PASS=0' "$GATE_SCRIPT"
    grep -q 'EXIT_BLOCKER=1' "$GATE_SCRIPT"
    grep -q 'EXIT_WARNING=2' "$GATE_SCRIPT"
    grep -q 'EXIT_DEPS_MISSING=3' "$GATE_SCRIPT"
}

@test "validation-gate.sh contains set -euo pipefail" {
    grep -q 'set -euo pipefail' "$GATE_SCRIPT"
}

@test "validation-gate.sh does not use || true" {
    # Should not find any || true patterns
    ! grep -q '\|\| true' "$GATE_SCRIPT"
}

@test "WSJF calculation formula is present" {
    grep -q 'WSJF' "$GATE_SCRIPT"
    grep -q 'BV.*TC.*RR.*JS' "$GATE_SCRIPT"
}

@test "All required gates are defined" {
    grep -q 'gate_ddd' "$GATE_SCRIPT"
    grep -q 'gate_adr' "$GATE_SCRIPT"
    grep -q 'gate_tdd' "$GATE_SCRIPT"
    grep -q 'gate_prd' "$GATE_SCRIPT"
    grep -q 'gate_validation' "$GATE_SCRIPT"
    grep -q 'gate_dpc' "$GATE_SCRIPT"
}
