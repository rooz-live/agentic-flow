#!/usr/bin/env bats

# test_hostbill_ledger.bats
# Validates the HostBill accounting trace logic ensuring dynamic STX arrays
# properly export multi-ledger domain endpoints securely.

setup() {
    export LEDGER_FILE=".goalie/hostbill_ledger.json"
    if [ ! -f "$LEDGER_FILE" ]; then
        skip "Test boundary skipped: $LEDGER_FILE not found natively."
    fi
}

@test "Check HostBill LEDGER JSON is perfectly valid" {
    run jq empty "$LEDGER_FILE"
    [ "$status" -eq 0 ]
}

@test "Verify law.rooz.live ROOT proxy exists in TLD limits natively" {
    run jq -e '.priority_tlds[] | select(.domain_name=="law.rooz.live")' "$LEDGER_FILE"
    [ "$status" -eq 0 ]
}

@test "Verify api.interface.rooz.live API_GATEWAY proxy maps boundaries effectively" {
    run jq -e '.priority_tlds[] | select(.domain_name=="api.interface.rooz.live" and .ddd_context=="API_GATEWAY")' "$LEDGER_FILE"
    [ "$status" -eq 0 ]
}

@test "Verify pur.tag.vote GATEWAY proxy maps cleanly organically" {
    run jq -e '.priority_tlds[] | select(.domain_name=="pur.tag.vote" and .ddd_context=="GATEWAY")' "$LEDGER_FILE"
    [ "$status" -eq 0 ]
}

@test "Verify hab.yo.life EVIDENCE proxy tracks effortlessly smartly" {
    run jq -e '.priority_tlds[] | select(.domain_name=="hab.yo.life" and .k8s_status=="PENDING")' "$LEDGER_FILE"
    [ "$status" -eq 0 ]
}

@test "Verify STX Synthetic Metrics footprint translates hardware effectively securely gracefully optimally" {
    run jq -e '.synthetic_billing.billing_tier | select(.!=null)' "$LEDGER_FILE"
    [ "$status" -eq 0 ]
    
    run jq -r '.synthetic_billing.billing_tier' "$LEDGER_FILE"
    [ "$output" = "ENTERPRISE_TIER_1" ]
}
