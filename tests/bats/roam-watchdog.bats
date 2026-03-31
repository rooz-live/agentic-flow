#!/usr/bin/env bats
# tests/bats/roam-watchdog.bats
# BATS unit tests for roam-staleness-watchdog.sh

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && cd ../.. && pwd)"
    WATCHDOG_SCRIPT="$SCRIPT_DIR/scripts/roam-staleness-watchdog.sh"
}

@test "roam-staleness-watchdog.sh exists and is executable" {
    [ -f "$WATCHDOG_SCRIPT" ]
    [ -x "$WATCHDOG_SCRIPT" ]
}

@test "roam-staleness-watchdog.sh --help returns exit 0" {
    run bash "$WATCHDOG_SCRIPT" --help
    [ "$status" -eq 0 ]
}

@test "roam-staleness-watchdog.sh has correct exit code definitions" {
    grep -q 'EXIT_SUCCESS=0' "$WATCHDOG_SCRIPT"
    grep -q 'EXIT_INVALID_ARGS=10' "$WATCHDOG_SCRIPT"
    grep -q 'EXIT_ROAM_NOT_FOUND=11' "$WATCHDOG_SCRIPT"
    grep -q 'EXIT_STALENESS_DETECTED=100' "$WATCHDOG_SCRIPT"
}

@test "roam-staleness-watchdog.sh contains set -euo pipefail" {
    grep -q 'set -euo pipefail' "$WATCHDOG_SCRIPT"
}

@test "roam-staleness-watchdog.sh does not use || true" {
    # Should not find any || true patterns (except possibly in comments)
    ! grep -v '^#' "$WATCHDOG_SCRIPT" | grep -q '\|\| true'
}

@test "roam-watchdog defines STALENESS_THRESHOLD" {
    grep -q 'STALENESS_THRESHOLD' "$WATCHDOG_SCRIPT"
    grep -q 'STALENESS_THRESHOLD=96' "$WATCHDOG_SCRIPT"
}

@test "roam-watchdog has daemon mode function" {
    grep -q 'daemon_mode()' "$WATCHDOG_SCRIPT"
}

@test "roam-watchdog has oneshot mode function" {
    grep -q 'oneshot_mode()' "$WATCHDOG_SCRIPT"
}

@test "roam-watchdog creates escalation JSON on staleness" {
    grep -q 'ESCALATION' "$WATCHDOG_SCRIPT"
    grep -q '\.json' "$WATCHDOG_SCRIPT"
}
