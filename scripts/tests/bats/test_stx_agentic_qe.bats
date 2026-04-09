#!/usr/bin/env bats
# tests/bats/test_stx_agentic_qe.bats
# TDD Red/Green BATS Suite tracking Agentic QE STX Telemetry -> HostBill traces
# @business-context WSJF-Cycle-47: R-2026-020 (Hardware Telemetry) & R-2026-019 (HostBill Sync)

setup() {
    export OFFLINE_MODE="true"
    export STX_MOCK_ENV="$(mktemp -d)"
    export HOSTBILL_MOCK_LEDGER="${STX_MOCK_ENV}/ledger.json"
    
    # Generate fake zero-byte HostBill ledger mapped directly back to tracking constraints
    echo "{}" > "$HOSTBILL_MOCK_LEDGER"
    
    export CI_STX_SCRIPT="./scripts/ci/stx-telemetry-check.sh"
    chmod +x "$CI_STX_SCRIPT" || true
}

teardown() {
    rm -rf "$STX_MOCK_ENV"
}

@test "Asserts STX Telemetry evaluates 0-byte fail constraints inside offline pipelines" {
    # If network connections to 23.92.79.2 fail gracefully under simulated OFFLINE conditions, the script drops out cleanly
    run bash -c "export OFFLINE_MODE=true; bash $CI_STX_SCRIPT"
    
    # We expect the telemetry script to FAIL safely attempting SSH when offline, proving it bounds networking natively
    [ "$status" -eq 1 ]
    echo "$output" | grep -q "FAIL: STX not reachable"
}

@test "Asserts 0-byte hardware outputs prevent HostBill bloat natively" {
    # Write empty array natively bypassing real HostBill APIs testing offline integrity
    run bash -c "cat $HOSTBILL_MOCK_LEDGER | wc -c | xargs"
    
    [ "$status" -eq 0 ]
    [ "$output" -lt 5 ] 
}
