#!/usr/bin/env bats
# tests/bats/test_tld_universal_bridge.bats
# TDD Red/Green BATS Suite verifying Universal UI integrations + Offline Bypasses
# @business-context WSJF-Cycle-46

setup() {
    export OFFLINE_MODE="true"
    export DASHBOARD_DOMAIN="api.interface.rooz.live"
    export DASHBOARD_PORT="5050"
    export TLD_SCRIPT="./_SYSTEM/_AUTOMATION/tld-server-config.sh"
    chmod +x "$TLD_SCRIPT"
}

@test "Generates inference domain mapping dynamically" {
    run bash "$TLD_SCRIPT" url inference 5050
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "api.interface.rooz.live:5050"
}

@test "Gracefully drops DNS constraints when OFFLINE_MODE=true" {
    # It should pass without executing the dig precondition!
    run bash "$TLD_SCRIPT" check
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "Offline Isolation Active"
}
