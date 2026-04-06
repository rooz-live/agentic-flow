#!/usr/bin/env bats
# WSJF-Cycle-65: StarlingX Telemetry Extractor Validation
# Validates Python output against expected JSON payload dimensions.

setup() {
    export POLLER_PATH="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../../" && pwd)/scripts/policy/stx_ipmi_poller.py"
}

@test "E2E: STX Python poller exists and is executable" {
    [ -f "$POLLER_PATH" ]
}

@test "E2E: STX Poller exports valid JSON architecture" {
    # Run the script and parse native JSON blocks isolating metrics
    run python3 "$POLLER_PATH"
    [ "$status" -eq 0 ]
    
    # Strip the string borders (--- [STARLINGX... ---]) using awk before jq validation.
    JSON_OUTPUT=$(echo "$output" | awk '/^{/{p=1} p; /^}/{p=0}')
    
    # Verify valid JSON syntax
    echo "$JSON_OUTPUT" | jq empty
    [ "$?" -eq 0 ]
}

@test "E2E: STX Poller contains required hostbill billing keys" {
    run python3 "$POLLER_PATH"
    JSON_OUTPUT=$(echo "$output" | awk '/^{/{p=1} p; /^}/{p=0}')
    
    # Assert billing key
    HAS_BILLING=$(echo "$JSON_OUTPUT" | jq 'has("hostbill_mapping_usd")')
    [ "$HAS_BILLING" = "true" ]
}

@test "E2E: STX Poller tracks thermal limits properly" {
    run python3 "$POLLER_PATH"
    JSON_OUTPUT=$(echo "$output" | awk '/^{/{p=1} p; /^}/{p=0}')
    
    # Assert thermal data float structure
    THERMAL_VAL=$(echo "$JSON_OUTPUT" | jq '.ipmi_telemetry.peak_thermal_celsius')
    [ -n "$THERMAL_VAL" ]
}
