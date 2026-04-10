#!/usr/bin/env bash
# scripts/infra/run-health.sh — Unified passive health check runner
#
# Runs ALL read-only health/audit playbooks in a fixed dependency order
# and emits a single structured summary. No production state is mutated.
#
# Usage:
#   ./scripts/infra/run-health.sh               # all targets
#   ./scripts/infra/run-health.sh cpanel         # cPanel/WHM only
#   ./scripts/infra/run-health.sh stx            # STX/OpenStack only
#   ./scripts/infra/run-health.sh hostbill        # HostBill only
#   ./scripts/infra/run-health.sh local           # macOS local only
#   ./scripts/infra/run-health.sh --json          # all targets, JSON summary to stdout
#
# Prerequisites:
#   source scripts/infra/credentials/.env.cpanel
#   ansible-playbook is in PATH (pip install ansible or brew install ansible)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/ansible"
PLAYBOOKS_DIR="$ANSIBLE_DIR/playbooks"
INVENTORY="$ANSIBLE_DIR/inventory/hosts.yml"
CREDS_FILE="$SCRIPT_DIR/credentials/.env.cpanel"
TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
JSON_MODE=false
TARGET="${1:-all}"

# ── Help / usage ──────────────────────────────────────────────────────────────
if [[ "$TARGET" == "--help" || "$TARGET" == "-h" || "$TARGET" == "help" ]]; then
    cat <<'EOF'
Usage: run-health.sh [target] [--json]

Targets (all run passive/read-only checks only):
  all        Run every health check (default)
  cpanel     cPanel/WHM health (services, SSL, ports)
  stx        STX node + OpenStack status
  hostbill   HostBill sync status (dry-run)
  local      macOS services + dev-env checks
  --json     Run all targets, emit JSON summary to stdout

Prerequisites:
  source scripts/infra/credentials/.env.cpanel   # load credentials
  pip install ansible                             # or brew install ansible

Examples:
  ./scripts/infra/run-health.sh
  ./scripts/infra/run-health.sh cpanel
  ./scripts/infra/run-health.sh --json | jq .
EOF
    exit 0
fi

[[ "${TARGET}" == "--json" ]] && { JSON_MODE=true; TARGET="all"; }

# ── Preflight ─────────────────────────────────────────────────────────────────

if ! command -v ansible-playbook &>/dev/null; then
    echo "❌  ansible-playbook not found. Install: pip install ansible" >&2
    exit 1
fi

if [[ -f "$CREDS_FILE" ]]; then
    set -a; source "$CREDS_FILE"; set +a
    echo "✓  Credentials loaded from $CREDS_FILE"
else
    echo "⚠️  $CREDS_FILE not found — some checks may fail due to missing API tokens."
    echo "   Run: ./scripts/infra/cpanel/cpanel-env-setup.sh --persist"
fi

_run_playbook() {
    local name="$1"
    local playbook="$2"
    shift 2
    echo ""
    echo "── $name ──────────────────────────────────────────────────────────────"
    if [[ ! -f "$playbook" ]]; then
        echo "⚠️  Skipped: playbook not found ($playbook)"
        return 0
    fi
    ansible-playbook -i "$INVENTORY" "$playbook" "$@" 2>&1 \
        || echo "  ⚠️  $name completed with warnings (see above)"
}

# ── Target dispatch ───────────────────────────────────────────────────────────

declare -A RESULTS
start_ts=$(date +%s)

case "$TARGET" in
    all|cpanel)
        _run_playbook "cPanel/WHM Health" "$PLAYBOOKS_DIR/cpanel-health.yml"
        RESULTS[cpanel]=$?
        ;;&
    all|stx)
        _run_playbook "STX Health"        "$PLAYBOOKS_DIR/stx-health.yml"
        _run_playbook "OpenStack Status"  "$PLAYBOOKS_DIR/openstack-status.yml"
        RESULTS[stx]=$?
        ;;&
    all|hostbill)
        _run_playbook "HostBill Sync Check (dry-run)" "$PLAYBOOKS_DIR/hostbill-sync.yml" \
            --extra-vars "dry_run=true"
        RESULTS[hostbill]=$?
        ;;&
    all|local)
        _run_playbook "macOS Services"   "$PLAYBOOKS_DIR/macos-services.yml"
        _run_playbook "macOS Dev Env"    "$PLAYBOOKS_DIR/macos-dev-env.yml"
        RESULTS[local]=$?
        ;;&
esac

end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "  Health Run Summary  —  $TIMESTAMP  (${elapsed}s)"
echo "══════════════════════════════════════════════════════════════════════"

if $JSON_MODE; then
    python3 -c "
import json, sys
results = $(printf '%s' "${RESULTS[*]:-}" | python3 -c "import sys; d={}; [d.update({k:v}) for k,v in (l.split() for l in sys.stdin) if l]; print(d)" 2>/dev/null || echo '{}')
print(json.dumps({'timestamp':'$TIMESTAMP','elapsed_seconds':$elapsed,'targets':results}, indent=2))
"
fi
echo ""
echo "  Run a targeted check:  ./scripts/infra/run-health.sh cpanel|stx|hostbill|local"
echo "  Active operations:     ansible-playbook ... (see scripts/infra/ansible/playbooks/)"
echo "══════════════════════════════════════════════════════════════════════"
