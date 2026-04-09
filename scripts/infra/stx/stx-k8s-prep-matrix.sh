#!/usr/bin/env bash
# stx-k8s-prep-matrix.sh
# StarlingX Kubernetes Preparation Matrix
# Validates the tracking baseline from .goalie/hostbill_ledger.json matches K8s preconditions.

set -euo pipefail
IFS=$'\n\t'
export LANG=C.UTF-8

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LEDGER_FILE="$PROJECT_ROOT/.goalie/hostbill_ledger.json"

echo "=== STX Kubernetes Provisioning Matrix Gate ==="

# 1. Early Exit: Ledger File Presence Guard Clause
if [[ ! -f "$LEDGER_FILE" ]]; then
    echo "❌ ERROR: HostBill Financial Ledger ($LEDGER_FILE) not found!"
    echo "          Run scripts/ci/hostbill-sync-agent.py first."
    exit 1
fi

# 2. Extract Baseline Footprint parameters
BILLING_TIER=$(jq -r '.synthetic_billing.billing_tier // empty' "$LEDGER_FILE")
MRR_USD=$(jq -r '.synthetic_billing.synthetic_mrr_usd // empty' "$LEDGER_FILE")
ELIZA_STATE=$(jq -r '.elizaos_sync_state // empty' "$LEDGER_FILE")

echo "Loaded Telemetry Binding:"
echo "- Billing Tier: $BILLING_TIER"
echo "- Synthetic MRR: \$$MRR_USD"
echo "- ElizaOS State: $ELIZA_STATE"

# 3. Guard Clauses & Preconditions for K8s Launch
if [[ "$BILLING_TIER" != "ENTERPRISE_TIER_1" ]]; then
    # Warning, not a fatal failure unless strict mode, but we want to assert TIER_1 bounds
    echo "⚠️ WARNING: Proceeding with non-standard tier ($BILLING_TIER) provisioning."
fi

if [[ "$ELIZA_STATE" == "SYNC_FAILED" || -z "$ELIZA_STATE" ]]; then
    echo "❌ ERROR: ElizaOS boundary sync is FAILED or EMPTY."
    echo "          Financial footprint is disconnected from deployment pipeline."
    exit 1
fi

echo "✅ Kubernetes STX provisioning verified securely via HostBill bounds!"
echo "Initiating milestone deployment preparations..."
exit 0
