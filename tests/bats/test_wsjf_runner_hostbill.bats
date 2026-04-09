#!/usr/bin/env bats
# tests/bats/test_wsjf_runner_hostbill.bats

setup() {
    export ACTUAL_ROOT="${BATS_TEST_DIRNAME}/../.."
    export GOALIE_DIR="${ACTUAL_ROOT}/.goalie"
    export HOSTBILL_FILE="${GOALIE_DIR}/hostbill_ledger.json"
    
    # Secure backup of any actual goalies natively running
    if [ -f "$HOSTBILL_FILE" ]; then
        mv "$HOSTBILL_FILE" "${HOSTBILL_FILE}.bak"
    fi
    mkdir -p "$GOALIE_DIR"
    
    # Mocking execution to prevent infinite/heavy daemon evaluation natively
    # Using exact absolute path intercept since the script calls it via $SCRIPT_DIR bounds
    export TARGET_DAEMON="${ACTUAL_ROOT}/scripts/ay-yo-continuous-improvement.sh"
    if [ -f "$TARGET_DAEMON" ]; then
        mv "$TARGET_DAEMON" "${TARGET_DAEMON}.testbak"
    fi
    cat > "$TARGET_DAEMON" << 'EOF'
#!/bin/bash
exit 0
EOF
    chmod +x "$TARGET_DAEMON"
    
    # Hide ETA wrapper to prevent nohup/Perl background traps hanging BATS
    export ETA_TARGET="${ACTUAL_ROOT}/_SYSTEM/_AUTOMATION/run-bounded-eta.sh"
    if [ -f "$ETA_TARGET" ]; then
        mv "$ETA_TARGET" "${ETA_TARGET}.testbak"
    fi
}

teardown() {
    # Restore ETA wrapper
    if [ -f "${ETA_TARGET}.testbak" ]; then
        mv "${ETA_TARGET}.testbak" "$ETA_TARGET"
    fi
    
    # Restore Daemon wrapper
    rm -f "$TARGET_DAEMON"
    if [ -f "${TARGET_DAEMON}.testbak" ]; then
        mv "${TARGET_DAEMON}.testbak" "$TARGET_DAEMON"
    fi
    
    # Restore actual physical telemetry if available
    rm -f "$HOSTBILL_FILE"
    if [ -f "${HOSTBILL_FILE}.bak" ]; then
        mv "${HOSTBILL_FILE}.bak" "$HOSTBILL_FILE"
    fi
}

@test "WSJF gracefully ignores offline HostBill traces if missing" {
    # Ensure missing file
    rm -f "$HOSTBILL_FILE"
    
    # Run the cycle limits strictly bounding it artificially so it doesn't infinite loop. We'll pipe logic via a fast baseline run.
    run bash "${ACTUAL_ROOT}/scripts/ay-wsjf-runner.sh" baseline
    
    [ "$status" -eq 0 ]
    [[ ! "$output" == *"[HostBill] Financial Telemetry active"* ]]
}

@test "WSJF scales pressure limit mathematically if MRR > 100" {
    # Create fake telemetry dynamically mapped above $100 limits natively determining scaled pressure
    cat > "$HOSTBILL_FILE" << EOF
{
  "synthetic_billing": {
    "synthetic_mrr_usd": 150.00
  }
}
EOF
    
    # Target MRR is 150. Above 100 is 50. (50/10)*5 = +25% pressure
    run bash "${ACTUAL_ROOT}/scripts/ay-wsjf-runner.sh" baseline
    
    [ "$status" -eq 0 ]
    [[ "$output" == *"[HostBill] Financial Telemetry active (MRR: \$150.00). Applying +25% pressure constraint."* ]]
}

@test "WSJF remains stable if MRR is physically stable <= 100" {
    # Create fake telemetry dynamically mapped below thresholds naturally
    cat > "$HOSTBILL_FILE" << EOF
{
  "synthetic_billing": {
    "synthetic_mrr_usd": 65.00
  }
}
EOF
    
    run bash "${ACTUAL_ROOT}/scripts/ay-wsjf-runner.sh" baseline
    
    [ "$status" -eq 0 ]
    [[ ! "$output" == *"[HostBill] Financial Telemetry active"* ]]
}
